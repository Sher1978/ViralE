import { SupabaseClient } from '@supabase/supabase-js';
import { model } from './ai/gemini';

export interface IdeaSuggestion {
  topic_title: string;
  rationale: string;
  viral_potential_score: number;
}

export async function generateDailyIdeas(supabase: SupabaseClient, userId: string, locale: string = 'en'): Promise<IdeaSuggestion[]> {
  const languageName = locale === 'ru' ? 'Russian' : 'English';
  
  // 1. Fetch user persona DNA and tier
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('digital_shadow_prompt, industry_context, tier')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116' || error.message === 'Not found') {
      throw new Error('User personality not found');
    }
    throw error;
  }

  const tier = profile?.tier || 'free';

  // Enforcement of Tier Gating for AI Topic Generation
  if (tier === 'free') {
    const { count } = await supabase
      .from('ideation_feed')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((count || 0) >= 3) {
      throw new Error('TIER_LOCK: Your free trial of the Strategist is over (3/3). Upgrade to Creator for 20 topics/mo.');
    }
  }

  // Monthly limit enforcement for Creator tier
  if (tier === 'creator') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const { count } = await supabase
      .from('ideation_feed')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if ((count || 0) >= 20) {
      throw new Error('MONTHLY_LIMIT: You have reached your limit of 20 AI topics per month. Upgrade to Pro for unlimited generation.');
    }
  }

  const digitalShadow = profile?.digital_shadow_prompt || 'Expert Content Strategist focused on high-retention viral marketing.';
  const industry = profile?.industry_context || 'General Content Creation';


  const prompt = `
    You are the "Viral Engine" Trend-Spotter. Based on the user's personality and industry, 
    generate 3 fresh, high-retention video topic ideas for today.
    
    CRITICAL: All generated text content (topic_title, rationale) MUST BE IN ${languageName.toUpperCase()}.
    
    USER PERSONA DNA:
    ${digitalShadow}
    
    INDUSTRY CONTEXT:
    ${industry}
    
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
  
  // Clean potential markdown code blocks and extract the JSON array
  let jsonStr = text;
  const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  } else {
    // Fallback cleaning if Regex fails
    jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
  }

  try {
    return JSON.parse(jsonStr);
  } catch (parseError) {
    console.error('Failed to parse AI response as JSON:', text);
    throw new Error('AI generated invalid data format. Please try again.');
  }
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
