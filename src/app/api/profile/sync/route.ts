import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyNewUserRegistration } from '@/lib/telegram';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const authCtx = await getAuthContext().catch(() => null);
    if (!authCtx || !authCtx.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authCtx.user;
    const cookieStore = await cookies();

    const googleName = user.user_metadata?.full_name || user.user_metadata?.name || null;
    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    const userEmail = user.email || null;

    // Check for referral inviter from cookie
    const refCookie = cookieStore.get('viral_ref_code')?.value;
    const inviterCode = refCookie ? refCookie.trim().toLowerCase() : null;

    // Check existing profile in DB
    const { data: existingProf } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const isNewlyCreated =
      !existingProf ||
      (existingProf.created_at &&
        Date.now() - new Date(existingProf.created_at).getTime() < 30 * 60 * 1000) ||
      (user.created_at &&
        Date.now() - new Date(user.created_at).getTime() < 30 * 60 * 1000);

    let activeProfile = existingProf;

    if (!existingProf) {
      const cleanId = user.id.replace(/-/g, '');
      const referralCode = `ref_${cleanId.slice(0, 4).toLowerCase()}${cleanId.slice(-4).toLowerCase()}`;
      const newProfileData = {
        id: user.id,
        email: userEmail,
        full_name: googleName || `Media Creator #${parseInt(user.id.slice(0, 4), 16) % 10000}`,
        credits_balance: 100,
        tier: 'free',
        subscription_status: 'active',
        preferred_language: 'ru',
        raw_onboarding_data: {
          registration_notified: false,
          welcome_credits_granted: true,
          avatar_url: googleAvatar,
          referral_code: referralCode,
          referred_by_code: inviterCode,
        },
      };

      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('profiles')
        .insert(newProfileData)
        .select('*')
        .single();

      if (!insErr && inserted) {
        activeProfile = inserted;
      }

      await notifyNewUserRegistration({
        ...newProfileData,
        avatar_url: googleAvatar,
        referral_code: referralCode,
        auth_provider: user.app_metadata?.provider || 'Google / Web OAuth',
        created_at: user.created_at,
      }).catch(err => console.error('[ProfileSync API] Error notifying registration:', err));
    } else {
      const updates: Record<string, any> = {};
      const rawOnboarding = (existingProf.raw_onboarding_data as Record<string, any>) || {};
      let rawChanged = false;
      const nextRaw = { ...rawOnboarding };

      if (userEmail && (!existingProf.email || existingProf.email.includes('anon_'))) {
        updates.email = userEmail;
      }
      if (googleName && (!existingProf.full_name || existingProf.full_name === 'Creator')) {
        updates.full_name = googleName;
      }
      if (!existingProf.tier || existingProf.tier === 'null') {
        updates.tier = 'free';
      }
      if (googleAvatar && !nextRaw.avatar_url) {
        nextRaw.avatar_url = googleAvatar;
        rawChanged = true;
      }
      if (inviterCode && !nextRaw.referred_by_code) {
        nextRaw.referred_by_code = inviterCode;
        rawChanged = true;
      }
      // Grant 100 welcome credits once to existing Free users who were initialized with 0
      if ((existingProf.tier === 'free' || existingProf.tier === 'null' || !existingProf.tier) && (existingProf.credits_balance || 0) === 0 && !nextRaw.welcome_credits_granted) {
        updates.credits_balance = 100;
        nextRaw.welcome_credits_granted = true;
        rawChanged = true;
      }
      if (rawChanged) {
        updates.raw_onboarding_data = nextRaw;
      }

      if (Object.keys(updates).length > 0) {
        const { data: updated } = await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select('*')
          .single();
        if (updated) {
          activeProfile = updated;
        }
      }

      if (isNewlyCreated && !existingProf.raw_onboarding_data?.registration_notified) {
        await notifyNewUserRegistration({
          ...existingProf,
          ...updates,
          auth_provider: user.app_metadata?.provider || 'Google / Web OAuth',
          created_at: user.created_at || existingProf.created_at,
        }).catch(err => console.error('[ProfileSync API] Error notifying registration:', err));
      }
    }

    return NextResponse.json({ success: true, profile: activeProfile });
  } catch (err: any) {
    console.error('[ProfileSync API] Server exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
