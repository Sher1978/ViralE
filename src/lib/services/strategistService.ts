import { supabase } from '../supabase';
import { model } from '../ai/gemini';

export interface AccessStatus {
  hasAccess: boolean;
  status: 'no_access' | 'trial' | 'active';
  trialExpiresAt: string | null;
}

export const strategistService = {
  /**
   * Checks if the user has access to the Strategist (Trial or Subscription).
   */
  async getAccessStatus(userId: string): Promise<AccessStatus> {
    // 1. Check if user has an entry in feature_access
    const { data, error } = await supabase
      .from('feature_access')
      .select('trial_started_at, is_subscribed')
      .eq('user_id', userId)
      .eq('feature_id', 'strategist_pilot')
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // 2. If subscribed, full access
    if (data?.is_subscribed) {
      return { hasAccess: true, status: 'active', trialExpiresAt: null };
    }

    // 3. If trial started, check if within 24h
    if (data?.trial_started_at) {
      const trialStart = new Date(data.trial_started_at);
      const now = new Date();
      const expiresAt = new Date(trialStart.getTime() + 24 * 60 * 60 * 1000);

      if (now < expiresAt) {
        return { 
          hasAccess: true, 
          status: 'trial', 
          trialExpiresAt: expiresAt.toISOString() 
        };
      }
    }

    return { hasAccess: false, status: 'no_access', trialExpiresAt: null };
  },

  /**
   * Activates the 24h free trial for a user.
   */
  async activateTrial(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('feature_access')
      .upsert({
        user_id: userId,
        feature_id: 'strategist_pilot',
        trial_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to activate trial:', error);
      return false;
    }
    return true;
  },

  /**
   * Constructs the system prompt for the strategist using user DNA and project context.
   */
  async getStrategistSystemPrompt(userId: string, locale: string = 'en') {
    const languageName = locale === 'ru' ? 'Russian' : 'English';
    
    // Fetch user DNA
    const { data: profile } = await supabase
      .from('profiles')
      .select('digital_shadow_prompt, industry_context')
      .eq('id', userId)
      .single();

    const dna = profile?.digital_shadow_prompt || "A professional content creator seeking viral reach.";
    const industry = profile?.industry_context || "General Content Creation";

    return `
      You are the "Viral Strategist" for the Viral Engine platform. 
      Your goal is to be a high-level PR consultant and creative director for the user.
      
      CRITICAL INSTRUCTIONS:
      1. TONE: Ironic, Expert, Fast-paced, minimalist. You speak like a top-tier media executive from 2026.
      2. LANGUAGE: You MUST respond in ${languageName.toUpperCase()}.
      3. KNOWLEDGE: You know the "Viral Engine" philosophy:
         - High retention hooks (3 seconds).
         - Hybrid production (Premium Avatar for hooks, dynamic B-roll for body).
         - Value density: Every second must justify itself.
      4. USER DNA:
         ${dna}
      5. INDUSTRY: ${industry}
      
      Your mission is to help the user refine their script, brainstorm better hooks, or improve their overall content strategy. 
      If the user asks to change the script, provide clear advice and suggest specific changes.
      Keep your responses concise and punchy.
    `;
  }
};
