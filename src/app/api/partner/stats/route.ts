import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateReferralCode } from '@/lib/services/profileService';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { user } = await getAuthContext();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch user profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, referral_code, partner_balance_usd, tier, subscription_status')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let referralCode = profile.referral_code;
    if (!referralCode) {
      referralCode = generateReferralCode(user.id);
      await supabaseAdmin
        .from('profiles')
        .update({ referral_code: referralCode })
        .eq('id', user.id);
    }

    // 2. Count referred users
    const { count: totalReferredCount } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by_id', user.id);

    // 3. Fetch earnings history
    const { data: earningsData } = await supabaseAdmin
      .from('referral_earnings')
      .select('*')
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false });

    const earningsHistory = earningsData || [];
    const totalEarnedUsd = earningsHistory.reduce((sum: number, item: any) => sum + Number(item.earned_amount_usd || 0), 0);

    // 4. Fetch payout requests history
    const { data: payoutData } = await supabaseAdmin
      .from('payout_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const payoutHistory = payoutData || [];

    // 5. Eligibility checks
    const partnerBalanceUsd = Number(profile.partner_balance_usd || 0);
    const hasPaidPackage = profile.tier === 'creator' || profile.tier === 'pro' || profile.tier === 'starter' || profile.tier === 'scale';
    const withdrawalEligible = partnerBalanceUsd >= 100 && hasPaidPackage;

    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'ViralE_bot';

    return NextResponse.json({
      referralCode,
      referralUrl: `https://www.virale.uno/?ref=${referralCode}`,
      totalReferredCount: totalReferredCount || 0,
      totalEarnedUsd: Math.round(totalEarnedUsd * 100) / 100,
      partnerBalanceUsd: Math.round(partnerBalanceUsd * 100) / 100,
      hasPaidPackage,
      userTier: profile.tier || 'free',
      withdrawalEligible,
      minWithdrawalAmount: 100,
      botUsername,
      earningsHistory,
      payoutHistory,
    });

  } catch (error: any) {
    console.error('[Partner Stats API] Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
