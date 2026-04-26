import { model } from '@/lib/ai/gemini';
import { SchemaType } from '@google/generative-ai';
import { strategistService } from '@/lib/services/strategistService';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
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
    let user;
    try {
      user = await getAuthenticatedUser();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 2. Check access
    let access = await strategistService.getAccessStatus(user.id);
    
    if (access.status === 'no_access') {
      const activated = await strategistService.activateTrial(user.id);
      if (!activated) {
        return new Response(JSON.stringify({ error: 'Failed to activate trial' }), { status: 500 });
      }
      access = await strategistService.getAccessStatus(user.id);
    }

    if (!access.hasAccess) {
      return new Response(JSON.stringify({ 
        error: 'TRIAL_EXPIRED', 
        message: 'Your 24h trial has ended.' 
      }), { status: 403 });
    }

    // 3. Build prompt
    const systemPrompt = await strategistService.getStrategistSystemPrompt(user.id, locale);
    
    let projectContext = "";
    if (projectId) {
      const { data: project } = await supabase
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

    const currentMessage = messages[messages.length - 1].content;
    const currentParts: any[] = [{ text: currentMessage }];
    
    if (audioFile) {
      const arrayBuffer = await audioFile.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');
      currentParts.push({
        inlineData: {
          data: base64Audio,
          mimeType: audioFile.type || 'audio/webm'
        }
      });
    }

    // 4. Stream with Gemini (including Tool Use for DNA Updates)
    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: systemPrompt + "\n" + projectContext,
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
          mode: "AUTO"
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
                  const currentProfile = await supabase.from('profiles').select('digital_shadow_prompt').eq('id', user.id).single();
                  const oldDna = currentProfile.data?.digital_shadow_prompt || "";
                  
                  // Use the helper we already have in DNA update (or just append for now)
                  const { error } = await supabase
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
