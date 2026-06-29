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
export const maxDuration = 120;

// ---------------------------------------------------------------------------
// Supabase upload helper
// ---------------------------------------------------------------------------
async function uploadBufferToSupabase(
  buffer: Buffer,
  pathName: string,
  contentType: string
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from('media')
    .upload(pathName, buffer, { contentType, cacheControl: '31536000', upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(pathName);
  return publicUrl;
}

// ---------------------------------------------------------------------------
// Notebook background generator (pure Node.js + FFmpeg drawbox/color filters)
// Creates an 1080×1920 notebook page PNG and returns its temp path.
// ---------------------------------------------------------------------------
async function generateNotebookBackground(tmpDir: string): Promise<string> {
  const outPath = path.join(tmpDir, 'notebook_bg.png');

  // Build FFmpeg filtergraph:
  //  1. Cream paper base (color=0xEBECF0, 1080x1920)
  //  2. Horizontal ruled lines every 62px starting at y=180, light blue
  //  3. Red vertical margin line at x=130
  //  4. Spiral binding strip: white rectangle on left, grey border
  //  5. Binding ring ovals (drawbox approximation with ellipses via lavfi)

  const lineColor = '0xBDC3D0@0.8';   // soft blue-grey
  const marginColor = '0xC85050@0.7'; // red margin
  const paperColor = '0xEBECF0';      // cream paper
  const bindingColor = '0xE2E4EA';    // slightly darker left strip
  const ringColor = '0x505060';       // dark metal rings

  // Generate ruled lines filter
  const lineHeight = 62;
  const firstLine = 180;
  const canvasH = 1920;
  const lineFilters: string[] = [];

  let y = firstLine;
  let idx = 0;
  while (y < canvasH - 80) {
    lineFilters.push(
      `drawbox=x=80:y=${y}:w=960:h=1:color=${lineColor}:t=fill`
    );
    y += lineHeight;
    idx++;
  }

  // Binding rings (ovals approximated as small rounded boxes)
  const ringFilters: string[] = [];
  const ringSpacing = 95;
  const ringX = 10;
  const ringW = 56;
  const ringH = 26;
  let ry = 100;
  while (ry < canvasH - 80) {
    // Outer ring shadow
    ringFilters.push(
      `drawbox=x=${ringX}:y=${ry - ringH / 2}:w=${ringW}:h=${ringH}:color=${ringColor}@0.8:t=3`
    );
    // Inner lighter ring
    ringFilters.push(
      `drawbox=x=${ringX + 8}:y=${ry - ringH / 2 + 4}:w=${ringW - 16}:h=${ringH - 8}:color=0x909098@0.5:t=2`
    );
    ry += ringSpacing;
  }

  // Build the complete filter_complex chain
  const allFilters = [
    // Paper base
    `color=c=${paperColor}:s=1080x1920:d=1[base]`,
    // Apply all line + ring drawboxes as a chain
    `[base]` +
      [...lineFilters, ...ringFilters,
        // Margin line
        `drawbox=x=130:y=40:w=2:h=1840:color=${marginColor}:t=fill`,
        // Left binding strip
        `drawbox=x=0:y=0:w=62:h=1920:color=${bindingColor}:t=fill`,
        // Binding strip right border
        `drawbox=x=60:y=0:w=2:h=1920:color=0xB0B5BF@0.8:t=fill`,
        // Paper edge shadow (right)
        `drawbox=x=1076:y=0:w=4:h=1920:color=0x000000@0.06:t=fill`,
        // Paper edge shadow (bottom)
        `drawbox=x=0:y=1916:w=1080:h=4:color=0x000000@0.06:t=fill`,
      ].join(',') + `[out]`
  ].join(';');

  const cmd = [
    'ffmpeg', '-y',
    '-filter_complex', `"${allFilters}"`,
    '-map', '[out]',
    '-frames:v', '1',
    '-update', '1',
    `"${outPath}"`
  ].join(' ');

  try {
    const { stderr } = await execAsync(cmd);
    if (stderr && stderr.includes('Error')) {
      throw new Error(stderr.slice(0, 200));
    }
    return outPath;
  } catch (err: any) {
    // Fallback: generate a plain cream PNG via simple color filter
    console.warn('[Whiteboard] Notebook bg generation failed, using plain cream:', err.message?.slice(0, 100));
    const fallbackCmd = [
      'ffmpeg', '-y',
      '-f', 'lavfi', '-i', `color=c=${paperColor}:s=1080x1920:d=1`,
      '-frames:v', '1', '-update', '1',
      `"${outPath}"`
    ].join(' ');
    await execAsync(fallbackCmd);
    return outPath;
  }
}

// ---------------------------------------------------------------------------
// Composite sketch onto notebook background using FFmpeg overlay
// Returns path to composited PNG
// ---------------------------------------------------------------------------
async function compositeSketchOnNotebook(
  sketchPath: string,
  notebookPath: string,
  tmpDir: string
): Promise<string> {
  const outPath = path.join(tmpDir, 'composited.png');

  // Scale background to 1080x1920 first, then place scaled sketch (840x1540) on top using blend=multiply.
  // This avoids colorkey wiping out actual drawing lines due to soft anti-aliased edge similarities.
  const cmd = [
    'ffmpeg', '-y',
    '-i', `"${notebookPath}"`,
    '-i', `"${sketchPath}"`,
    '-filter_complex',
    `"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=rgba[bg];` +
    `[1:v]scale=840:1540:force_original_aspect_ratio=decrease,` +
    `pad=840:1540:(ow-iw)/2:(oh-ih)/2:color=white,` +
    `pad=1080:1920:120:190:color=white,format=rgba[sketch];` +
    `[bg][sketch]blend=all_mode=multiply[out]"`,
    '-map', '[out]',
    '-frames:v', '1', '-update', '1',
    `"${outPath}"`
  ].join(' ');

  try {
    await execAsync(cmd);
    return outPath;
  } catch (err: any) {
    console.warn('[Whiteboard] Composite failed, falling back to simple multiply:', err.message?.slice(0, 100));
    const fallbackCmd = [
      'ffmpeg', '-y',
      '-i', `"${notebookPath}"`,
      '-i', `"${sketchPath}"`,
      '-filter_complex',
      `"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=rgba[bg];` +
      `[1:v]scale=840:1540:force_original_aspect_ratio=decrease,` +
      `pad=840:1540:(ow-iw)/2:(oh-ih)/2:color=white,` +
      `pad=1080:1920:120:190:color=white,format=rgba[sk];` +
      `[bg][sk]blend=all_mode=multiply[out]"`,
      '-map', '[out]', '-frames:v', '1', '-update', '1',
      `"${outPath}"`
    ].join(' ');
    await execAsync(fallbackCmd);
    return outPath;
  }
}

// ---------------------------------------------------------------------------
// Create drawing-reveal animation video using FFmpeg
// Mask: scanline (boustrophedon) row-by-row — full reveal in `duration` seconds.
// Hand: fast left-right hatching strokes (8 Hz) following the current row frontier,
//       simulating accelerated pen hatching at 2-3× perceived speed.
// ---------------------------------------------------------------------------
async function createDrawingVideo(
  compositedImagePath: string,
  notebookPath: string,
  tmpDir: string,
  duration: number,
  fps: number = 30
): Promise<string> {
  const outPath = path.join(tmpDir, 'video.mp4');
  const durSec = duration;
  const handPath = path.join(process.cwd(), 'public', 'assets', 'studio', 'drawing_hand.png');
  const hasHand = fs.existsSync(handPath);

  console.log(`[Whiteboard] Creating drawing video: duration=${durSec}s, fps=${fps}, hasHand=${hasHand}`);

  // ── Sketch area constants (must match compositeSketchOnNotebook) ──────────
  const sX = 120;   // sketch x-offset on notebook canvas
  const sY = 190;   // sketch y-offset on notebook canvas
  const sW = 840;   // sketch width
  const sH = 1540;  // sketch height
  const lineH = 4;  // hatching stripe height — thin for dense feel

  // ── Scanline / boustrophedon mask ─────────────────────────────────────────
  // For each pixel (X,Y) in sketch-space [0..sW] x [0..sH]:
  //   row        = floor(Y / lineH)
  //   xInRow     = X if even row, (sW-1-X) if odd row   (boustrophedon)
  //   pixelIdx   = row * sW + xInRow
  //   totalPx    = sW * sH
  //   revealedPx = totalPx * T / durSec
  //   pixel on   = pixelIdx < revealedPx
  //
  // FFmpeg geq expression (lum channel; cb/cr = 128 → opaque white mask):
  const maskGeq =
    `if(` +
      `lt(` +
        `floor(Y/${lineH})*${sW}+if(eq(mod(floor(Y/${lineH}),2),0),X,${sW}-1-X),` +
        `${sW}*${sH}*T/${durSec}` +
      `),` +
      `255,0` +
    `)`;

  // ── Hand position expressions ─────────────────────────────────────────────
  // Y: smoothly tracks the vertical center of the current row (slow drift = duration).
  // X: fast left→right / right→left oscillation at 8 Hz within current row bounds,
  //    plus tiny tremor (3 px, 22 Hz) to simulate natural pen jitter.
  //
  // rowFrac(t) = (t / durSec) — which fraction of rows is done
  // rowY_px    = sY + rowFrac * sH        (vertical tracking, slow)
  //
  // Within a row the pen sweeps the full sW width per half-cycle at 8 Hz:
  //   x_sweep = sX + sW/2 + (sW/2)*sin(2*PI*8*t)     (fast back-and-forth)
  // On odd rows the direction flips naturally because sin is symmetric.
  //
  // Hand image anchor is offset by (-35, -61) so pen-tip sits at the formula point.
  const handXExpr = `${sX}+${sW}/2+(${sW}/2)*sin(2*PI*8*t)+3*sin(2*PI*22*t)-35`;
  const handYExpr = `${sY}+(t/${durSec})*${sH}+3*cos(2*PI*22*t)-61`;

  // ── Dot fallback expressions (same logic, tiny offset) ────────────────────
  const dotXExpr = `${sX}+${sW}/2+(${sW}/2)*sin(2*PI*8*t)+3*sin(2*PI*22*t)-4`;
  const dotYExpr = `${sY}+(t/${durSec})*${sH}+3*cos(2*PI*22*t)-4`;

  let filterComplex = '';
  if (hasHand) {
    filterComplex = [
      // Input 0: notebook background (looped static)
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
        `loop=loop=-1:size=1:start=0,trim=duration=${durSec},setpts=PTS-STARTPTS,format=rgba[bg]`,
      // Input 1: composited sketch (looped static)
      `[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
        `loop=loop=-1:size=1:start=0,format=rgba[sketch_full]`,
      `[sketch_full]crop=${sW}:${sH}:${sX}:${sY},format=rgba[sketch_crop]`,
      // Boustrophedon scanline mask
      `color=c=black:s=${sW}x${sH},geq=lum='${maskGeq}':cb=128:cr=128,format=rgba,trim=duration=${durSec}[mask]`,
      `[sketch_crop][mask]alphamerge[sketch_masked]`,
      `[bg][sketch_masked]overlay=${sX}:${sY},format=rgba[paper_with_sketch]`,
      // Input 2: hand image (scaled, no loop needed)
      `[2:v]scale=1200:-1,format=rgba[hand_scaled]`,
      // Overlay hand: fast horizontal hatching strokes, slow vertical drift
      `[paper_with_sketch][hand_scaled]overlay=` +
        `x='${handXExpr}':` +
        `y='${handYExpr}'[out]`
    ].join(';');
  } else {
    filterComplex = [
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
        `loop=loop=-1:size=1:start=0,trim=duration=${durSec},setpts=PTS-STARTPTS,format=rgba[bg]`,
      `[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
        `loop=loop=-1:size=1:start=0,format=rgba[sketch_full]`,
      `[sketch_full]crop=${sW}:${sH}:${sX}:${sY},format=rgba[sketch_crop]`,
      `color=c=black:s=${sW}x${sH},geq=lum='${maskGeq}':cb=128:cr=128,format=rgba,trim=duration=${durSec}[mask]`,
      `[sketch_crop][mask]alphamerge[sketch_masked]`,
      `[bg][sketch_masked]overlay=${sX}:${sY},format=rgba[paper_with_sketch]`,
      // Fallback: dot marker following the pen tip
      `[paper_with_sketch]drawtext=text='•':fontcolor=0x302515:` +
        `x='${dotXExpr}':y='${dotYExpr}':fontsize=20[out]`
    ].join(';');
  }

  const inputs = [
    '-loop', '1', '-i', `"${notebookPath}"`,
    '-loop', '1', '-i', `"${compositedImagePath}"`
  ];
  if (hasHand) {
    inputs.push('-loop', '1', '-i', `"${handPath}"`);
  }

  const cmd = [
    'ffmpeg', '-y',
    ...inputs,
    '-filter_complex', `"${filterComplex}"`,
    '-map', '[out]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-level', '4.0', '-crf', '22',
    '-t', String(durSec),
    '-r', String(fps),
    `"${outPath}"`
  ].join(' ');

  try {
    const { stderr } = await execAsync(cmd, { timeout: 60_000 });
    if (stderr && stderr.toLowerCase().includes('error') && !fs.existsSync(outPath)) {
      throw new Error(stderr.slice(0, 300));
    }
    console.log(`[Whiteboard] Drawing video created: ${outPath}`);
    return outPath;
  } catch (err: any) {
    console.warn('[Whiteboard] filter failed, using ken-burns fallback:', err.message?.slice(0, 100));
    const totalFrames = Math.floor(duration * fps);
    const fallbackCmd = [
      'ffmpeg', '-y',
      '-loop', '1', '-i', `"${compositedImagePath}"`,
      '-vf', `"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0015,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1080x1920"`,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22',
      '-t', String(durSec), '-r', String(fps),
      `"${outPath}"`
    ].join(' ');
    await execAsync(fallbackCmd, { timeout: 45_000 });
    return outPath;
  }
}

// ---------------------------------------------------------------------------
// Main POST handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { clipId, projectId, prompt, duration = 4.0 } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: 'Fal.ai API key is missing' }, { status: 500 });
    }

    // Check FFmpeg availability
    let ffmpegAvailable = false;
    try {
      await execAsync('ffmpeg -version');
      ffmpegAvailable = true;
    } catch {
      // Try ffmpeg-installer path
      try {
        const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
        process.env.PATH = `${path.dirname(ffmpegPath)}:${process.env.PATH || ''}`;
        await execAsync('ffmpeg -version');
        ffmpegAvailable = true;
      } catch {
        console.warn('[Whiteboard] FFmpeg not available — will return static image only');
      }
    }

    console.log(`[Whiteboard Gen] clip=${clipId}, duration=${duration}s, ffmpeg=${ffmpegAvailable}`);

    // ── Step 1: Optimize prompt via Gemini ──────────────────────────────────
    let optimizedPrompt = prompt;
    try {
      const systemPrompt = `
You are an expert prompt engineer and visual metaphor designer for whiteboard explainer videos.
Your task is to take the input (which can be a direct image description or a raw conversational subtitle quote in Russian/English) and output a highly optimized English prompt for a premium whiteboard sketch.

CRITICAL METAPHOR RULE:
If the input is an abstract phrase, speaker quote, or conversation fragment (e.g., "Ну раз уж у нас вечер...", "хочу поделиться...", "смысл в том...", "на самом деле..."), do NOT translate it literally. 
Instead, first distil the core emotional or conceptual meaning of the phrase, choose a strong concrete physical-world metaphor representing it (e.g., a hand reaching to a star, a lightbulb turning on, a key unlocking a brain, a phone displaying video messages, a scale balancing ideas, a rocket taking off), and write a prompt for that metaphor!

STRICT VISUAL STYLE FORMULA:
"A professional whiteboard doodle illustration of [CORE_SUBJECT]. Clean bold black outlines, modern explainer video style, expressive character and objects. Include helpful whiteboard elements around the subject like conceptual arrows, swirls, abstract thinking icons, lightbulbs or exclamation marks. Completely flat solid white background. Strictly NO shading, NO gradients, NO watercolor, NO photographic elements, NO text, NO words, NO letters. Clean sharp vector-like line art, portrait orientation 9:16."

Rules:
1. Translate any concept and subject details to English.
2. Ensure there is strictly NO text, NO characters, NO letters inside the drawing.
3. Output ONLY the raw optimized prompt string — no markdown, no quotes, no JSON wrappers.
`;

      const model = getModel('fast');
      const response = await model.generateContent([systemPrompt, `Input: ${prompt}`]);
      const txt = response.response.text().trim();
      if (txt) {
        optimizedPrompt = txt;
        console.log(`[Whiteboard Gen] Optimized prompt: "${optimizedPrompt.substring(0, 80)}..."`);
      }
    } catch (err) {
      console.warn('[Whiteboard Gen] Gemini optimization failed, using original prompt');
    }

    // ── Step 2: Generate sketch image via Fal.ai Flux ───────────────────────
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: optimizedPrompt,
        image_size: { width: 768, height: 1344 },
        num_inference_steps: 8,
        enable_safety_checker: false,
        sync_mode: true
      }
    });

    const falImageUrl = (result.data as any).images?.[0]?.url;
    if (!falImageUrl) {
      throw new Error('Fal.ai image generation returned no URL');
    }
    console.log(`[Whiteboard Gen] Fal.ai image: ${falImageUrl}`);

    // Download sketch image
    const imageRes = await fetch(falImageUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to download Fal.ai image: ${imageRes.statusText}`);
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    // ── Step 3: Upload sketch image to Supabase ──────────────────────────────
    const uuid = uuidv4();
    const sketchStoragePath = `whiteboard/sketch_${projectId}_${uuid}.png`;
    const finalImageUrl = await uploadBufferToSupabase(imageBuffer, sketchStoragePath, 'image/png');
    console.log(`[Whiteboard Gen] Sketch uploaded: ${finalImageUrl}`);

    // ── Step 4: Create notebook background + drawing animation ───────────────
    if (!ffmpegAvailable) {
      // No FFmpeg → return static image only
      return NextResponse.json({
        imageUrl: finalImageUrl,
        videoUrl: '',
        warning: 'FFmpeg not available — showing static sketch without animation'
      });
    }

    const tmpDir = path.join(os.tmpdir(), `wb_${uuid}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    let finalVideoUrl = '';
    let warning: string | undefined;

    try {
      // Write sketch to temp file
      const sketchTmpPath = path.join(tmpDir, 'sketch.png');
      fs.writeFileSync(sketchTmpPath, imageBuffer);

      // Use the premium pre-generated notebook background asset if available
      let notebookPath = path.join(process.cwd(), 'public', 'assets', 'studio', 'notebook_bg.png');
      if (!fs.existsSync(notebookPath)) {
        console.log('[Whiteboard Gen] Premium background not found, generating on-the-fly');
        notebookPath = await generateNotebookBackground(tmpDir);
      }

      // Composite sketch onto notebook
      const compositedPath = await compositeSketchOnNotebook(sketchTmpPath, notebookPath, tmpDir);

      // Create animated video
      const videoPath = await createDrawingVideo(compositedPath, notebookPath, tmpDir, duration);

      if (fs.existsSync(videoPath) && fs.statSync(videoPath).size > 0) {
        const videoBuffer = fs.readFileSync(videoPath);
        const videoStoragePath = `whiteboard/video_${projectId}_${uuid}.mp4`;
        finalVideoUrl = await uploadBufferToSupabase(videoBuffer, videoStoragePath, 'video/mp4');
        console.log(`[Whiteboard Gen] Video uploaded: ${finalVideoUrl}`);
      } else {
        warning = 'Video file was empty or missing after generation';
      }
    } catch (videoErr: any) {
      console.error('[Whiteboard Gen] Video generation failed:', videoErr.message);
      warning = `Animation failed: ${videoErr.message?.slice(0, 100)}`;
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }

    return NextResponse.json({
      imageUrl: finalImageUrl,
      videoUrl: finalVideoUrl,
      ...(warning ? { warning } : {})
    });

  } catch (error: any) {
    console.error('[Whiteboard Gen] Critical error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
