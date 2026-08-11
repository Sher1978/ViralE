import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { getLateDevConnectedAccounts } from '@/lib/services/socialPostingService';

export async function GET() {
  try {
    const { user, supabase: authSupabase } = await getAuthContext();
    if (!user) {
      return NextResponse.json({ connectedPlatforms: [], accounts: [] });
    }

    const { data: profile } = await authSupabase
      .from('profiles')
      .select('latedev_api_key, user_api_keys')
      .eq('id', user.id)
      .single();

    const userApiKeys = profile?.user_api_keys as Record<string, any> || {};
    const userLateDevKey = profile?.latedev_api_key || userApiKeys.latedev || undefined;

    const result = await getLateDevConnectedAccounts(userLateDevKey);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /api/social/accounts Error]:', err);
    return NextResponse.json({ connectedPlatforms: [], accounts: [], error: err.message });
  }
}
