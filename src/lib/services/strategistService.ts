import { supabase } from '../supabase';

export interface AccessStatus {
  hasAccess: boolean;
  status: 'no_access' | 'trial' | 'active';
  trialExpiresAt: string | null;
}

// --- CLIENT-SAFE SERVICE IMPLEMENTATION ---
// Only methods that don't use node:fs or node:path

export const strategistService = {
  async getAccessStatus(userId: string, client?: any): Promise<AccessStatus> {
    const db = client || supabase;
    try {
      const { data: profile } = await db
        .from('profiles')
        .select('tier, subscription_status, credits_balance')
        .eq('id', userId)
        .single();

      if (profile) {
        const isPaidTier = (
          profile.tier === 'pro' || 
          profile.tier === 'scale' || 
          profile.tier === 'superadmin' || 
          (profile as any).role === 'superadmin'
        );
        if (isPaidTier && profile.subscription_status === 'active') {
          return { hasAccess: true, status: 'active', trialExpiresAt: null };
        }
        if ((profile.credits_balance || 0) >= 10) {
          return { hasAccess: true, status: 'trial', trialExpiresAt: null };
        }
      }

      const { data, error } = await db
        .from('feature_access')
        .select('trial_started_at, is_subscribed')
        .eq('user_id', userId)
        .eq('feature_id', 'strategist_pilot')
        .single();

      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') throw error;

      if (data?.is_subscribed) {
        return { hasAccess: true, status: 'active', trialExpiresAt: null };
      }

      // Free / Starter tiers have NO access to the AI Strategist unless explicitly subscribed
      return { hasAccess: false, status: 'no_access', trialExpiresAt: null };
    } catch (err) {
      console.error('[StrategistService] Access check failed:', err);
      return { hasAccess: false, status: 'no_access', trialExpiresAt: null };
    }
  },

  async activateTrial(userId: string, client?: any): Promise<boolean> {
    // Deprecated: automatic free trials for strategist are disabled
    return false;
  }
};
