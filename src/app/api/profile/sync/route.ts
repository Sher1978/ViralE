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
    let inviterId: string | null = null;
    if (refCookie) {
      const { data: inviter } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('referral_code', refCookie.trim().toLowerCase())
        .maybeSingle();
      if (inviter && inviter.id !== user.id) {
        inviterId = inviter.id;
      }
    }

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
        avatar_url: googleAvatar,
        credits_balance: 0,
        tier: 'free',
        subscription_status: 'active',
        preferred_language: 'ru',
        referral_code: referralCode,
        referred_by_id: inviterId,
        raw_onboarding_data: { registration_notified: false },
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
        auth_provider: user.app_metadata?.provider || 'Google / Web OAuth',
        created_at: user.created_at,
      }).catch(err => console.error('[ProfileSync API] Error notifying registration:', err));
    } else {
      const updates: Record<string, any> = {};
      if (userEmail && (!existingProf.email || existingProf.email.includes('anon_'))) {
        updates.email = userEmail;
      }
      if (googleName && (!existingProf.full_name || existingProf.full_name === 'Creator')) {
        updates.full_name = googleName;
      }
      if (googleAvatar && !existingProf.avatar_url) {
        updates.avatar_url = googleAvatar;
      }
      if (inviterId && !existingProf.referred_by_id) {
        updates.referred_by_id = inviterId;
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
