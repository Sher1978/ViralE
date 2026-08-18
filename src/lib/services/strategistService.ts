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
        .select('tier, subscription_status')
        .eq('id', userId)
        .single();

      if (profile) {
        const isPaidTier = profile.tier === 'pro' || profile.tier === 'scale' || profile.tier === 'creator';
        if (isPaidTier && profile.subscription_status === 'active') {
          return { hasAccess: true, status: 'active', trialExpiresAt: null };
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

      if (data?.trial_started_at) {
        const trialStart = new Date(data.trial_started_at);
        const now = new Date();
        const expiresAt = new Date(trialStart.getTime() + 24 * 60 * 60 * 1000);
        if (now < expiresAt) {
          return { hasAccess: true, status: 'trial', trialExpiresAt: expiresAt.toISOString() };
        }
      }
      return { hasAccess: false, status: 'no_access', trialExpiresAt: null };
    } catch (err) {
      console.error('[StrategistService] Access check failed:', err);
      return { hasAccess: false, status: 'no_access', trialExpiresAt: null };
    }
  },

  async activateTrial(userId: string, client?: any): Promise<boolean> {
    const db = client || supabase;
    const { error } = await db
      .from('feature_access')
      .upsert({
        user_id: userId,
        feature_id: 'strategist_pilot',
        trial_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (!error) return true;

    console.warn('[StrategistService] Standard trial activation failed, trying admin client fallback...', error);
    try {
      const { supabaseAdmin } = await import('../supabase');
      if (supabaseAdmin) {
        const { error: adminErr } = await supabaseAdmin
          .from('feature_access')
          .upsert({
            user_id: userId,
            feature_id: 'strategist_pilot',
            trial_started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        return !adminErr;
      }
    } catch (e) {
      console.error('[StrategistService] Admin fallback trial activation error:', e);
    }
    return false;
  }
};

