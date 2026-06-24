import { getModel } from '@/lib/ai/gemini';
import { SchemaType, FunctionCallingMode, GoogleGenerativeAI } from '@google/generative-ai';
import { strategistService } from '@/lib/services/strategistService';
import { strategistServerService } from '@/lib/services/strategistServerService';
import { getAuthContext } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let messages, projectId, locale, audioFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      messages = JSON.parse(formData.get('messages') as string);
      projectId = formData.get('projectId') as string;
      locale = formData.get('locale') as string;
      audioFile = formData.get('audio') as File;
    } else {
      const body = await req.json();
      messages = body.messages;
      projectId = body.projectId;
      locale = body.locale;
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), { status: 400 });
    }

    // 1. Authenticate user
    let user, authorizedSupabase;
    try {
      const auth = await getAuthContext();
      user = auth.user;
      authorizedSupabase = auth.supabase;
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 2. Check access
    const { data: profile } = await authorizedSupabase
      .from('profiles')
      .select('tier, synthetic_training_data')
      .eq('id', user.id)
      .single();

    const isPro = profile?.tier === 'pro';
    const syntheticData = profile?.synthetic_training_data as Record<string, any> || {};
    const geminiApiKey = syntheticData.gemini_api_key || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || undefined;

    let access = await strategistService.getAccessStatus(user.id);
    
    if (!isPro && access.status === 'no_access') {
      const activated = await strategistService.activateTrial(user.id);
      if (!activated) {
        return new Response(JSON.stringify({ error: 'Failed to activate trial' }), { status: 500 });
      }
      access = await strategistService.getAccessStatus(user.id);
    }

    if (!isPro && !access.hasAccess) {
      return new Response(JSON.stringify({ 
        error: 'TRIAL_EXPIRED', 
        message: 'Your 24h trial has ended.' 
      }), { status: 403 });
    }

    // 3. Build prompt
    const systemPrompt = await strategistServerService.getStrategistSystemPrompt(user.id, locale);
    
    let projectContext = "";
    if (projectId) {
      const { data: project } = await authorizedSupabase
        .from('projects')
        .select('title, status')
        .eq('id', projectId)
        .single();
      if (project) {
        projectContext = `CURRENT PROJECT: "${project.title}" (Status: ${project.status})\n`;
      }
    }

    const chatHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    let currentMessage = messages[messages.length - 1].content;
    let transcribed = false;

    if (audioFile) {
      console.log(`[Strategist Agent] Transcribing voice input of size: ${audioFile.size} bytes...`);
      
      // 1. OpenAI Whisper Transcription (Primary path, fast & stable)
      try {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (openaiKey) {
          const whisperForm = new FormData();
          const arrayBuffer = await audioFile.arrayBuffer();
          const audioBlob = new Blob([arrayBuffer], { type: audioFile.type || 'audio/webm' });
          const fileName = audioFile.type?.includes('webm') ? 'audio.webm' : 'audio.mp4';
          
          whisperForm.append('file', new File([audioBlob], fileName, { type: audioBlob.type }));
          whisperForm.append('model', 'whisper-1');
          
          const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${openaiKey}` },
            body: whisperForm,
          });
          
          if (whisperRes.ok) {
            const whisperData = await whisperRes.json();
            const text = whisperData.text || '';
            if (text.trim()) {
              console.log(`[Strategist Agent] Whisper Transcription success: "${text}"`);
              currentMessage = text;
              transcribed = true;
            }
          } else {
            console.warn('[Strategist Agent] Whisper failed:', await whisperRes.text());
          }
        }
      } catch (err: any) {
        console.warn('[Strategist Agent] Whisper error:', err.message || err);
      }
      
      // 2. Gemini Transcription Fallback (If Whisper fails or has no key)
      if (!transcribed) {
        try {
          console.log('[Strategist Agent] Attempting Gemini transcription fallback...');
          const arrayBuffer = await audioFile.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          
          const client = new GoogleGenerativeAI(geminiApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "");
          const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];
          let text = '';
          
          for (const modelName of modelsToTry) {
            try {
              console.log(`[Strategist Agent] Trying model ${modelName} for transcription...`);
              const transModel = client.getGenerativeModel({ model: modelName });
              const result = await transModel.generateContent([
                { text: "Transcribe the spoken audio precisely. Return ONLY the transcribed text. Do not add any explanation or note." },
                { inlineData: { mimeType: audioFile.type || 'audio/webm', data: base64 } }
              ]);
              text = result.response.text();
              if (text && text.trim()) {
                console.log(`[Strategist Agent] Gemini Transcription success with ${modelName}: "${text}"`);
                currentMessage = text.trim();
                transcribed = true;
                break;
              }
            } catch (err: any) {
              console.warn(`[Strategist Agent] Model ${modelName} transcription failed:`, err.message || err);
            }
          }
        } catch (gemErr: any) {
          console.error('[Strategist Agent] Gemini transcription fallback outer block failed:', gemErr.message || gemErr);
        }
      }
    }

    const currentParts: any[] = [{ text: currentMessage }];
    
    if (audioFile && !transcribed) {
      const arrayBuffer = await audioFile.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');
      currentParts.push({
        inlineData: {
          data: base64Audio,
          mimeType: audioFile.type || 'audio/webm'
        }
      });
    }

    // 4. Stream with AI Engine (Gemini or Groq Override)
    let engine;
    if (audioFile && !transcribed) {
      console.log('[Strategist Agent] Whisper & Gemini transcription failed. Using gemini-1.5-flash for audio chat stream.');
      const client = new GoogleGenerativeAI(geminiApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "");
      engine = client.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: "text/plain"
        }
      });
    } else {
      engine = getModel('fast', locale, 'text', geminiApiKey);
    }
    const chat = engine.startChat({
      history: chatHistory,
      systemInstruction: systemPrompt + "\n" + projectContext,
      generationConfig: {
        responseMimeType: "text/plain"
      },
      tools: [{
        functionDeclarations: [{
          name: "update_brand_dna",
          description: "Updates the user's permanent Brand DNA/Digital Shadow with new information synthesized from the conversation.",
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              new_info: {
                type: SchemaType.STRING,
                description: "The new facts, style preferences, or audience insights to add to the DNA."
              }
            },
            required: ["new_info"]
          }
        }]
      }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.AUTO
        }
      }
    });

    const result = await chat.sendMessageStream(currentParts);
    
    // Create a streaming response that also handles function calls
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        for await (const chunk of result.stream) {
          // Handle text chunks
          const chunkText = chunk.text();
          if (chunkText) {
            controller.enqueue(new TextEncoder().encode(chunkText));
            fullContent += chunkText;
          }

          // Handle function calls (DNA Updates)
          const calls = chunk.functionCalls();
          if (calls && calls.length > 0) {
            for (const call of calls) {
              if (call.name === 'update_brand_dna') {
                const { new_info } = call.args as any;
                console.log(`[Strategist Agent] AUTO-UPDATING DNA: ${new_info}`);
                
                try {
                  // Direct call to enrich script or logic here
                  // For simplicity, we trigger the update directly in Supabase
                  const currentProfile = await authorizedSupabase.from('profiles').select('digital_shadow_prompt').eq('id', user.id).single();
                  const oldDna = currentProfile.data?.digital_shadow_prompt || "";
                  
                  // Use the helper we already have in DNA update (or just append for now)
                  const { error } = await authorizedSupabase
                    .from('profiles')
                    .update({ 
                      digital_shadow_prompt: oldDna + "\n\n[Strategist Insight]: " + new_info,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);
                  
                  if (!error) {
                    controller.enqueue(new TextEncoder().encode("\n\n*(System Note: Brand DNA updated with new insights)*"));
                  }
                } catch (e) {
                  console.error('Failed to auto-update DNA:', e);
                }
              }
            }
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error: any) {
    console.error('Strategist API error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 });
  }
}
