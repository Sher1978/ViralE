import { supabase } from '../supabase';
import { notifyNewUserRegistration } from '../telegram';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  telegram_id?: string | number | null;
  credits_balance: number;
  digital_shadow_prompt: string | null;
  industry_context: string | null;
  onboarding_completed: boolean;
  synthetic_training_data?: string;
  knowledge_base_json?: any;
  tier: 'free' | 'creator' | 'pro';
  subscription_status: string;
  subscription_expires_at: string | null;
  heygen_api_key?: string | null;
  anthropic_api_key?: string | null;
  elevenlabs_api_key?: string | null;
  groq_api_key?: string | null;
  
  // Referral System Fields
  referral_code?: string | null;
  referred_by_id?: string | null;
  partner_balance_usd?: number;

  // Social Media Integrations
  instagram_linked?: boolean;
  instagram_token?: string | null;
  tiktok_linked?: boolean;
  tiktok_token?: string | null;
  youtube_linked?: boolean;
  youtube_token?: string | null;
  visual_style?: string | null;
  preferred_language?: string | null;
}

export function generateReferralCode(userId: string): string {
  const cleanId = userId.replace(/-/g, '');
  const prefix = cleanId.slice(0, 4).toLowerCase();
  const suffix = cleanId.slice(-4).toLowerCase();
  return `ref_${prefix}${suffix}`;
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
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name;
    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.user_metadata?.photo_url;
    const userRefCode = generateReferralCode(user.id);

    if (error && error.code === 'PGRST116') {
      // Check for inviter from viral_ref_code cookie
      let inviterId: string | null = null;
      try {
        const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
        const cookieStr: string = globalObj && globalObj.document ? globalObj.document.cookie : '';
        if (cookieStr) {
          const cookies = cookieStr.split('; ');
          const refCookie = cookies.find((c: string) => c.startsWith('viral_ref_code='));
          if (refCookie) {
            const code = refCookie.split('=')[1]?.trim();
            if (code) {
              const { data: inviter } = await supabase
                .from('profiles')
                .select('id')
                .eq('referral_code', code)
                .single();
              if (inviter && inviter.id !== user.id) {
                inviterId = inviter.id;
              }
            }
          }
        }
      } catch (e) {
        console.warn('[ProfileService] Failed to resolve inviter from cookie:', e);
      }

      // Profile missing, create it
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            email: user.email || `anon_${user.id}@viral.engine`,
            full_name: googleName || defaultName,
            avatar_url: googleAvatar || null,
            credits_balance: 0, // Starting credits set to 0
            tier: 'free',
            subscription_status: 'active',
            preferred_language: 'ru',
            digital_shadow_prompt: null,
            industry_context: null,
            onboarding_completed: false
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return null;
      }
      if (newProfile) {
        notifyNewUserRegistration(newProfile).catch(() => {});
      }
      return newProfile;
    }

    if (error) {
      console.error('Error ensuring profile:', error);
      return null;
    }

    // Dynamic sync/back-fill for existing profiles missing email, referral_code, avatar, or telegram_id
    let needsUpdate = false;
    const updates: Partial<Profile> = {};

    if (user.email && (!profile.email || profile.email.includes('anon_') || profile.email !== user.email)) {
      updates.email = user.email;
      needsUpdate = true;
    }

    if (user.user_metadata?.telegram_id && !profile.telegram_id) {
      updates.telegram_id = String(user.user_metadata.telegram_id);
      needsUpdate = true;
    }

    if (!profile.referral_code) {
      updates.referral_code = userRefCode;
      needsUpdate = true;
    }

    // If profile has generic "Creator" or is missing a full name, update it
    if (!profile.full_name || profile.full_name === 'Creator') {
      updates.full_name = googleName || defaultName;
      needsUpdate = true;
    }
    // If profile is missing avatar URL but Google/Telegram has one, sync it
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
        notifyNewUserRegistration(updatedProfile).catch(() => {});
        return updatedProfile;
      }
    }

    if (profile) {
      notifyNewUserRegistration(profile).catch(() => {});
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
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) return true;
    } catch (apiErr) {
      console.warn('[ProfileService] API update failed, falling back to direct DB update:', apiErr);
    }

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
  
  async getActiveBrandContext(userId: string, customClient?: any): Promise<{
    brandContext: string;
    isStoryBrandActive: boolean;
    projectCount: number;
  }> {
    const client = customClient || supabase;
    try {
      const { count, error } = await client
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      const projectCount = count || 0;

      const { data: profile, error: profError } = await client
        .from('profiles')
        .select('digital_shadow_prompt, storybrand_raw_content')
        .eq('id', userId)
        .single();

      // Catch error dynamically if storybrand_raw_content doesn't exist yet
      if (profError) throw profError;

      const baseDna = profile?.digital_shadow_prompt || "";

      if (profile?.storybrand_raw_content) {
        return {
          brandContext: profile.storybrand_raw_content,
          isStoryBrandActive: true,
          projectCount
        };
      }

      return {
        brandContext: baseDna,
        isStoryBrandActive: false,
        projectCount
      };
    } catch (err) {
      console.warn('[ProfileService] StoryBrand columns missing or query failed, falling back to base DNA:', err);
      try {
        const { data: profile } = await client
          .from('profiles')
          .select('digital_shadow_prompt')
          .eq('id', userId)
          .single();
        return {
          brandContext: profile?.digital_shadow_prompt || "",
          isStoryBrandActive: false,
          projectCount: 0
        };
      } catch (fallbackErr) {
        return {
          brandContext: "",
          isStoryBrandActive: false,
          projectCount: 0
        };
      }
    }
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
