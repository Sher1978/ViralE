import { NextRequest, NextResponse } from 'next/server';
import { falService } from '@/lib/services/falService';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import axios from 'axios';
import os from 'os';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { supabase } from '@/lib/supabase';

const ffmpegPath = ffmpegInstaller.path;

// High-reliability spawn wrapper for FFmpeg to allow real-time stderr output and prevent buffer overflows
function runFFmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // Clean up stderr by hiding massive build configuration banners
    const finalArgs = args.includes('-hide_banner') ? args : ['-hide_banner', ...args];
    console.log(`[FFmpeg] Running command: ffmpeg ${finalArgs.join(' ')}`);
    const proc = spawn(ffmpegPath, finalArgs);
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data: any) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data: any) => {
      const str = data.toString();
      stderr += str;
      // Real-time stderr reporting directly to the server logs for visibility
      const lines = str.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.log(`[FFmpeg Stderr] ${line.trim()}`);
        }
      }
    });
    
    proc.on('close', (code: number) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(`FFmpeg failed with exit code ${code}`);
        (err as any).stderr = stderr;
        (err as any).stdout = stdout;
        reject(err);
      }
    });
    
    proc.on('error', (err: any) => {
      reject(err);
    });
  });
}

function normalizeSupabaseUrl(url: string): string {
  if (!url) return url;
  const currentUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!currentUrl) return url;
  
  // 1. Replace old Supabase hosts with the current active one
  let normalized = url.replace(/https:\/\/[a-z0-9-]+\.supabase\.co/gi, currentUrl);
  
  // 2. If it's a signed URL from Supabase, convert it to a direct public URL to bypass token validation of a different project
  if (normalized.includes('/storage/v1/object/sign/')) {
    normalized = normalized.replace('/storage/v1/object/sign/', '/storage/v1/object/public/');
    try {
      const urlObj = new URL(normalized);
      urlObj.search = '';
      normalized = urlObj.toString();
    } catch (e) {
      console.warn('[Fusion] URL parsing failed during normalization for:', normalized);
    }
  }
  
  return normalized;
}

export const maxDuration = 300; // Extend to 5 mins for video processing

