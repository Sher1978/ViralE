import { NextRequest, NextResponse } from 'next/server';
import { falService } from '@/lib/services/falService';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import axios from 'axios';

const execPromise = promisify(exec);

export const maxDuration = 300; // Extend to 5 mins for video processing

export async function POST(req: NextRequest) {
  const tmpDir = path.join('/tmp', `fusion-${uuidv4()}`);
  
  try {
    const { projectId, videoUrl, segments } = await req.json();
    if (!videoUrl || !segments) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    await fs.mkdir(tmpDir, { recursive: true });
    const originalVideoPath = path.join(tmpDir, 'original.mp4');
    
    // 1. Download Original Video
    console.log('[Fusion] Downloading original video...');
    const response = await axios({ url: videoUrl, method: 'GET', responseType: 'stream' });
    const writer = createWriteStream(originalVideoPath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 2. Process Segments in Parallel
    console.log('[Fusion] Processing segments...');
    const processedSegments = await Promise.all(segments.map(async (seg: any, idx: number) => {
      const segmentInputPath = path.join(tmpDir, `seg_${idx}_raw.mp4`);
      
      // Cut segment
      const duration = seg.endTime - seg.startTime;
      await execPromise(`ffmpeg -ss ${seg.startTime} -i ${originalVideoPath} -t ${duration} -c:v libx264 -preset ultrafast -crf 23 ${segmentInputPath}`);

      if (seg.avatarUrl) {
        // AI Path
        console.log(`[Fusion] Segment ${idx}: Animating with LivePortrait...`);
        const segmentBuffer = await fs.readFile(segmentInputPath);
        const uploadedUrl = await falService.uploadFile(segmentBuffer);
        const aiResult = await falService.animateAvatar(seg.avatarUrl, uploadedUrl);
        
        // Download AI Result
        const aiPath = path.join(tmpDir, `seg_${idx}_ai.mp4`);
        const aiRes = await axios({ url: aiResult.videoUrl, method: 'GET', responseType: 'stream' });
        const aiWriter = createWriteStream(aiPath);
        aiRes.data.pipe(aiWriter);
        await new Promise((res, rej) => { aiWriter.on('finish', res); aiWriter.on('error', rej); });
        
        return aiPath;
      }
      
      return segmentInputPath; // Original Path
    }));

    // 3. Final Stitching
    console.log('[Fusion] Final stitching...');
    const concatFilePath = path.join(tmpDir, 'concat.txt');
    const concatContent = processedSegments.map(p => `file '${p}'`).join('\n');
    await fs.writeFile(concatFilePath, concatContent);

    const outputPath = path.join(tmpDir, 'output.mp4');
    // Extract original audio and bind to the new video sequence
    const audioPath = path.join(tmpDir, 'audio.m4a');
    await execPromise(`ffmpeg -i ${originalVideoPath} -vn -acodec copy ${audioPath}`);
    
    // Concatenate videos and map the original audio back
    await execPromise(`ffmpeg -f concat -safe 0 -i ${concatFilePath} -i ${audioPath} -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 ${outputPath}`);

    // 4. Upload Result (Using a placeholder for now, you should upload to Vercel Blob/S3)
    const resultBuffer = await fs.readFile(outputPath);
    const finalUrl = await falService.uploadFile(resultBuffer);

    // Cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });

    return NextResponse.json({ 
      status: 'completed', 
      videoUrl: finalUrl,
      segmentsCount: segments.length 
    });

  } catch (error: any) {
    console.error('[Fusion] Critical Failure:', error);
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
