import { getModel } from '@/lib/ai/gemini';
import { SchemaType, FunctionCallingMode, GoogleGenerativeAI } from '@google/generative-ai';
import { strategistService } from '@/lib/services/strategistService';
import { strategistServerService } from '@/lib/services/strategistServerService';
import { getAuthContext } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function cleanChatHistory(messages: any[]): any[] {
  const cleaned: any[] = [];
  
  for (const m of messages) {
    if (!m || !m.content || typeof m.content !== 'string' || !m.content.trim()) {
      continue; // Skip empty messages or tool calls without text content
    }

    const role = m.role === 'assistant' ? 'model' : 'user';
    
    if (cleaned.length === 0) {
      if (role === 'user') {
        cleaned.push({
          role,
          parts: [{ text: m.content }]
        });
      }
    } else {
      const last = cleaned[cleaned.length - 1];
      if (last.role === role) {
        last.parts[0].text += "\n" + m.content;
      } else {
        cleaned.push({
          role,
          parts: [{ text: m.content }]
        });
      }
    }
  }
  
  return cleaned;
}

export async function POST(req: Request) {
  let user: any = null;
  let authorizedSupabase: any = null;

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

    const isPremium = profile?.tier === 'pro' || profile?.tier === 'scale';
    const syntheticData = profile?.synthetic_training_data as Record<string, any> || {};
    const geminiApiKey = syntheticData.gemini_api_key || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || undefined;

    let access = { hasAccess: true, status: 'active', trialExpiresAt: null } as any;
    if (!isPremium) {
      try {
        access = await strategistService.getAccessStatus(user.id);
        if (access.status === 'no_access') {
          const activated = await strategistService.activateTrial(user.id);
          if (!activated) {
            return new Response(JSON.stringify({ error: 'Failed to activate trial' }), { status: 500 });
          }
          access = await strategistService.getAccessStatus(user.id);
        }
      } catch (err: any) {
        console.error('[Strategist API] Access check error:', err);
        return new Response(JSON.stringify({ error: `Access check failed: ${err.message}` }), { status: 500 });
      }
    }

    if (!isPremium && !access.hasAccess) {
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

    const chatHistory = cleanChatHistory(messages.slice(0, -1));

    let currentMessage = messages[messages.length - 1]?.content || "Привет";
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
          const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro'];
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
        systemInstruction: systemPrompt + "\n" + projectContext,
        generationConfig: {
          responseMimeType: "text/plain"
        }
      });
    } else {
      engine = getModel('fast', locale, 'text', geminiApiKey, systemPrompt + "\n" + projectContext);
    }
    const isInterviewMode = messages.some((m: any) => 
      m.content && typeof m.content === 'string' && (
        m.content.toLowerCase().includes('интервью') || 
        m.content.toLowerCase().includes('storybrand') || 
        m.content.toLowerCase().includes('сторибренд') ||
        m.content.toLowerCase().includes('днк') ||
        m.content.toLowerCase().includes('dna')
      )
    );

    const chat = engine.startChat({
      history: chatHistory,
      generationConfig: {
        responseMimeType: "text/plain"
      },
      tools: isInterviewMode ? [{
        functionDeclarations: [
          {
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
          },
          {
            name: "update_storybrand",
            description: "Updates the user's structured 7-element StoryBrand framework document in Supabase when new elements are collected during the interview.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                storybrand_markdown: {
                  type: SchemaType.STRING,
                  description: "The full updated Markdown document containing the 7 StoryBrand elements: Hero, Problem, Guide, Plan, Call to Action, Success, Failure."
                },
                storybrand_answers: {
                  type: SchemaType.OBJECT,
                  description: "The structured JSON object containing the answers for each of the 7 StoryBrand sections.",
                  properties: {
                    hero: {
                      type: SchemaType.OBJECT,
                      properties: {
                        description: { type: SchemaType.STRING, description: "Who is the ideal customer?" },
                        desire: { type: SchemaType.STRING, description: "What do they want?" }
                      }
                    },
                    problem: {
                      type: SchemaType.OBJECT,
                      properties: {
                        external: { type: SchemaType.STRING, description: "Physical/tangible obstacle." },
                        internal: { type: SchemaType.STRING, description: "How the obstacle makes the customer feel." },
                        philosophical: { type: SchemaType.STRING, description: "Why it is fundamentally wrong/unfair." }
                      }
                    },
                    guide: {
                      type: SchemaType.OBJECT,
                      properties: {
                        empathy: { type: SchemaType.STRING, description: "Expressing understanding of their pain." },
                        authority: { type: SchemaType.STRING, description: "Emphasizing competency, testimonials, stats, etc." }
                      }
                    },
                    plan: {
                      type: SchemaType.OBJECT,
                      properties: {
                        steps: { 
                          type: SchemaType.ARRAY, 
                          items: { type: SchemaType.STRING },
                          description: "3-4 step process to work together." 
                        },
                        agreement: { type: SchemaType.STRING, description: "Guarantee or risk reduction policy." }
                      }
                    },
                    cta: {
                      type: SchemaType.OBJECT,
                      properties: {
                        direct: { type: SchemaType.STRING, description: "Clear direct action (e.g. Buy Now)." },
                        transitional: { type: SchemaType.STRING, description: "Nurturing option (e.g. Free checklist)." }
                      }
                    },
                    failure: {
                      type: SchemaType.STRING,
                      description: "What negative outcomes are avoided."
                    },
                    success: {
                      type: SchemaType.OBJECT,
                      properties: {
                        results: { type: SchemaType.STRING, description: "Tangible positive outcomes." },
                        transformation: { type: SchemaType.STRING, description: "Before vs After character change." }
                      }
                    }
                  }
                }
              },
              required: ["storybrand_markdown"]
            }
          }
        ]
      }] : undefined,
      toolConfig: isInterviewMode ? {
        functionCallingConfig: {
          mode: FunctionCallingMode.AUTO
        }
      } : undefined
    });

    const result = await chat.sendMessageStream(currentParts);
    
    // Create a streaming response that also handles function calls
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        for await (const chunk of result.stream) {
          // Handle text chunks safely without throwing when text is not present (e.g. tool calling chunks)
          let chunkText = "";
          try {
            chunkText = chunk.text();
          } catch (e) {
            // Safe manual text extraction fallback
            const candidate = chunk.candidates?.[0];
            if (candidate?.content?.parts) {
              chunkText = candidate.content.parts
                .map((p: any) => p.text || "")
                .join("");
            }
          }

          if (chunkText) {
            controller.enqueue(new TextEncoder().encode(chunkText));
            fullContent += chunkText;
          }

          // Handle function calls (DNA Updates) safely
          try {
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
                } else if (call.name === 'update_storybrand') {
                  const { storybrand_markdown, storybrand_answers } = call.args as any;
                  console.log(`[Strategist Agent] AUTO-UPDATING STORYBRAND: ${storybrand_markdown.substring(0, 100)}...`);
                  
                  try {
                    // Distill StoryBrand markdown into Digital Shadow master prompt using Gemini
                    let digitalShadowPrompt = "";
                    try {
                      const model = getModel('fast', 'ru', 'text', geminiApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "");
                      const extractPrompt = `
                        You are an expert AI Persona Architect. 
                        Your goal is to distill the following StoryBrand document into a beautiful, high-density, authoritative, and declarative "Digital Shadow DNA" (Master Prompt) in Russian (if the input is primarily Russian) or English.
                        Describe the expert's tone of voice, unique methodology, area of expertise, core worldview, and target audience.
                        Output ONLY the final declarative, cohesive paragraph (max 300 words). No introduction, no markdown blocks, no bullet points.
                        
                        USER STORYBRAND DOCUMENT:
                        ${storybrand_markdown}
                      `;
                      const result = await model.generateContent(extractPrompt);
                      const response = await result.response;
                      digitalShadowPrompt = response.text().trim();
                    } catch (e) {
                      console.warn('[Strategist Agent] Failed to distill StoryBrand document:', e);
                    }

                    const { error } = await authorizedSupabase
                      .from('profiles')
                      .update({ 
                        storybrand_raw_content: storybrand_markdown,
                        storybrand_updated_at: new Date().toISOString(),
                        ...(storybrand_answers && { storybrand_answers }),
                        ...(digitalShadowPrompt && { digital_shadow_prompt: digitalShadowPrompt }),
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', user.id);
                    
                    if (!error) {
                      controller.enqueue(new TextEncoder().encode("\n\n*(System Note: StoryBrand DNA and Digital Shadow successfully updated with new insights)*"));
                    }
                  } catch (e) {
                    console.error('Failed to auto-update StoryBrand:', e);
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error parsing function calls from chunk:', e);
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
    try {
      const { notifyAdminError } = await import('@/lib/telegram');
      notifyAdminError({
        source: 'Strategist AI Agent API',
        error,
        userId: user?.id,
        userEmail: user?.email,
      }).catch(() => {});
    } catch (e) {}
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500 });
  }
}
