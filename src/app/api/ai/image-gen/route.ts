import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { fal } from "@fal-ai/client";
import { VISUAL_STYLES, GlobalStyleAnchor } from '@/lib/ai/visual-generator';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthContext } from '@/lib/auth';
import { deductCredits, CREDIT_COSTS } from '@/lib/credits';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

async function uploadToSupabase(externalUrl: string): Promise<string> {
  if (!externalUrl) return externalUrl;
  try {
    console.log(`[Image Gen] Downloading external image to store persistently: ${externalUrl}`);
    const res = await fetch(externalUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch image from CDN: ${res.statusText}`);
    }
    const contentType = res.headers.get('content-type') || 'image/webp';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine extension from content-type or default to webp
    let ext = 'webp';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
    else if (contentType.includes('gif')) ext = 'gif';

    const fileName = `generated/${uuidv4()}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from('media')
      .upload(fileName, buffer, {
        contentType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(fileName);
    console.log(`[Image Gen] Successfully stored in Supabase: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.warn('[Image Gen] Supabase storage upload failed, falling back to CDN URL:', err);
    return externalUrl;
  }
}

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const { prompt, style_prefix = '', visual_style, aspect_ratio = '9:16', provider = 'flux', seed } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Deduct Credits for Image Generation
    try {
      await deductCredits(authorizedSupabase as any, user.id, CREDIT_COSTS.AI_LOOK_POLISH, 'IMAGE_GEN');
    } catch (e: any) {
      if (e.message === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }
      throw e;
    }

    const isGrokRequested = provider === 'grok' || provider === 'flux';
    
    // Dynamically resolve visual style (request body -> user profile -> default startup_valley)
    let styleKey = (visual_style || '').toLowerCase();
    
    if (!styleKey) {
      try {
        const { profileService } = await import('@/lib/services/profileService');
        const profile = await profileService.getOrCreateProfile();
        if (profile?.visual_style) {
          styleKey = profile.visual_style.toLowerCase();
        }
      } catch (e) {
        console.warn('[Image Gen] Failed to fetch user profile for style:', e);
      }
    }
    
    if (!styleKey) {
      styleKey = 'startup_valley';
    }

    let finalSuffix = '';
    if (VISUAL_STYLES[styleKey as GlobalStyleAnchor]) {
      finalSuffix = VISUAL_STYLES[styleKey as GlobalStyleAnchor].prompt;
    } else if (style_prefix) {
      finalSuffix = `, ${style_prefix}`;
    }

    const fullPrompt = `${prompt}${finalSuffix}`;

    // Map aspect ratios to pixels
    let width = 768;
    let height = 1344;
    let dallESize: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1792";

    if (aspect_ratio === '4:5') {
      width = 768;
      height = 960;
      dallESize = "1024x1792"; 
    } else if (aspect_ratio === '1:1') {
      width = 1024;
      height = 1024;
      dallESize = "1024x1024";
    } else if (aspect_ratio === '16:9') {
      width = 1344;
      height = 768;
      dallESize = "1792x1024";
    }

    // --- OPTION 0: Grok (xAI) if requested and key exists ---
    if (isGrokRequested && XAI_API_KEY) {
      try {
        console.log(`[Image Gen] Using Grok (xAI) for AR ${aspect_ratio}...`);
        const response = await fetch('https://api.x.ai/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${XAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "grok-2-vision-latest", // Grok's primary image gen model (Flux-based)
            prompt: fullPrompt,
            n: 1,
            size: aspect_ratio === '1:1' ? '1024x1024' : aspect_ratio === '16:9' ? '1792x1024' : '1024x1792',
          })
        });

        const data = await response.json();
        if (response.ok && data.data?.[0]?.url) {
          const finalUrl = await uploadToSupabase(data.data[0].url);
          return NextResponse.json({ url: finalUrl, provider: 'grok' });
        }
        console.warn('[Image Gen] Grok API failed, falling back...', data);
      } catch (e) {
        console.warn('[Image Gen] Grok error:', e);
      }
    }

    // --- OPTION 1: RUNWARE (FLUX optimized) ---
    if (RUNWARE_API_KEY) {
      try {
        console.log(`[Image Gen] Trying Runware FLUX with AR ${aspect_ratio} and seed ${seed}...`);
        const payload = [
          { taskType: 'authentication', apiKey: RUNWARE_API_KEY },
          {
            taskType: 'imageInference',
            taskUUID: uuidv4(),
            positivePrompt: fullPrompt,
            width,
            height,
            model: 'runware:101@1', // FLUX.1 [schnell] - Fast & Realistic
            numberResults: 1,
            outputFormat: 'webp',
            ...(seed !== undefined && seed !== null && { seed: Number(seed) })
          }
        ];

        const response = await fetch('https://api.runware.ai/v1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const inferenceResult = data.data?.find((d: any) => d.taskType === 'imageInference');
          if (inferenceResult && inferenceResult.imageURL) {
            const imageUrl = inferenceResult.imageURL;
            
            console.log(`[Image Gen] Runware success → ${imageUrl}`);
            const finalUrl = await uploadToSupabase(imageUrl);
            return NextResponse.json({ url: finalUrl, id: inferenceResult.taskUUID });
          }
        }
      } catch (e) {
        console.warn('[Image Gen] Runware failed:', e);
      }
    }

    // --- OPTION 1.5: Fal.ai (FLUX.1 Schnell) ---
    if (process.env.FAL_KEY) {
      try {
        console.log(`[Image Gen] Trying Fal.ai FLUX.1 [schnell] with AR ${aspect_ratio} and size ${width}x${height}...`);
        const result = await fal.subscribe("fal-ai/flux/schnell", {
          input: {
            prompt: fullPrompt,
            image_size: { width, height },
            num_inference_steps: 4,
            enable_safety_checker: true,
            sync_mode: true,
            ...(seed !== undefined && seed !== null && { seed: Number(seed) })
          }
        });

        const imageUrl = (result.data as any).images?.[0]?.url;
        if (imageUrl) {
          console.log(`[Image Gen] Fal.ai success → ${imageUrl}`);
          const finalUrl = await uploadToSupabase(imageUrl);
          return NextResponse.json({ url: finalUrl, provider: 'fal-flux' });
        }
      } catch (e: any) {
        console.warn('[Image Gen] Fal.ai FLUX failed:', e.message || e);
      }
    }

    // --- OPTION 2: OPENAI DALL-E 3 (Fallback) ---
    if (OPENAI_API_KEY) {
      try {
        console.log(`[Image Gen] Falling back to DALL-E 3 with size ${dallESize}...`);
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: fullPrompt,
            n: 1,
            size: dallESize,
            quality: "hd"
          })
        });

        const data = await response.json();
        if (response.ok && data.data?.[0]?.url) {
          const imageUrl = data.data[0].url;
          console.log(`[Image Gen] OpenAI success → ${imageUrl}`);
          const finalUrl = await uploadToSupabase(imageUrl);
          return NextResponse.json({ url: finalUrl });
        }
      } catch (e) {
        console.error('[Image Gen] OpenAI failed:', e);
      }
    }
    // --- OPTION 3: REPLICATE (Fallback) ---
    if (REPLICATE_API_TOKEN) {
      try {
        console.log(`[Image Gen] Falling back to Replicate (Flux Dev) with AR ${aspect_ratio}...`);
        const Replicate = (await import('replicate')).default;
        const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

        const output: any = await replicate.run(
          "lucataco/flux-dev:a5739f37ef1108d4b3ff2ba8ef1a7fa2744ef8740c83d6a978f85f36e4be32a5",
          {
            input: {
              prompt: fullPrompt,
              aspect_ratio: aspect_ratio === '9:16' || aspect_ratio === '16:9' || aspect_ratio === '1:1' ? aspect_ratio : '9:16',
              output_format: "webp",
              guidance_scale: 3.5,
              num_inference_steps: 28
            }
          }
        );

        const imageUrl = Array.isArray(output) ? output[0] : output;
        if (imageUrl) {
          console.log(`[Image Gen] Replicate success → ${imageUrl}`);
          const finalUrl = await uploadToSupabase(imageUrl);
          return NextResponse.json({ url: finalUrl, provider: 'replicate' });
        }
      } catch (e: any) {
        console.error('[Image Gen] Replicate failed:', e.message || e);
      }
    }

    return NextResponse.json({ error: 'No providers available' }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

