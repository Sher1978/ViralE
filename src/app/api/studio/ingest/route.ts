import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
  try {
    const { projectId, videoUrl, locale } = await req.json();

    if (!videoUrl || !projectId) {
      return NextResponse.json({ error: 'Missing videoUrl or projectId' }, { status: 400 });
    }

    // 1. Initialize Gemini 1.5 Flash (optimized for video/audio understanding)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 2. Construct Analysis Prompt
    // Note: In a production environment, we would use the File Manager API to upload the video to Gemini.
    // For this implementation, we ask Gemini to analyze the content based on the user's intent.
    // If the video is already hosted, we provide the context.
    
    const systemPrompt = `
      You are the "Viral Engine" Ingest Specialist. 
      The user has uploaded a RAW video (60s max).
      Your task is to transcribe the speech and organize it into a production manifest.
      
      ACTS TO FILL:
      1. hook (0-5s)
      2. problem (5-15s)
      3. good_news (15-30s)
      4. solution (30-50s)
      5. cta (50-60s)
      
      For each act, you MUST provide:
      - text: The exact spoken words in that section.
      - word_timings: A detailed array of every single word with its precise "start" and "end" timestamps in seconds.
      - broll_prompt: CRITICAL RULE — The B-roll must SHOW what is being SAID, not abstract visuals.
        Extract the KEY ACTION or KEY SUBJECT from the spoken text.
        ...
        ALWAYS: realistic action scene, 4K cinematic, matches the spoken moment EXACTLY.
        Format: "[subject] [doing the exact action from the text], [camera style], [mood]"
      
      OUTPUT FORMAT: Valid JSON only, no markdown.
      {
        "acts": [
          { 
            "type": "hook", 
            "text": "...", 
            "word_timings": [
               { "text": "Hello", "start": 0.1, "end": 0.5 },
               ...
            ],
            "broll_prompt": "..." 
          }
        ]
      }
      
      Language: ${locale === 'ru' ? 'Russian' : 'English'}.
    `;

    // 3. Perform Analysis (Multimodal path placeholder)
    // For MVP, we use the video metadata/context if available, 
    // or we assume the user wants a generic blueprint until audio extraction is synced.
    // In full implementation, we'd fetch the video buffer and send to Gemini.
    
    // FETCHING THE VIDEO (Simulation for the tool)
    const videoResponse = await fetch(videoUrl);
    const videoBuffer = await videoResponse.arrayBuffer();
    
    const result = await model.generateContent([
      systemPrompt,
      {
        inlineData: {
          data: Buffer.from(videoBuffer).toString("base64"),
          mimeType: "video/mp4"
        }
      },
      "Analyze this raw video. Transcribe it and provide the 5-act structure for montage."
    ]);

    const response = await result.response;
    const aiText = response.text().trim();
    const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '');
    const data = JSON.parse(cleanJson);

    // 4. Transform AI data into ProductionManifest segments
    const segments = data.acts.map((act: any) => ({
      id: uuidv4(),
      type: 'user_recording', // Important: tells production it's from the original video
      scriptText: act.text,
      wordTimings: act.word_timings, // Added karaoke data
      prompt: act.broll_prompt,
      assetUrl: videoUrl, // Use the uploaded video as the base for all segments
      status: 'completed',
      animationStyle: 'none',
      duration: act.word_timings?.[act.word_timings.length - 1]?.end || 10,
    }));

    const manifest = {
      version: "2.0",
      projectId,
      segments,
      totalDuration: 60,
      config: {
        resolution: "1080x1920",
        fps: 30,
        musicVolume: 0.1
      }
    };

    return NextResponse.json({ success: true, manifest });

  } catch (err: any) {
    console.error('[IngestAPI] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
