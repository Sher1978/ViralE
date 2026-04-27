import { supabase } from '../supabase';

export interface AccessStatus {
  hasAccess: boolean;
  status: 'no_access' | 'trial' | 'active';
  trialExpiresAt: string | null;
}

// --- CLIENT-SAFE SERVICE IMPLEMENTATION ---
// Only methods that don't use node:fs or node:path

export const strategistService = {
  async getAccessStatus(userId: string): Promise<AccessStatus> {
    const { data, error } = await supabase
      .from('feature_access')
      .select('trial_started_at, is_subscribed')
      .eq('user_id', userId)
      .eq('feature_id', 'strategist_pilot')
      .single();

    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') throw error;

    if (data?.is_subscribed) {
      return { hasAccess: true, status: 'active', trialExpiresAt: null };
    }

    if (data?.trial_started_at) {
      const trialStart = new Date(data.trial_started_at);
      const now = new Date();
      const expiresAt = new Date(trialStart.getTime() + 24 * 60 * 60 * 1000);
      if (now < expiresAt) {
        return { hasAccess: true, status: 'trial', trialExpiresAt: expiresAt.toISOString() };
      }
    }
    return { hasAccess: false, status: 'no_access', trialExpiresAt: null };
  },

  async activateTrial(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('feature_access')
      .upsert({
        user_id: userId,
        feature_id: 'strategist_pilot',
        trial_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    return !error;
  }
};
