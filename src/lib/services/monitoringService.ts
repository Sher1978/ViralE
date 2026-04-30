import { supabase } from '../supabase';

export interface ApiBalanceReport {
  provider: string;
  remaining: number | string;
  limit?: number | string;
  unit: string;
  status: 'ok' | 'warning' | 'critical';
}

export const monitoringService = {
  /**
   * Fetches ElevenLabs character balance
   */
  async getElevenLabsBalance(): Promise<ApiBalanceReport> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return { provider: 'ElevenLabs', remaining: 'Missing Key', unit: 'chars', status: 'critical' };
    }

    try {
      const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': apiKey }
      });
      if (!res.ok) throw new Error('ElevenLabs API failed');
      const data = await res.json();
      
      const remaining = data.character_limit - data.character_count;
      const percent = (remaining / data.character_limit) * 100;

      return {
        provider: 'ElevenLabs',
        remaining,
        limit: data.character_limit,
        unit: 'chars',
        status: percent < 15 ? 'critical' : percent < 30 ? 'warning' : 'ok'
      };
    } catch (err) {
      return { provider: 'ElevenLabs', remaining: 'Error', unit: 'chars', status: 'critical' };
    }
  },

  /**
   * Fetches HeyGen credits/quota
   */
  async getHeyGenBalance(): Promise<ApiBalanceReport> {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      return { provider: 'HeyGen', remaining: 'Missing Key', unit: 'credits', status: 'critical' };
    }

    try {
      // HeyGen V2 remaining quota endpoint
      const res = await fetch('https://api.heygen.com/v2/user/remaining_quota', {
        headers: { 'X-Api-Key': apiKey }
      });
      if (!res.ok) throw new Error('HeyGen API failed');
      const data = await res.json();
      
      const remaining = data.data?.remaining_quota || 0;

      return {
        provider: 'HeyGen',
        remaining,
        unit: 'credits',
        status: remaining < 5 ? 'critical' : remaining < 15 ? 'warning' : 'ok'
      };
    } catch (err) {
      return { provider: 'HeyGen', remaining: 'Error', unit: 'credits', status: 'critical' };
    }
  },

  /**
   * Higgsfield - Dashboard only (no public balance API found)
   */
  async getHiggsfieldBalance(): Promise<ApiBalanceReport> {
    const keyId = process.env.HIGGSFIELD_API_KEY_ID;
    if (!keyId) {
      return { provider: 'Higgsfield', remaining: 'Missing Key', unit: 'credits', status: 'critical' };
    }
    // Higgsfield current API (v1) doesn't expose a balance endpoint yet.
    return {
      provider: 'Higgsfield',
      remaining: 'Check Dashboard',
      unit: 'credits',
      status: 'ok'
    };
  },

  /**
   * Google Gemini - Usage tracking not possible via API key
   */
  async getGeminiBalance(): Promise<ApiBalanceReport> {
    return {
      provider: 'Google Gemini',
      remaining: 'Pay-as-you-go',
      unit: 'requests',
      status: 'ok'
    };
  },

  /**
   * Pexels - Rate limit monitoring
   */
  async getPexelsStatus(): Promise<ApiBalanceReport> {
    const apiKey = process.env.PEXELS_API_KEY;
    return {
      provider: 'Pexels',
      remaining: apiKey ? 'Active' : 'Missing',
      unit: 'status',
      status: apiKey ? 'ok' : 'critical'
    };
  }

  /**
   * Aggregates all reports
   */
  async getFullSystemReport(): Promise<ApiBalanceReport[]> {
    const results = await Promise.all([
      this.getElevenLabsBalance(),
      this.getHeyGenBalance(),
      this.getHiggsfieldBalance(),
      this.getGeminiBalance(),
      this.getPexelsStatus()
    ]);
    return results;
  }
};
