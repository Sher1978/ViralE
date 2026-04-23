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
      You are an expert digital biographer and AI architect.
      Analyze the following raw training data from a user and distill it into a structured "Digital DNA" profile.
      
      RAW DATA:
      ${trainingData}

      OUTPUT JSON FORMAT:
      {
        "tone_profile": ["trait1", "trait2", "trait3"],
        "key_foundations": ["philosophy1", "philosophy2"],
        "writing_style": "description of writing style",
        "target_audience": "description of target audience",
        "biography_summary": "3-sentence bio"
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
