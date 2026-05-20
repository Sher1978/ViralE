import { NextRequest, NextResponse } from 'next/server';
import { falService } from '@/lib/services/falService';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import axios from 'axios';
import os from 'os';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { supabaseAdmin } from '@/lib/supabase';

const ffmpegPath = ffmpegInstaller.path;
const execPromise = promisify(exec);

export const maxDuration = 300; // Extend to 5 mins for video processing

export async function POST(req: NextRequest) {
  const tmpDir = path.join(os.tmpdir(), `fusion-${uuidv4()}`);
  
  try {
    if (!process.env.FAL_KEY) {
      throw new Error('Fal AI API key (FAL_KEY) is missing in your environment configuration. Please pull Vercel env or add it to .env.local.');
    }

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
      writer.on('finish', () => resolve(null));
      writer.on('error', reject);
    });

    // 2. Process Segments in Parallel
    console.log('[Fusion] Processing segments...');
    const processedSegments = await Promise.all(segments.map(async (seg: any, idx: number) => {
      const segmentInputPath = path.join(tmpDir, `seg_${idx}_raw.mp4`);
      
      // Cut and normalize segment to 720x1280, 25fps, yuv420p (strip audio with -an and use output seeking to guarantee valid keyframes)
      const duration = seg.endTime - seg.startTime;
      await execPromise(`"${ffmpegPath}" -i ${originalVideoPath} -ss ${seg.startTime} -t ${duration} -vf "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(720-iw)/2:(1280-ih)/2,setsar=1" -c:v libx264 -preset veryfast -crf 23 -r 25 -pix_fmt yuv420p -profile:v main -level:v 3.1 -an -movflags +faststart ${segmentInputPath}`);

      if (seg.avatarUrl) {
        // AI Path
        console.log(`[Fusion] Segment ${idx}: Animating with LivePortrait...`);
        const segmentBuffer = await fs.readFile(segmentInputPath);

        // Upload segment to Supabase storage (using user_recordings/ prefix to inherit public read SELECT policy)
        const drivingFileName = `user_recordings/driving_${uuidv4()}.mp4`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from('media')
          .upload(drivingFileName, segmentBuffer, {
            contentType: 'video/mp4',
            upsert: true
          });

        if (uploadError) {
          throw new Error(`Failed to upload driving segment to Supabase: ${uploadError.message}`);
        }

        const { data: { publicUrl: drivingPublicUrl } } = supabaseAdmin.storage
          .from('media')
          .getPublicUrl(drivingFileName);

        console.log(`[Fusion] Segment ${idx} driving video uploaded to Supabase: ${drivingPublicUrl}`);

        // Pre-upload avatar photo to Supabase storage if it's from HeyGen/external site for maximum speed/stability
        let finalAvatarUrl = seg.avatarUrl;
        if (seg.avatarUrl.startsWith('http') && !seg.avatarUrl.includes('supabase.co')) {
          try {
            console.log(`[Fusion] Pre-uploading avatar to Supabase: ${seg.avatarUrl}`);
            const avatarRes = await axios.get(seg.avatarUrl, { responseType: 'arraybuffer' });
            const avatarBuffer = Buffer.from(avatarRes.data);
            const avatarFileName = `user_recordings/avatar_${uuidv4()}.png`;
            
            const { error: avatarUploadError } = await supabaseAdmin.storage
              .from('media')
              .upload(avatarFileName, avatarBuffer, {
                contentType: 'image/png',
                upsert: true
              });

            if (!avatarUploadError) {
              const { data: { publicUrl: avatarPublicUrl } } = supabaseAdmin.storage
                .from('media')
                .getPublicUrl(avatarFileName);
              finalAvatarUrl = avatarPublicUrl;
              console.log(`[Fusion] Avatar pre-uploaded to Supabase successfully: ${finalAvatarUrl}`);
            }
          } catch (err: any) {
            console.warn(`[Fusion] Pre-upload of avatar to Supabase failed: ${err.message}`);
          }
        }

        const aiResult = await falService.animateAvatar(finalAvatarUrl, drivingPublicUrl);
        
        // Download AI Result to a temp file
        const tempAiPath = path.join(tmpDir, `seg_${idx}_ai_raw.mp4`);
        const aiRes = await axios({ url: aiResult.videoUrl, method: 'GET', responseType: 'stream' });
        const aiWriter = createWriteStream(tempAiPath);
        aiRes.data.pipe(aiWriter);
        await new Promise((res, rej) => { aiWriter.on('finish', () => res(null)); aiWriter.on('error', rej); });
        
        // Normalize the AI segment to match exactly 720x1280, 25fps, yuv420p
        const aiPath = path.join(tmpDir, `seg_${idx}_ai.mp4`);
        await execPromise(`"${ffmpegPath}" -i ${tempAiPath} -vf "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(720-iw)/2:(1280-ih)/2,setsar=1" -c:v libx264 -preset veryfast -crf 23 -r 25 -pix_fmt yuv420p -profile:v main -level:v 3.1 -an -movflags +faststart ${aiPath}`);
        
        return aiPath;
      }
      
      return segmentInputPath; // Original Path
    }));
    // 3. Final Stitching
    console.log('[Fusion] Final stitching...');
    
    // Verify that all segment files are fully written and accessible before proceeding
    for (const segmentPath of processedSegments) {
      try {
        await fs.access(segmentPath);
        const stats = await fs.stat(segmentPath);
        if (stats.size === 0) {
          throw new Error(`Segment file ${segmentPath} is empty`);
        }
      } catch (err: any) {
        throw new Error(`Pre-concat validation failed: Segment ${segmentPath} is not accessible. Details: ${err.message}`);
      }
    }

    const concatFilePath = path.join(tmpDir, 'concat.txt');
    // Ensure all file paths in concat.txt use standardized forward slashes to avoid escape character errors
    const concatContent = processedSegments.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    await fs.writeFile(concatFilePath, concatContent);

    const outputPath = path.join(tmpDir, 'output.mp4');
    // Extract original audio and bind to the new video sequence (re-encode to AAC for absolute compatibility)
    const audioPath = path.join(tmpDir, 'audio.m4a');
    await execPromise(`"${ffmpegPath}" -i ${originalVideoPath} -vn -c:a aac -b:a 128k ${audioPath}`);
    
    // Verify audio file is fully written and accessible before launching concat
    try {
      await fs.access(audioPath);
      const stats = await fs.stat(audioPath);
      if (stats.size === 0) {
        throw new Error(`Audio file ${audioPath} is empty`);
      }
    } catch (err: any) {
      throw new Error(`Pre-concat validation failed: Audio file ${audioPath} is not accessible. Details: ${err.message}`);
    }

    // Try fast copy-based concatenation, and gracefully fallback to re-encoding if streams differ
    try {
      console.log('[Fusion] Attempting fast stream copy concat...');
      await execPromise(`"${ffmpegPath}" -f concat -safe 0 -i ${concatFilePath} -i ${audioPath} -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 ${outputPath}`);
    } catch (copyError: any) {
      console.warn('[Fusion] Stream copy concat failed, falling back to full re-encoding concat...', copyError.message);
      // Fallback: Re-encode the video streams to ensure perfect alignment regardless of potential stream drifts
      await execPromise(`"${ffmpegPath}" -f concat -safe 0 -i ${concatFilePath} -i ${audioPath} -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -c:a aac -map 0:v:0 -map 1:a:0 ${outputPath}`);
    }

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
    const stderr = error.stderr ? `\nSTDERR: ${error.stderr}` : '';
    const stdout = error.stdout ? `\nSTDOUT: ${error.stdout}` : '';
    const detailedMessage = `${error.message}${stderr}${stdout}`;
    
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    return NextResponse.json({ error: detailedMessage }, { status: 500 });
  }
}
