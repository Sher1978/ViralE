import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getLateDevConnectedAccounts } from '@/lib/services/socialPostingService';

export async function GET() {
  try {
    const { user } = await getAuthContext();
    if (!user) {
      return NextResponse.json({ connectedPlatforms: [], accounts: [] });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('latedev_api_key, user_api_keys, synthetic_training_data')
      .eq('id', user.id)
      .single();

    if (error) {
      console.warn('[API /api/social/accounts] Profile fetch error:', error.message);
    }

    const userApiKeys = profile?.user_api_keys as Record<string, any> || {};
    const syntheticData = profile?.synthetic_training_data as Record<string, any> || {};
    const userLateDevKey = syntheticData.latedev_api_key || profile?.latedev_api_key || userApiKeys.latedev || undefined;

    const result = await getLateDevConnectedAccounts(userLateDevKey);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /api/social/accounts Error]:', err);
    return NextResponse.json({ connectedPlatforms: [], accounts: [], error: err.message });
  }
}
