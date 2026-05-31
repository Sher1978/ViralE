import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    let user;
    try {
      const authCtx = await getAuthContext();
      user = authCtx.user;
    } catch (authErr) {
      console.warn('[Promo API] Auth context failed:', authErr);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid promo code format' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Fetch promo code from DB
    const { data: promo, error: fetchErr } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    if (fetchErr || !promo) {
      return NextResponse.json({ error: 'Promo code not found or invalid' }, { status: 404 });
    }

    if (promo.is_used) {
      return NextResponse.json({ error: 'Promo code has already been redeemed' }, { status: 400 });
    }

    // 2. Fetch user profile to calculate new credits balance
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('credits_balance, tier')
      .eq('id', user.id)
      .maybeSingle();

    if (profErr || !profile) {
      return NextResponse.json({ error: 'Failed to retrieve user profile' }, { status: 500 });
    }

    const newBalance = (profile.credits_balance || 0) + (promo.credits_bonus || 0);

    // 3. Update the user profile (tier and credits)
    const { error: updateProfErr } = await supabaseAdmin
      .from('profiles')
      .update({
        tier: promo.tier || profile.tier || 'free',
        credits_balance: newBalance,
        subscription_status: 'active'
      })
      .eq('id', user.id);

    if (updateProfErr) {
      console.error('[Promo API] Failed to update user profile:', updateProfErr);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // 4. Mark promo code as used
    const { error: updatePromoErr } = await supabaseAdmin
      .from('promo_codes')
      .update({
        is_used: true,
        used_by: user.id,
        used_at: new Date().toISOString()
      })
      .eq('id', promo.id);

    if (updatePromoErr) {
      console.error('[Promo API] Failed to mark promo code as used:', updatePromoErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Promo code applied successfully!',
      tier: promo.tier,
      creditsAdded: promo.credits_bonus,
      newBalance: newBalance
    });

  } catch (err: any) {
    console.error('[Promo API] Error handling promo code redemption:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
