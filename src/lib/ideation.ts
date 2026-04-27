import { SupabaseClient } from '@supabase/supabase-js';
import { getModel } from './ai/gemini';
import fs from 'fs';
import path from 'path';

export interface IdeaSuggestion {
  id?: string;
  topic_title: string;
  rationale: string;
  viral_potential_score: number;
  category?: string;
  created_at?: string;
}

function formatDNA(answers: any): string {
  if (!answers) return "Missing DNA.";
  
  // Map developer keys (from DNABlock.tsx) to methodology terms (from Bible_SOT)
  return `
    🧬 BRAND IDENTITY:
    - NICHE (Super-niша): ${answers.sphere || answers.niche || 'N/A'}
    - TARGET AUDIENCE (Avatar/Who): ${answers.audience || answers.target_audience || 'N/A'}
    - DEEP FEARS/PAINS (Pain Point): ${answers.painPoint || answers.pain_points || 'N/A'}
    - UNIQUE METHOD (Secret Sauce): ${answers.approach || answers.expertise || 'N/A'}
    - CONTENT GOAL: ${answers.goal || 'N/A'}
    - TONE OF VOICE: ${answers.tone || 'N/A'}
    - FINAL OFFER: ${answers.advantage || answers.final_offer || 'N/A'}
  `;
}

export async function generateDailyIdeas(
  supabase: SupabaseClient,
  userId: string,
  locale: string = 'en',
  category?: string
): Promise<IdeaSuggestion[]> {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  
  // 0. Check total idea count for user
  const { count: totalIdeas } = await supabase
    .from('ideation_feed')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (totalIdeas && totalIdeas >= 200) {
    console.log(`User ${userId} reached 200 idea limit. Generation paused.`);
    return [];
  }
  
  // 1. Fetch user persona DNA, answers and tier
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('digital_shadow_prompt, industry_context, dna_answers, tier')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116' || error.message === 'Not found') {
      throw new Error('User personality not found');
    }
    throw error;
  }

  const userFilePath = path.join(process.cwd(), 'Bible_SOT', 'users', userId, 'Brand_DNA.md');
  const hasFileStrategy = fs.existsSync(userFilePath);
  
  let dnaContext = "";
  let isDnaComplete = false;

  if (hasFileStrategy) {
    try {
      dnaContext = fs.readFileSync(userFilePath, 'utf-8');
      isDnaComplete = true;
    } catch (e) {
      console.error('Failed to read DNA file in ideation:', e);
    }
  }

  if (!dnaContext) {
    const dnaAnswers = profile?.dna_answers || {};
    isDnaComplete = Object.values(dnaAnswers).filter((v: any) => v && v.toString().length > 2).length >= 7;
    dnaContext = isDnaComplete ? formatDNA(dnaAnswers) : "";
  }

  // Load Content Lego for ideation constraints
  let contentLego = "";
  try {
    const legoPath = path.join(process.cwd(), 'Bible_SOT', 'AI_prompts', 'Content_lego.md');
    contentLego = fs.readFileSync(legoPath, 'utf-8');
  } catch (e) {
    console.warn('Content Lego file not found for ideation');
  }

  const templateContext = !isDnaComplete 
    ? (locale === 'ru' ? "Автомобили в Дубае (перепродажа, люкс, пустыня, сервис, покупка, экспорт)" : "Cars in Dubai (resale, luxury, desert, service, buying, export)")
    : "";

  const digitalShadow = profile?.digital_shadow_prompt || (isDnaComplete ? 'Expert Content Strategist.' : 'Dubai Car Industry Expert');
  const targetCategory = category || "General";

  // Pre-format context blocks to avoid complex template literal nesting
  const brandContextBlock = isDnaComplete ? `USER BRAND DNA: ${dnaContext}` : `TEMPLATE THEMATIC: ${templateContext}`;
  const strategicContextBlock = isDnaComplete ? `STRATEGIC CONTEXT: ${digitalShadow}` : "";

  const prompt = `
    You are the "Viral Engine" Strategic Consultant.
    
    GUIDING METHODOLOGY (Content Lego):
    ${contentLego}

    TASK: Generate 5 high-retention video topic ideas for the category: "${targetCategory}".
    
    CONTENT STRATEGY (Ben Hunt's Ladder):
    Each category matches a stage in the awareness ladder. 
    Focus this specific generation on: "${targetCategory}".
    
    CRITICAL: All generated text content MUST BE IN THE SAME LANGUAGE as the user's input or the TEMPLATE THEMATIC provided below. If context is in Russian, output Russian. If Ukrainian, output Ukrainian. Default to ${languageName} only if language is ambiguous.
    
    ${brandContextBlock}
    
    ${strategicContextBlock}

    FOR CATEGORY "${targetCategory}":
    - If "Hooks": Generate ONLY the first 5 seconds of a script. These should be viral eye-catchers. 
    - If "Roles": Generate ONLY "Personas" or "Stances" (e.g. "The Cynic", "The Enthusiast", "The Investigative Journalist").
    - If "Awareness": Focus on hooks for people who don't know they need the product yet.
    - If "Problem": Focus on direct pain points and struggles.
    - If "Solution": Focus on how the methodology or product solves specific issues.
    - If "Loyalty": Focus on social proof, brand values, or community.
    - If "Fast Sales": Sharp CTAs and urgent value.
    - If "Trends": Hook onto current YouTube viral formats (Dubai luxury, speed, desert challenges).

    OUTPUT FORMAT: JSON array of 5 objects
    [
      {
        "topic_title": "Short, punchy title",
        "rationale": "Strategic reason why this works for this category",
        "viral_potential_score": 85-99,
        "category": "${targetCategory}"
      }
    ]
  `;

  const fastModel = getModel('fast');
  const result = await fastModel.generateContent(prompt);
  const response = await result.response;
  const text = response.text().trim();
  
  let jsonStr = text;
  const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  } else {
    jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
  }

  try {
    const ideas = JSON.parse(jsonStr);
    return ideas.map((i: any) => ({ 
      topic_title: i.topic_title,
      rationale: i.rationale,
      viral_potential_score: i.viral_potential_score,
      category: targetCategory 
    }));
  } catch (parseError) {
    console.error('Failed to parse AI response as JSON:', text);
    throw new Error('AI generated invalid data format.');
  }
}

export async function saveIdeasToFeed(supabase: SupabaseClient, userId: string, ideas: IdeaSuggestion[]) {
  const { error } = await supabase
    .from('ideation_feed')
    .insert(
      ideas.map(idea => ({
        user_id: userId,
        topic_title: idea.topic_title,
        rationale: idea.rationale,
        viral_potential_score: idea.viral_potential_score,
        category: idea.category,
        metadata: { 
          created_at: new Date().toISOString()
        },
        status: 'new'
      }))
    );

  if (error) throw error;
}
