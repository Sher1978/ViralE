import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import axios from 'axios';
import os from 'os';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { supabaseAdmin } from '@/lib/supabase';

const ffmpegPath = ffmpegInstaller.path;

export const maxDuration = 60; // 60 seconds is plenty for transcoding a short clip

async function runFFmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
  // Ensure execute permissions on non-Windows (Linux/macOS server containers)
  if (process.platform !== 'win32') {
    try {
      console.log(`[FFmpeg-Normalize] Setting executable permissions (0755) on ${ffmpegPath}`);
      await fs.chmod(ffmpegPath, 0o755);
    } catch (e: any) {
      console.warn('[FFmpeg-Normalize] chmod execute permission warning (non-fatal):', e.message);
    }
  }

  return new Promise((resolve, reject) => {
    console.log(`[FFmpeg-Normalize] Running command: ffmpeg ${args.join(' ')}`);
    const proc = spawn(ffmpegPath, args);
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data: any) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data: any) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code: number) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(`FFmpeg failed with exit code ${code}`);
        (err as any).stderr = stderr;
        reject(err);
      }
    });
    
    proc.on('error', (err: any) => {
      reject(err);
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { videoUrl, projectId } = await req.json();

    if (!videoUrl || !projectId) {
      return NextResponse.json({ error: 'Missing parameters: videoUrl, projectId' }, { status: 400 });
    }

    console.log(`[Normalize] Downloading original video: ${videoUrl}`);
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.webm`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.mp4`);

    // 1. Download file to disk
    const response = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream'
    });

    const writer = createWriteStream(inputPath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', (err) => reject(err));
    });

    // 2. Perform lightning-fast, high-compatibility transcoding
    // Transcodes Audio to standard AAC (fully supported with sound in Telegram & mobile OS decoders)
    // Transcodes Video to H.264 (universal playback compatibility)
    // Runs superfast preset for sub-second/multi-second response times
    console.log('[Normalize] Starting FFmpeg transcoding to H.264 MP4 with AAC...');
    await runFFmpeg([
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', 'superfast',
      '-crf', '26',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-y', outputPath
    ]);

    console.log('[Normalize] Transcoding success! Reading normalized file...');
    const normalizedBuffer = await fs.readFile(outputPath);

    // 3. Upload to Supabase Storage
    const fileName = `${projectId}/normalized_${Date.now()}.mp4`;
    const filePath = `user_recordings/${fileName}`;
    console.log(`[Normalize] Uploading normalized video to: ${filePath}`);

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(filePath, normalizedBuffer, {
        contentType: 'video/mp4',
        contentDisposition: 'attachment',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('media')
      .getPublicUrl(filePath);

    console.log(`[Normalize] Successfully uploaded. Public URL: ${publicUrl}`);

    // Register Asset in database
    const { data: asset, error: assetError } = await supabaseAdmin
      .from('media_assets')
      .insert({
        project_id: projectId,
        file_path: filePath,
        public_url: publicUrl,
        asset_type: 'video',
        metadata: { studio_recorded: true, normalized: true }
      })
      .select()
      .single();

    if (assetError) {
      console.warn('[Normalize] Asset register warning (non-fatal):', assetError.message);
    }

    // Clean up temporary files asynchronously
    fs.unlink(inputPath).catch(() => {});
    fs.unlink(outputPath).catch(() => {});

    return NextResponse.json({ success: true, publicUrl });

  } catch (error: any) {
    console.error('[Normalize] Critical error during transcoding:', error);
    return NextResponse.json({ error: error.message || 'Transcoding failed' }, { status: 500 });
  }
}
