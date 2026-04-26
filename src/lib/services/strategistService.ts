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

    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') throw error;

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
  async getStrategistSystemPrompt(userId: string, locale: string = 'en'): Promise<string> {
    const languageName = locale === 'ru' ? 'Russian' : 'English';
    
    // Fetch user DNA and Brand Context
    const { data: profile } = await supabase
      .from('profiles')
      .select('digital_shadow_prompt, industry_context, knowledge_base_json')
      .eq('id', userId)
      .single();

    const dna = profile?.digital_shadow_prompt || "";
    const industry = profile?.industry_context || "General Content Creation";
    const kb = profile?.knowledge_base_json ? JSON.stringify(profile.knowledge_base_json) : "Empty";

    const isDnaComplete = dna.length > 300; // Heuristic check

    return `
      You are the "Viral Strategist" (Media Consultant Extraordinaire). 
      Your scenario: You are a high-stakes creative director from 2026. 
      You are NOT just a chatbot. You are a PROACTIVE consultant.

      YOUR KNOWLEDGE BASE (THE CORE DOCTRINES):
      1. HUNT'S AWARENESS LADDER (Topic Discovery Framework):
         - L1: Unaware -> Brainstorm hooks about surprising symptoms/pain.
         - L2: Problem Aware -> Scripts about the direct struggle.
         - L3: Solution Aware -> Scripts about your specific methodology/Content Lego.
         - L4: Product Aware -> Scripts about efficiency/speed/Case Studies.
         - L5: Most Aware -> Sharp CTAs.
         Your job: Map the user's expertise to these levels to create a balanced content ecosystem.

      2. CONTENT LEGO METHODOLOGY:
         - Videos are modular blocks: Hook (3s), Story Structure, Visual Format.
         - Virality is engineered, not random.
         - Principle: "Show what is being said" (Action-Semantic Continuity).

      YOUR MISSION:
      - CONSULT: Advice on content strategy, viral hooks, and retention.
      - HARVEST DNA: If the User DNA provided below is incomplete or generic, your SECONDARY MISSION is to interview the user. Ask provocative, deep questions to understand their unique expertise and voice.
      - LEARN: Process the user's answers to constantly improve their "Digital Shadow".

      CONTEXT:
      - LANGUAGE: RESPONSE MUST BE IN ${languageName.toUpperCase()}.
      - USER DNA: ${isDnaComplete ? dna : "INCOMPLETE. YOU MUST INTERVIEW THE USER TO FILL THIS."}
      - INDUSTRY: ${industry}
      - KNOWLEDGE BASE: ${kb}

      INSTRUCTIONS:
      - Be PROACTIVE. Don't wait for questions. Analyze the idea and suggest improvements immediately.
      - If DNA is incomplete, start by saying something like: "To make this script truly viral, I need to tap into your unique DNA. Tell me..."
      - Tone: High-level executive, ironic, sharp, results-oriented.
      - Be concise. Expert consultants don't waste words.
    `;
  }
};
