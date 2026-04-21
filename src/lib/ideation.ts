import { SupabaseClient } from '@supabase/supabase-js';
import { model } from './ai/gemini';

export interface IdeaSuggestion {
  topic_title: string;
  rationale: string;
  viral_potential_score: number;
}

export async function generateDailyIdeas(supabase: SupabaseClient, userId: string, locale: string = 'en'): Promise<IdeaSuggestion[]> {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  
  // 1. Fetch user persona DNA
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('digital_shadow_prompt, industry_context')
    .eq('id', userId)
    .single();

  if (error || !profile?.digital_shadow_prompt) {
    throw new Error('User personality not found. Complete onboarding first.');
  }

  const prompt = `
    You are the "Viral Engine" Trend-Spotter. Based on the user's personality and industry, 
    generate 3 fresh, high-retention video topic ideas for today.
    
    CRITICAL: All generated text content (topic_title, rationale) MUST BE IN ${languageName.toUpperCase()}.
    
    USER PERSONA DNA:
    ${profile.digital_shadow_prompt}
    
    INDUSTRY CONTEXT:
    ${profile.industry_context || 'General Content Creation'}
    
    OUTPUT FORMAT: JSON array of 3 objects
    [
      {
        "topic_title": "Short, punchy title",
        "rationale": "Why this will go viral for this specific persona",
        "viral_potential_score": 85-99
      }
    ]
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text().trim();
  
  // Clean potential markdown code blocks
  const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
  return JSON.parse(jsonStr);
}

export async function saveIdeasToFeed(supabase: SupabaseClient, userId: string, ideas: IdeaSuggestion[]) {
  const { error } = await supabase
    .from('ideation_feed')
    .insert(
      ideas.map(idea => ({
        user_id: userId,
        ...idea,
        status: 'new'
      }))
    );

  if (error) throw error;
}
