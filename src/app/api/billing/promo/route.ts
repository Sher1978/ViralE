import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { addCredits } from '@/lib/credits';

export async function POST(req: NextRequest) {
  try {
    let user;
    try {
      const authCtx = await getAuthContext();
      user = authCtx.user;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawCode = body.code;

    if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
      return NextResponse.json({ error: 'Пожалуйста, введите промокод.' }, { status: 400 });
    }

    const cleanCode = rawCode.trim().toUpperCase();

    // 1. Find promo code in database
    const { data: promo, error: fetchError } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .ilike('code', cleanCode)
      .maybeSingle();

    if (fetchError || !promo) {
      return NextResponse.json(
        { error: 'Промокод не найден или введен неверно.' },
        { status: 400 }
      );
    }

    // 2. Check if user has already redeemed this specific promo code
    const { data: existingRedemptions } = await supabaseAdmin
      .from('credits_transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('transaction_type', 'PROMO_REDEEM')
      .filter('metadata->>code', 'ilike', cleanCode);

    if (existingRedemptions && existingRedemptions.length > 0) {
      return NextResponse.json(
        { error: 'Вы уже активировали этот промокод на вашем аккаунте.' },
        { status: 400 }
      );
    }

    // 3. For single-use promo codes, check if it's already used by someone else
    if (promo.is_used && promo.used_by && promo.used_by !== user.id) {
      return NextResponse.json(
        { error: 'Данный промокод уже был активирован ранее.' },
        { status: 400 }
      );
    }

    // 4. Grant tier benefits if applicable (e.g. scale, pro, creator)
    let tierUpdated = false;
    if (promo.tier && promo.tier !== 'free') {
      const nonExpiringDate = new Date('2099-12-31T23:59:59.999Z').toISOString();
      const { error: tierError } = await supabaseAdmin
        .from('profiles')
        .update({
          tier: promo.tier,
          subscription_status: 'active',
          subscription_expires_at: nonExpiringDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (tierError) {
        console.error('[Promo API] Failed to update user tier:', tierError);
      } else {
        tierUpdated = true;
      }
    }

    // 5. Grant bonus credits if applicable
    const creditsGranted = promo.credits_bonus || 0;
    if (creditsGranted > 0) {
      await addCredits(supabaseAdmin, user.id, creditsGranted, 'PROMO_REDEEM', {
        code: promo.code,
        promo_id: promo.id,
        tier: promo.tier,
        user_email: user.email,
        redeemed_at: new Date().toISOString()
      });
    } else if (!tierUpdated) {
      // If no credits and tier was free, still log redemption in credits_transactions
      await supabaseAdmin.from('credits_transactions').insert({
        user_id: user.id,
        amount: 0,
        transaction_type: 'PROMO_REDEEM',
        metadata: {
          code: promo.code,
          promo_id: promo.id,
          tier: promo.tier,
          user_email: user.email,
          redeemed_at: new Date().toISOString()
        }
      });
    }

    // 6. Mark as used ONLY if it's not a multi-use team promo code (used_by was specifically targeted or single-use)
    // Multi-use codes keep is_used = false so other team members can redeem them
    const isMultiUse = !promo.used_by && promo.code.startsWith('SCALE-') || promo.code.startsWith('TEAM-') || promo.code.startsWith('VIRAL-') || promo.code.includes('MULTI');
    if (!isMultiUse) {
      await supabaseAdmin
        .from('promo_codes')
        .update({
          is_used: true,
          used_by: user.id,
          used_at: new Date().toISOString()
        })
        .eq('id', promo.id);
    } else {
      // For multi-use, update used_at to record recent activity without locking code
      await supabaseAdmin
        .from('promo_codes')
        .update({
          used_at: new Date().toISOString()
        })
        .eq('id', promo.id);
    }

    // 7. Compose success message
    const msgParts: string[] = [];
    if (tierUpdated) {
      msgParts.push(`Активирован пакет ${promo.tier.toUpperCase()}`);
    }
    if (creditsGranted > 0) {
      msgParts.push(`начислено ${creditsGranted.toLocaleString()} кредитов`);
    }

    const finalMsg = msgParts.length > 0
      ? `Промокод ${promo.code} успешно активирован! (${msgParts.join(', ')})`
      : `Промокод ${promo.code} успешно активирован!`;

    return NextResponse.json({
      success: true,
      message: finalMsg,
      code: promo.code,
      tier: promo.tier,
      credits_granted: creditsGranted
    });
  } catch (err: any) {
    console.error('[Promo API] Error handling promo code redemption:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
