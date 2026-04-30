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
      return { provider: 'ElevenLabs', remaining: 0, unit: 'chars', status: 'critical' };
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
        status: percent < 10 ? 'critical' : percent < 25 ? 'warning' : 'ok'
      };
    } catch (err) {
      console.error('[Monitoring] ElevenLabs fetch failed:', err);
      return { provider: 'ElevenLabs', remaining: 'Error', unit: 'chars', status: 'critical' };
    }
  },

  /**
   * Estimates OpenAI usage based on internal logs (Credits Transactions)
   */
  async getOpenAIUsage(): Promise<ApiBalanceReport> {
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      // We check our credits_transactions table for AI-related costs
      const { data, error } = await supabase
        .from('credits_transactions')
        .select('amount')
        .eq('transaction_type', 'SCRIPT_GEN')
        .gte('created_at', firstDay);

      if (error || !data) throw error || new Error('No transaction data');

      const totalSpentCredits = data.reduce((acc: number, curr: any) => acc + Math.abs(curr.amount || 0), 0);
      
      return {
        provider: 'OpenAI (Monthly)',
        remaining: totalSpentCredits, // This is actually "spent" in our internal currency
        unit: 'credits',
        status: 'ok'
      };
    } catch (err) {
      return { provider: 'OpenAI', remaining: 'Error', unit: 'credits', status: 'critical' };
    }
  },

  /**
   * Aggregates all reports
   */
  async getFullSystemReport(): Promise<ApiBalanceReport[]> {
    const results = await Promise.all([
      this.getElevenLabsBalance(),
      this.getOpenAIUsage()
    ]);
    return results;
  }
};
