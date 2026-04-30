import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { userId, trainingData } = await req.json();
    if (!userId || !trainingData) {
      return NextResponse.json({ error: 'Missing userId or trainingData' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Analyze the following raw training data from a user and distill it into a structured "Digital DNA" profile.
      Also, assign the most suitable "Golden Visual Style" from these 6:
      - dubai_platinum: Luxury, success, premium business, real estate.
      - tech_catalyst: Tech, AI, marketing, minimal innovation.
      - turbo_dynamics: Auto, speed, logistics, grit, energy.
      - human_os: Psychology, mindfulness, soft skills, nature.
      - shadow_audit: Strategy, law, analytics, monochrome geometry.
      - startup_valley: Creative, startup, vibrant SMM, energy.
      
      RAW DATA:
      ${trainingData}

      OUTPUT JSON FORMAT:
      {
        "tone_profile": ["trait1", "trait2", "trait3"],
        "key_foundations": ["philosophy1", "philosophy2"],
        "writing_style": "description of writing style",
        "target_audience": "description of target audience",
        "biography_summary": "3-sentence bio",
        "suggested_visual_style": "key_from_the_6_above"
      }
      
      Respond ONLY with the JSON.
    `;


    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up markdown if present
    const cleanJson = text.replace(/```json|```/gi, '').trim();
    const dnaInfo = JSON.parse(cleanJson);

    // Update profile in database
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        synthetic_training_data: trainingData,
        knowledge_base_json: dnaInfo,
        visual_style: dnaInfo.suggested_visual_style || 'tech_catalyst',
        dna_last_updated: new Date().toISOString()
      })

      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('DNA Distillation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
