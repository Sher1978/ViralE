import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { fal } from "@fal-ai/client";
import { supabaseAdmin } from '@/lib/supabase';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
export const runtime = 'nodejs';
export const maxDuration = 120; // Allow enough time for image gen + python video composition

async function uploadBufferToSupabase(buffer: Buffer, pathName: string, contentType: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from('media')
    .upload(pathName, buffer, {
      contentType,
      cacheControl: '31536000',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(pathName);
  return publicUrl;
}

export async function POST(req: NextRequest) {
  try {
    const { clipId, projectId, prompt, duration = 4.0 } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: 'Fal.ai API key is missing' }, { status: 500 });
    }

    console.log(`[Whiteboard Gen] Generating sketch for clip ${clipId} with prompt: "${prompt}"...`);

    // 1. Generate Sketch Image via Fal.ai (Flux Schnell)
    // We enforce 9:16 aspect ratio (768x1344)
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: prompt,
        image_size: { width: 768, height: 1344 },
        num_inference_steps: 4,
        enable_safety_checker: true,
        sync_mode: true
      }
    });

    const imageUrl = (result.data as any).images?.[0]?.url;
    if (!imageUrl) {
      throw new Error('Fal.ai image generation returned no URL');
    }

    console.log(`[Whiteboard Gen] Sketch image generated: ${imageUrl}`);

    // Download the generated image
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to download generated image: ${imageRes.statusText}`);
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // 2. Set up temporary paths for video generation
    const tmpDir = path.join(os.tmpdir(), `wb_${uuidv4()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const sketchPath = path.join(tmpDir, 'sketch.png');
    const videoPath = path.join(tmpDir, 'video.mp4');

    fs.writeFileSync(sketchPath, imageBuffer);

    // 3. Call the Python Sketch Engine to render drawing animation
    console.log(`[Whiteboard Gen] Invoking Python Sketch Engine for duration=${duration}s...`);
    const projectRoot = process.cwd();
    const pythonScript = path.join(projectRoot, 'scripts', 'viral_sketch_engine.py');
    
    // Command: python scripts/viral_sketch_engine.py <sketch> <output> <duration>
    const cmd = `python "${pythonScript}" "${sketchPath}" "${videoPath}" ${duration}`;
    
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: projectRoot });
      console.log(`[Whiteboard Gen] Python output:\n${stdout}`);
      if (stderr) {
        console.warn(`[Whiteboard Gen] Python stderr warnings:\n${stderr}`);
      }
    } catch (pythonErr: any) {
      console.error(`[Whiteboard Gen] Python engine failed:`, pythonErr);
      throw new Error(`Python sketch rendering failed: ${pythonErr.message || pythonErr}`);
    }

    // 4. Verify video exists and upload outputs to Supabase
    if (!fs.existsSync(videoPath)) {
      throw new Error('Rendered video file was not created by the Python engine');
    }

    const videoBuffer = fs.readFileSync(videoPath);
    
    console.log('[Whiteboard Gen] Uploading sketch image and video to Supabase Storage...');
    const uuid = uuidv4();
    
    // Upload image
    const sketchStoragePath = `whiteboard/sketch_${projectId}_${uuid}.png`;
    const finalImageUrl = await uploadBufferToSupabase(imageBuffer, sketchStoragePath, 'image/png');
    
    // Upload video
    const videoStoragePath = `whiteboard/video_${projectId}_${uuid}.mp4`;
    const finalVideoUrl = await uploadBufferToSupabase(videoBuffer, videoStoragePath, 'video/mp4');

    console.log(`[Whiteboard Gen] Successfully generated. Image: ${finalImageUrl}, Video: ${finalVideoUrl}`);

    // Cleanup local temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('[Whiteboard Gen] Failed to clean up temp files:', e);
    }

    return NextResponse.json({
      imageUrl: finalImageUrl,
      videoUrl: finalVideoUrl
    });

  } catch (error: any) {
    console.error('[Whiteboard Gen] Critical error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
