import { model } from '@/lib/ai/gemini';
import { strategistService } from '@/lib/services/strategistService';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Changed from edge to nodejs because we need headers/cookies access for auth

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

    // 1. Authenticate user using our robust helper
    let user;
    try {
      user = await getAuthenticatedUser();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 2. Check access
    let access = await strategistService.getAccessStatus(user.id);
    
    // 3. Auto-activate trial if first time
    if (access.status === 'no_access') {
      const activated = await strategistService.activateTrial(user.id);
      if (!activated) {
        return new Response(JSON.stringify({ error: 'Failed to activate trial' }), { status: 500 });
      }
      access = await strategistService.getAccessStatus(user.id);
    }

    // 4. Final check
    if (!access.hasAccess) {
      return new Response(JSON.stringify({ 
        error: 'TRIAL_EXPIRED', 
        message: 'Your 24h trial has ended. Subscribe for $19/mo to continue.' 
      }), { status: 403 });
    }

    // 5. Build prompt
    const systemPrompt = await strategistService.getStrategistSystemPrompt(user.id, locale);
    
    // Add project context if available
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

    // Format history for Gemini
    const chatHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const currentMessage = messages[messages.length - 1].content;
    
    // 6. Build multimodal parts for current message
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

    // 7. Stream with Gemini
    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: systemPrompt + "\n" + projectContext,
    });

    const result = await chat.sendMessageStream(currentParts);
    
    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          controller.enqueue(new TextEncoder().encode(chunkText));
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
