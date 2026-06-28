import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { fal } from "@fal-ai/client";
import { supabaseAdmin } from '@/lib/supabase';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getModel } from '@/lib/ai/gemini';
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

    // 1. Optimize and translate prompt via Gemini
    let optimizedPrompt = prompt;
    try {
      const model = getModel('fast');
      const systemPrompt = `
You are an expert prompt engineer for the Flux image generation model.
Your task is to take any input description (which may be a mix of Russian and English, raw speech transcripts, or visual instructions) and output a highly optimized, clean English prompt for a whiteboard animation sketch.

Strictly follow this prompt style formula:
"A charming naive children's book doodle illustration of [SUBJECT], simple expressive black felt-tip marker drawing, whimsical hand-drawn style, minimalist kindergarten sketch aesthetic, funny, cute simplicity, isolated on a solid pure white canvas. Strictly no complex shading, no gradients, vector lines. The bottom-right quadrant of the canvas is completely empty, pure solid white blank space, strictly zero objects, lines or text in the bottom right corner."

Rules:
1. Translate any Russian/non-English words to English.
2. Refactor the core subject ([SUBJECT]) to represent a charming naive children's book doodle visual metaphor (e.g. stick figures, simple monsters, basic outlines, simple gears).
3. Do NOT translate the prompt formula keywords; keep them exactly as in the template.
4. Output ONLY the raw optimized English prompt string. Do not wrap in JSON, markdown, or codeblocks.
`;

      const response = await model.generateContent([systemPrompt, `Input description: ${prompt}`]);
      const responseText = response.response.text().trim();
      if (responseText) {
        optimizedPrompt = responseText;
        console.log(`[Whiteboard Gen] Optimized prompt: "${optimizedPrompt}"`);
      }
    } catch (geminiErr) {
      console.warn('[Whiteboard Gen] Gemini prompt optimization failed, falling back to original prompt:', geminiErr);
    }

    // 2. Generate Sketch Image via Fal.ai (Flux Schnell)
    // We enforce 9:16 aspect ratio (768x1344)
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: optimizedPrompt,
        image_size: { width: 768, height: 1344 },
        num_inference_steps: 8,
        enable_safety_checker: false,
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
    
    let pythonFailed = false;
    let pythonErrorMsg = '';

    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: projectRoot });
      console.log(`[Whiteboard Gen] Python output:\n${stdout}`);
      if (stderr) {
        console.warn(`[Whiteboard Gen] Python stderr warnings:\n${stderr}`);
      }
    } catch (pythonErr: any) {
      console.error(`[Whiteboard Gen] Python engine failed:`, pythonErr);
      pythonFailed = true;
      pythonErrorMsg = pythonErr.message || String(pythonErr);
    }

    const uuid = uuidv4();
    
    // Upload image (always uploaded)
    console.log('[Whiteboard Gen] Uploading sketch image to Supabase Storage...');
    const sketchStoragePath = `whiteboard/sketch_${projectId}_${uuid}.png`;
    const finalImageUrl = await uploadBufferToSupabase(imageBuffer, sketchStoragePath, 'image/png');
    
    // Upload video if python succeeded
    let finalVideoUrl = '';
    if (!pythonFailed && fs.existsSync(videoPath)) {
      console.log('[Whiteboard Gen] Uploading sketch video to Supabase Storage...');
      const videoStoragePath = `whiteboard/video_${projectId}_${uuid}.mp4`;
      finalVideoUrl = await uploadBufferToSupabase(fs.readFileSync(videoPath), videoStoragePath, 'video/mp4');
    }

    console.log(`[Whiteboard Gen] Image: ${finalImageUrl}, Video: ${finalVideoUrl || 'NONE (python failed)'}`);

    // Cleanup local temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('[Whiteboard Gen] Failed to clean up temp files:', e);
    }

    if (pythonFailed) {
      return NextResponse.json({
        imageUrl: finalImageUrl,
        videoUrl: '',
        warning: `Whiteboard animation script failed, showing static drawing. Details: ${pythonErrorMsg}`
      });
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
