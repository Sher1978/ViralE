import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: Request) {
  try {
    const { prompt, style_prefix = '', aspect_ratio = '9:16' } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const fullPrompt = style_prefix ? `${style_prefix}, ${prompt}` : prompt;

    // Map aspect ratios to pixels
    let width = 768;
    let height = 1344;
    let dallESize: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1792";

    if (aspect_ratio === '4:5') {
      width = 864;
      height = 1080;
      dallESize = "1024x1792"; // Best fallback for 4:5
    } else if (aspect_ratio === '1:1') {
      width = 1024;
      height = 1024;
      dallESize = "1024x1024";
    } else if (aspect_ratio === '16:9') {
      width = 1344;
      height = 768;
      dallESize = "1792x1024";
    }

    // --- OPTION 1: RUNWARE (if key exists) ---
    if (RUNWARE_API_KEY) {
      try {
        console.log(`[Image Gen] Trying Runware with AR ${aspect_ratio}...`);
        const payload = [
          { taskType: 'authentication', apiKey: RUNWARE_API_KEY },
          {
            taskType: 'imageInference',
            taskUUID: uuidv4(),
            positivePrompt: fullPrompt,
            width,
            height,
            model: 'runware:100@1', 
            numberResults: 1,
            outputFormat: 'webp'
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
            
            try {
              const imgRes = await fetch(imageUrl);
              if (imgRes.ok) {
                const blob = await imgRes.blob();
                const { createClient } = await import('@supabase/supabase-js');
                const supabaseAdmin = createClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL!,
                  process.env.SUPABASE_SERVICE_ROLE_KEY!
                );
                
                const fileName = `generated/${uuidv4()}.webp`;
                const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                  .from('temp-assets')
                  .upload(fileName, blob, { contentType: 'image/webp' });

                if (!uploadError) {
                  const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('temp-assets')
                    .getPublicUrl(uploadData.path);
                  
                  return NextResponse.json({ url: publicUrl, id: inferenceResult.taskUUID });
                }
              }
            } catch (persistErr) {
              console.warn('[Image Gen] Persistence failed:', persistErr);
            }

            return NextResponse.json({ url: imageUrl, id: inferenceResult.taskUUID });
          }
        }
      } catch (e) {
        console.warn('[Image Gen] Runware failed:', e);
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
          
          try {
            const imgRes = await fetch(imageUrl);
            if (imgRes.ok) {
              const blob = await imgRes.blob();
              const { createClient } = await import('@supabase/supabase-js');
              const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
              );
              
              const fileName = `generated/${uuidv4()}.png`;
              const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                .from('temp-assets')
                .upload(fileName, blob, { contentType: 'image/png' });

              if (!uploadError) {
                const { data: { publicUrl } } = supabaseAdmin.storage
                  .from('temp-assets')
                  .getPublicUrl(uploadData.path);
                
                return NextResponse.json({ url: publicUrl });
              }
            }
          } catch (persistErr) {
            console.warn('[Image Gen] OpenAI Persistence failed:', persistErr);
          }

          return NextResponse.json({ url: imageUrl });
        }
      } catch (e) {
        console.error('[Image Gen] OpenAI failed:', e);
      }
    }

    return NextResponse.json({ error: 'No providers available' }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

