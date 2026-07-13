import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { profileService } from '@/lib/services/profileService';
import * as gemini from '@/lib/ai/gemini';
import * as anthropic from '@/lib/ai/anthropic';
import * as groq from '@/lib/ai/groq';
import fs from 'fs';
import path from 'path';

export const maxDuration = 60; // Vercel limit

export async function POST(req: Request) {
  try {
    const { user, supabase: authorizedSupabase } = await getAuthContext();
    const body = await req.json();
    const coreIdea = body.coreIdea || body.topic;
    const { locale = 'en', engine = 'gemini' } = body;

    const userId = user.id;

    // Get Digital Shadow and Brand DNA
    const { data: profile } = await authorizedSupabase
      .from('profiles')
      .select('digital_shadow_prompt, anthropic_api_key, groq_api_key, synthetic_training_data')
      .eq('id', userId)
      .single();

    const { brandContext } = await profileService.getActiveBrandContext(userId, authorizedSupabase);
    const digitalShadow = brandContext || profile?.digital_shadow_prompt || '';
    const anthropicApiKey = profile?.anthropic_api_key || undefined;
    const groqApiKey = profile?.groq_api_key || undefined;
    
    const syntheticData = profile?.synthetic_training_data as Record<string, any> || {};
    const geminiApiKey = syntheticData.gemini_api_key || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || undefined;
    
    const languageName = locale === 'ru' ? 'Russian' : 'English';
    const trizPath = path.join(process.cwd(), 'Bible_SOT', 'AI_prompts', 'TRIZ.md');
    let trizTemplateText = '';
    if (fs.existsSync(trizPath)) {
      trizTemplateText = fs.readFileSync(trizPath, 'utf-8');
    }

    const trizPrompt = `
      You are an expert neuromarketer and creative strategist.
      Based on the user's Brand DNA/Digital Shadow, run the TRIZ analysis prompt using the following inputs.
      
      --- USER BRAND DNA / STRATEGIC CONTEXT ---
      ${digitalShadow}
      
      --- TRIZ METHODOLOGY & TEMPLATE ---
      ${trizTemplateText}
      
      --- INPUTS ---
      * Object (Theme): ${coreIdea}
      
      TASK: Generate a high-fidelity marketing matrix of 3 ideas (select and focus only on the 3 most relevant presentation angles/screens out of the 9-screen TRIZ methodology). 
      Output MUST BE a strictly valid JSON array of exactly 3 objects.
      Each object must have the following keys:
      - "level": string (e.g., "Надсистема - Настоящее")
      - "goal": string (e.g., "Охват")
      - "hook": string (The hook/angle)
      - "scenario": string (The brief 50-sec outline)
      - "cta": string (Call to action)

      Output EXCLUSIVELY in ${languageName}.
      Return ONLY the JSON array without markdown formatting or other text.
    `;

    let responseText = '';

    if (engine === 'gemini') {
        responseText = await gemini.generateText(trizPrompt, geminiApiKey);
    } else if (engine === 'groq') {
        responseText = await groq.generateTrizText(trizPrompt, groqApiKey);
    } else if (engine === 'claude' || engine === 'claude-byok') {
        responseText = await anthropic.generateTrizText(trizPrompt, anthropicApiKey);
    } else {
        responseText = await gemini.generateText(trizPrompt, geminiApiKey); // fallback
    }

    // Clean JSON response
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    let trizData = [];
    try {
        trizData = JSON.parse(cleanJson);
    } catch (e) {
        console.error('[TRIZ API] Failed to parse JSON:', cleanJson);
        // Fallback: wrap raw text in one item if parse fails
        trizData = [{ level: 'Error', goal: '', hook: cleanJson, scenario: '', cta: '' }];
    }

    return NextResponse.json({ success: true, ideas: trizData });

  } catch (error: any) {
    console.error('[TRIZ API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
