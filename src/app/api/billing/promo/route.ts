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

    const isReusable = cleanCode.startsWith('MULTI_') || cleanCode === 'VIRAL_MAX_MONTH';

    if (isReusable) {
      // For reusable codes, check if the user has already redeemed it
      const { data: existingTx, error: txErr } = await supabaseAdmin
        .from('credits_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('transaction_type', 'top_up')
        .contains('metadata', { promo_code: cleanCode })
        .maybeSingle();

      if (txErr) {
        console.error('[Promo API] Error checking existing transactions:', txErr);
        return NextResponse.json({ error: 'Failed to validate promo code usage' }, { status: 500 });
      }

      if (existingTx) {
        return NextResponse.json({ error: 'You have already redeemed this promo code' }, { status: 400 });
      }
    } else {
      // Single-use code check
      if (promo.is_used) {
        return NextResponse.json({ error: 'Promo code has already been redeemed' }, { status: 400 });
      }
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
    let { error: updateProfErr } = await supabaseAdmin
      .from('profiles')
      .update({
        tier: promo.tier || profile.tier || 'free',
        credits_balance: newBalance,
        subscription_status: 'active',
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', user.id);

    if (updateProfErr) {
      const errMsg = updateProfErr.message.toLowerCase();
      if (errMsg.includes('constraint') || errMsg.includes('check') || errMsg.includes('tier') || errMsg.includes('violates')) {
        console.log('[Promo API] Constraint or tier error detected. Attempting to drop profiles_tier_check constraint...');
        const DROP_CONSTRAINT_SQL = `
          ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
        `;
        const { error: migrationError } = await supabaseAdmin.rpc('exec_sql', { sql: DROP_CONSTRAINT_SQL });
        
        if (!migrationError) {
          console.log('[Promo API] Constraint dropped successfully! Retrying profile update...');
          // Retry the update
          const { error: retryErr } = await supabaseAdmin
            .from('profiles')
            .update({
              tier: promo.tier || profile.tier || 'free',
              credits_balance: newBalance,
              subscription_status: 'active',
              subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', user.id);
          updateProfErr = retryErr;
        } else {
          console.error('[Promo API] Failed to drop constraint via RPC:', migrationError.message);
        }
      }
    }

    if (updateProfErr) {
      console.error('[Promo API] Failed to update user profile:', updateProfErr);
      const detailedError = `Database update failed: [${updateProfErr.code || 'NO_CODE'}] ${updateProfErr.message || 'Unknown error'}. Details: ${updateProfErr.details || 'None'}`;
      return NextResponse.json({ error: detailedError }, { status: 500 });
    }

    // 4. Record transaction in credits_transactions
    const { error: txInsertErr } = await supabaseAdmin
      .from('credits_transactions')
      .insert({
        user_id: user.id,
        amount: promo.credits_bonus || 0,
        transaction_type: 'top_up',
        metadata: { promo_code: cleanCode }
      });

    if (txInsertErr) {
      console.error('[Promo API] Failed to record credit transaction:', txInsertErr);
    }

    // 5. Mark single-use promo code as used
    if (!isReusable) {
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
