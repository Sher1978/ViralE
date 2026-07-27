import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { isUserAdminByAuth } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    let user;
    try {
      const authCtx = await getAuthContext();
      user = authCtx.user;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user || !(await isUserAdminByAuth(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Fetch all promo codes
    const { data: promoCodes, error: promoErr } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (promoErr) {
      throw promoErr;
    }

    // 2. Fetch redemption history from credits_transactions
    const { data: redemptions, error: redErr } = await supabaseAdmin
      .from('credits_transactions')
      .select('id, user_id, amount, transaction_type, metadata, created_at, profiles(email, full_name, telegram_id, avatar_url)')
      .eq('transaction_type', 'PROMO_REDEEM')
      .order('created_at', { ascending: false })
      .limit(100);

    if (redErr) {
      console.warn('[Admin Promos] Error fetching redemptions:', redErr);
    }

    return NextResponse.json({
      promoCodes: promoCodes || [],
      redemptions: redemptions || []
    });
  } catch (err: any) {
    console.error('[Admin Promos GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let user;
    try {
      const authCtx = await getAuthContext();
      user = authCtx.user;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user || !(await isUserAdminByAuth(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { code, tier, credits_bonus } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'Укажите код промокода.' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check if code already exists
    const { data: existing } = await supabaseAdmin
      .from('promo_codes')
      .select('id')
      .ilike('code', cleanCode)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: `Промокод "${cleanCode}" уже существует.` }, { status: 400 });
    }

    const newPromo = {
      code: cleanCode,
      tier: tier && tier !== 'none' ? tier : 'free',
      credits_bonus: Math.max(0, parseInt(credits_bonus || '0', 10)),
      is_used: false,
      used_by: null
    };

    const { data: created, error: createErr } = await supabaseAdmin
      .from('promo_codes')
      .insert([newPromo])
      .select()
      .single();

    if (createErr) throw createErr;

    return NextResponse.json({
      success: true,
      message: `Промокод ${cleanCode} успешно создан!`,
      promo: created
    });
  } catch (err: any) {
    console.error('[Admin Promos POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