export async function POST(req: NextRequest) {
  const tmpDir = path.join(os.tmpdir(), `fusion-${uuidv4()}`);
  
  try {
    if (!process.env.FAL_KEY) {
      throw new Error('Fal AI API key (FAL_KEY) is missing in your environment configuration. Please pull Vercel env or add it to .env.local.');
    }

    const { projectId, videoUrl, segments } = await req.json();
    if (!videoUrl || !segments) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    if (segments.length === 0) {
      throw new Error('Timeline contains no active video segments. Please wait for the video player to load or add at least one segment.');
    }

    // Backend Tier Protection for Face Swap (avatarUrl)
    const isFaceSwapRequested = segments.some((s: any) => s.avatarUrl);
    if (isFaceSwapRequested) {
      const { getAuthContext } = await import('@/lib/auth');
      try {
        const { user, supabase: authClient } = await getAuthContext();
        const { data: profile } = await authClient.from('profiles').select('tier').eq('id', user.id).single();
        if (profile?.tier !== 'pro') {
          return NextResponse.json({ 
            error: '🔒 Опция Фейс Свап (Face Swap) доступна ТОЛЬКО в премиум-пакете SCALE ($79.90/мес). Пожалуйста, обновите ваш подписочный план.' 
          }, { status: 403 });
        }
      } catch (authErr) {
        console.warn('[Fusion] Tier check auth error:', authErr);
      }
    }

    const normalizedVideoUrl = normalizeSupabaseUrl(videoUrl);
    console.log(`[Fusion] Original video URL normalized from "${videoUrl}" to "${normalizedVideoUrl}"`);

    await fs.mkdir(tmpDir, { recursive: true });
    
    // Detect extension from normalizedVideoUrl to prevent extension-mismatch errors in FFmpeg
    let extension = 'mp4';
    if (normalizedVideoUrl.toLowerCase().includes('.webm')) {
      extension = 'webm';
    } else if (normalizedVideoUrl.toLowerCase().includes('.mov')) {
      extension = 'mov';
    } else if (normalizedVideoUrl.toLowerCase().includes('.avi')) {
      extension = 'avi';
    } else if (normalizedVideoUrl.toLowerCase().includes('.mkv')) {
      extension = 'mkv';
    }
    
    const originalVideoPath = path.join(tmpDir, `original.${extension}`);
    
    // 1. Download Original Video with automatic template fallback protection
    let downloadUrl = normalizedVideoUrl;
    let fallbackUsed = false;

    const downloadVideoFile = async (url: string, destPath: string) => {
      console.log(`[Fusion] Downloading video file: "${url}"`);
      const response = await axios({ 
        url, 
        method: 'GET', 
        responseType: 'stream',
        timeout: 20000,
        headers: { 'Accept': 'video/*, */*' }
      });
      const writer = createWriteStream(destPath);
      response.data.pipe(writer);
      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => {
          setTimeout(resolve, 150); // Extra tick for complete disk write sync
        });
        writer.on('error', (err) => {
          writer.destroy();
          reject(err);
        });
      });

      const stat = await fs.stat(destPath);
      if (stat.size < 1000) {
        throw new Error(`Downloaded video file is too small or corrupt (${stat.size} bytes)`);
      }
      console.log(`[Fusion] Successfully downloaded video file. Size: ${stat.size} bytes.`);
    };

    try {
      await downloadVideoFile(downloadUrl, originalVideoPath);
    } catch (err: any) {
      throw new Error(`Failed to download original recording: ${err.message}`);
    }

    // 1b. Normalize the entire original video into a seekable, fully indexed H.264 MP4.
    // Browser-recorded WebM files lack indices (cues), which causes FFmpeg input seeking (-ss before -i)
    // to output corrupted, headerless video chunks. Normalizing first guarantees perfect seeking.
    console.log('[Fusion] Normalizing browser WebM to seekable H.264 MP4...');
    const seekableVideoPath = path.join(tmpDir, 'seekable_original.mp4');
    try {
      await runFFmpeg([
        '-i', originalVideoPath,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-y',
        seekableVideoPath
      ]);
    } catch (err: any) {
      console.warn('[Fusion] Normalization with audio track failed (likely silent/no-mic video). Retrying with video-only normalization...', err.message);
      await runFFmpeg([
        '-i', originalVideoPath,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-an',
        '-y',
        seekableVideoPath
      ]);
      console.log('[Fusion] Silent/video-only normalization successful.');
    }

    // 2. Process Segments in Parallel
    console.log('[Fusion] Processing segments...');
    const processedSegments = await Promise.all(segments.map(async (seg: any, idx: number) => {
      const segmentInputPath = path.join(tmpDir, `seg_${idx}_raw.mp4`);
      
      // Cut and normalize segment to 720x1280, 25fps, yuv420p (strip audio with -an and use input seeking to guarantee valid keyframes)
      const duration = seg.endTime - seg.startTime;
      await runFFmpeg([
        '-ss', seg.startTime.toString(),
        '-i', seekableVideoPath,
        '-t', duration.toString(),
        '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(720-iw)/2:(1280-ih)/2,setsar=1',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-r', '25',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'main',
        '-level:v', '3.1',
        '-an',
        '-movflags', '+faststart',
        segmentInputPath
      ]);

      // Verify segment has been correctly written to disk before proceeding
      const rawSegStat = await fs.stat(segmentInputPath);
      if (rawSegStat.size === 0) {
        throw new Error(`Cut segment ${idx} raw video is empty`);
      }

      if (seg.avatarUrl) {
        // AI Path
        console.log(`[Fusion] Segment ${idx}: Animating with LivePortrait...`);
        const segmentBuffer = await fs.readFile(segmentInputPath);

        // CRITICAL: Pass Buffer directly to falService.uploadFile, NOT wrapped in Blob.
        // In Node.js, @fal-ai/client cannot stream bytes from a Web API Blob — it silently uploads 0 bytes.
        // Buffer is natively supported and ensures the correct byte payload is sent every time.
        if (segmentBuffer.length === 0) {
          throw new Error(`Segment ${idx} buffer is empty after fs.readFile — disk write may have failed.`);
        }
        console.log(`[Fusion] Segment ${idx}: Uploading driving segment (${segmentBuffer.length} bytes) directly to Fal storage...`);
        const drivingFalUrl = await falService.uploadFile(segmentBuffer, { fileName: `segment_${idx}.mp4`, contentType: 'video/mp4' });
        console.log(`[Fusion] Segment ${idx} driving video Fal URL: ${drivingFalUrl}`);

        // Optimize avatar image URL as well by uploading to Fal Storage
        let finalAvatarUrl = normalizeSupabaseUrl(seg.avatarUrl);
        console.log(`[Fusion] Pre-processing avatar URL: ${finalAvatarUrl}`);
        
        try {
          console.log(`[Fusion] Downloading avatar and uploading directly to Fal storage for maximum stability...`);
          const avatarRes = await axios.get(finalAvatarUrl, { responseType: 'arraybuffer' });
          const avatarBuffer = Buffer.from(avatarRes.data);
          
          if (avatarBuffer.length === 0) {
            throw new Error('Downloaded avatar image buffer is empty — check the avatar URL is accessible.');
          }
          console.log(`[Fusion] Avatar buffer ready: ${avatarBuffer.length} bytes. Uploading to Fal...`);
          // Pass Buffer directly — NOT wrapped in Blob (Blob causes 0-byte uploads in Node.js @fal-ai/client)
          const avatarFalUrl = await falService.uploadFile(avatarBuffer, { fileName: 'avatar.png', contentType: 'image/png' });
          finalAvatarUrl = avatarFalUrl;
          console.log(`[Fusion] Avatar Fal storage URL generated: ${finalAvatarUrl}`);
        } catch (err: any) {
          console.warn(`[Fusion] Direct upload of avatar to Fal storage failed, falling back to original URL: ${err.message}`);
        }

        const aiResult = await falService.animateAvatar(finalAvatarUrl, drivingFalUrl);
        
        // Download AI Result to a temp file
        const tempAiPath = path.join(tmpDir, `seg_${idx}_ai_raw.mp4`);
        const aiRes = await axios({ url: aiResult.videoUrl, method: 'GET', responseType: 'stream' });
        const aiWriter = createWriteStream(tempAiPath);
        aiRes.data.pipe(aiWriter);
        await new Promise((res, rej) => {
          aiWriter.on('finish', () => {
            setTimeout(res, 100); // 100ms extra tick to guarantee full OS sync
          });
          aiWriter.on('error', (err) => {
            aiWriter.destroy();
            rej(err);
          });
        });

        // Double check file size and accessibility of the downloaded video chunk to avoid race conditions
        const stat = await fs.stat(tempAiPath);
        if (stat.size === 0) {
          throw new Error(`Downloaded Fal AI video segment is empty: ${tempAiPath}`);
        }
        console.log(`[Fusion] Segment ${idx} Fal AI result downloaded successfully: ${stat.size} bytes`);
        
        // Normalize the AI segment to match exactly 720x1280, 25fps, yuv420p
        const aiPath = path.join(tmpDir, `seg_${idx}_ai.mp4`);
        await runFFmpeg([
          '-i', tempAiPath,
          '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(720-iw)/2:(1280-ih)/2,setsar=1',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '23',
          '-r', '25',
          '-pix_fmt', 'yuv420p',
          '-profile:v', 'main',
          '-level:v', '3.1',
          '-an',
          '-movflags', '+faststart',
          aiPath
        ]);
        
        // Verify normalized segment exists
        const normStat = await fs.stat(aiPath);
        if (normStat.size === 0) {
          throw new Error(`Normalized segment ${idx} is empty`);
        }

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

    const outputPath = path.join(tmpDir, 'output.mp4');
    // Extract original audio and bind to the new video sequence (re-encode to AAC for absolute compatibility)
    const audioPath = path.join(tmpDir, 'audio.m4a');
    try {
      console.log('[Fusion] Extracting audio from original video...');
      await runFFmpeg([
        '-i', originalVideoPath,
        '-vn',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-y',
        audioPath
      ]);
      
      const stats = await fs.stat(audioPath);
      if (stats.size === 0) {
        throw new Error('Extracted audio file is empty');
      }
    } catch (err: any) {
      console.warn('[Fusion] Original video has no audio or audio extraction failed. Generating silent audio fallback...', err.message);
      // Generate 120 seconds of stereo silence as a fallback so stitching never fails
      await runFFmpeg([
        '-f', 'lavfi',
        '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-t', '120',
        '-c:a', 'aac',
        '-y',
        audioPath
      ]);
      console.log('[Fusion] Silent audio fallback generated successfully.');
    }

    // Concatenate and force full re-encoding on the output using advanced FFmpeg concat filter.
    // This is 100% immune to OS path spaces, slashes, or quotation escaping errors.
    console.log('[Fusion] Concatenating and re-encoding output to normalize variable framerates...');
    const concatArgs: string[] = [];
    
    // 1. Add all segment videos as inputs
    for (const segmentPath of processedSegments) {
      concatArgs.push('-i', segmentPath);
    }
    // 2. Add audio file as the last input
    concatArgs.push('-i', audioPath);
    
    // 3. Build the concat filter complex
    const numSegments = processedSegments.length;
    let filterString = '';
    for (let i = 0; i < numSegments; i++) {
      filterString += `[${i}:v]`;
    }
    filterString += `concat=n=${numSegments}:v=1:a=0[outv]`;
    
    concatArgs.push(
      '-filter_complex', filterString,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-vsync', '2',
      '-map', '[outv]',
      '-map', `${numSegments}:a:0`, // Map audio track from the last input
      '-y',
      outputPath
    );

    await runFFmpeg(concatArgs);

    // 4. Upload Result
    const resultBuffer = await fs.readFile(outputPath);
    if (resultBuffer.length === 0) {
      throw new Error('Final output video is empty after stitching — FFmpeg concat may have failed silently.');
    }
    console.log(`[Fusion] Final output ready: ${resultBuffer.length} bytes. Uploading to Fal CDN...`);
    const finalUrl = await falService.uploadFile(resultBuffer, { fileName: 'output.mp4', contentType: 'video/mp4' });

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
