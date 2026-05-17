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
  
  // Social Media Integrations
  instagram_linked?: boolean;
  instagram_token?: string | null;
  tiktok_linked?: boolean;
  tiktok_token?: string | null;
  youtube_linked?: boolean;
  youtube_token?: string | null;
  visual_style?: string | null;
}


export const profileService = {
  /**
   * Ensures the current user has a profile record in the database.
   * If not authenticated, attempts to sign in anonymously.
   */
  async ensureProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const stableNum = parseInt(user.id.slice(0, 4), 16) % 10000;
    const defaultName = `Media Creator #${stableNum}`;
    const googleName = user.user_metadata?.full_name;
    const googleAvatar = user.user_metadata?.avatar_url;

    if (error && error.code === 'PGRST116') {
      // Profile missing, create it
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            email: user.email || `anon_${user.id}@viral.engine`,
            full_name: googleName || defaultName,
            avatar_url: googleAvatar || null,
            credits_balance: 100, // Starting credits
            tier: 'free',
            subscription_status: 'active'
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return null;
      }
      return newProfile;
    }

    if (error) {
      console.error('Error ensuring profile:', error);
      return null;
    }

    // Dynamic sync/back-fill for existing profiles
    let needsUpdate = false;
    const updates: Partial<Profile> = {};

    // If profile has generic "Creator" or is missing a full name, update it
    if (!profile.full_name || profile.full_name === 'Creator') {
      updates.full_name = googleName || defaultName;
      needsUpdate = true;
    }
    // If profile is missing avatar URL but Google has one, sync it
    if (!profile.avatar_url && googleAvatar) {
      updates.avatar_url = googleAvatar;
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      
      if (!updateError && updatedProfile) {
        return updatedProfile;
      }
    }

    return profile;
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
