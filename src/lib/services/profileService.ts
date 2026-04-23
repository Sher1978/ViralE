import { supabase } from '../supabase';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  credits_balance: number;
  digital_shadow_prompt: string | null;
  industry_context: string | null;
  onboarding_completed: boolean;
  synthetic_training_data?: string;
  knowledge_base_json?: any;
  tier: 'free' | 'creator' | 'pro';
  subscription_status: string;
  heygen_api_key?: string | null;
  anthropic_api_key?: string | null;
  elevenlabs_api_key?: string | null;
  groq_api_key?: string | null;
}

export const profileService = {
  /**
   * Ensures the current user has a profile record in the database.
   * If not authenticated, attempts to sign in anonymously.
   */
  async ensureProfile(): Promise<Profile | null> {
    try {
      // 1. Get current session
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;

      // 2. If no session, sign in anonymously
      if (!session) {
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) throw authError;
        session = authData.session;
      }

      if (!session?.user) return null;

      // 3. Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile not found, create it
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              id: session.user.id,
              email: session.user.email || `anon_${session.user.id}@viral.engine`,
              credits_balance: 100, // Default starting credits
              tier: 'free',
              subscription_status: 'active',
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        return newProfile;
      }

      if (profileError) throw profileError;

      return profile;
    } catch (error) {
      console.error('Error in profileService.ensureProfile:', error);
      return null;
    }
  },

  async getOrCreateProfile(): Promise<Profile | null> {
    return this.ensureProfile();
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      return false;
    }
    return true;
  },
  
  async getMonthlyGenerationCount(userId: string): Promise<{ count: number | null, error: any }> {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const { count, error } = await supabase
      .from('credits_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('transaction_type', 'SCRIPT_GEN')
      .gte('created_at', firstDay);
      
    return { count, error };
  }
};
