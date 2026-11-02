import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { isTelegramIdBlocked } from '@/lib/blockedUsers';

async function handleTelegramAuth(userData: any, hash: string) {
  const telegramId = userData?.id?.toString();
  if (isTelegramIdBlocked(telegramId)) {
    throw new Error('This account is blocked from accessing the system.');
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('Telegram Bot Token not configured');
  }

  // 1. Verify Telegram Data
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const dataCheckString = Object.keys(userData)
    .filter(key => key !== 'hash' && userData[key] !== undefined && userData[key] !== 'undefined' && userData[key] !== null)
    .sort()
    .map(key => `${key}=${userData[key]}`)
    .join('\n');
  
  let hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (hmac !== hash) {
    // Fallback: check raw dataCheckString including potential 'undefined' strings from legacy links
    const legacyCheckString = Object.keys(userData)
      .sort()
      .map(key => `${key}=${userData[key]}`)
      .join('\n');
    const legacyHmac = crypto.createHmac('sha256', secretKey).update(legacyCheckString).digest('hex');
    if (legacyHmac === hash) {
      hmac = legacyHmac;
    }
  }

  if (hmac !== hash) {
    throw new Error('Invalid hash');
  }

  const email = `tg_${telegramId}@telegram.local`;
  
  // Deterministic password based on service role key and telegram ID
  // Use a fallback for build time if needed, but it won't be called then
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'static_build_fallback';
  const password = crypto.createHmac('sha256', serviceRoleKey).update(telegramId).digest('hex');

  // 3. Upsert User
  let targetUser: any = null;

  // First check if profile exists with this telegram_id or email
  const { data: existingProfileData } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .or(`telegram_id.eq.${telegramId},email.eq.${email}`)
    .maybeSingle();

  if (existingProfileData?.id) {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(existingProfileData.id).catch(() => ({ data: { user: null } }));
    targetUser = user;
  }

  if (!targetUser) {
    // Fallback: paginate through auth users list in case profile is missing or unlinked
    for (let page = 1; page <= 10; page++) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 }).catch(() => ({ data: { users: [] } }));
      if (!users || users.length === 0) break;
      const found = users.find((u: any) => u.email === email || String(u.user_metadata?.telegram_id) === String(telegramId));
      if (found) {
        targetUser = found;
        break;
      }
      if (users.length < 1000) break;
    }
  }

  let isNewUser = false;
  if (!targetUser) {
    const { data: { user: newUser }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        telegram_id: telegramId,
        full_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
        avatar_url: userData.photo_url,
      }
    });
    if (createError) throw createError;
    targetUser = newUser;
    isNewUser = true;
  } else {
    // Ensure password matches current HMAC secret key for existing users
    await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { password, email_confirm: true }).catch((err: any) => {
      console.warn('[Telegram Auth] Could not update password for existing user:', err);
    });
  }

  // 4. Create Session using an isolated ephemeral client so we NEVER overwrite supabaseAdmin's service_role session
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  const { data: sessionData, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !sessionData.session) {
    throw signInError || new Error('Failed to create session');
  }

  // 5. Upsert Profile with telegram_id using only real columns of public.profiles
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', targetUser!.id)
    .maybeSingle();

  const rawOnboarding = (existingProfile?.raw_onboarding_data as Record<string, any>) || {};
  const fullName = existingProfile?.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Telegram Creator';
  const avatarUrl = rawOnboarding.avatar_url || userData.photo_url || null;
  const isNewProfile = !existingProfile || (!existingProfile.email && !existingProfile.telegram_id);

  const currentBalance = existingProfile ? (existingProfile.credits_balance ?? 0) : 100;
  const shouldGrantWelcome = !existingProfile || ((existingProfile.tier === 'free' || existingProfile.tier === 'null' || !existingProfile.tier) && currentBalance === 0 && !rawOnboarding.welcome_credits_granted);
  const nextBalance = shouldGrantWelcome ? 100 : currentBalance;
  const cleanTier = (!existingProfile?.tier || existingProfile.tier === 'null') ? 'free' : existingProfile.tier;

  const { error: upsertError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: targetUser!.id,
      email: existingProfile?.email && !existingProfile.email.includes('@telegram.local') ? existingProfile.email : email,
      telegram_id: String(telegramId),
      full_name: fullName,
      credits_balance: nextBalance,
      tier: cleanTier,
      subscription_status: existingProfile?.subscription_status || 'active',
      preferred_language: existingProfile?.preferred_language || 'ru',
      raw_onboarding_data: {
        ...rawOnboarding,
        avatar_url: avatarUrl,
        telegram_username: userData.username ? `@${userData.username}` : (rawOnboarding.telegram_username || null),
        welcome_credits_granted: true
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (upsertError) {
    console.error('[Telegram Auth] Profile upsert warning:', upsertError);
  }

  // 6. Notify SuperAdmin on New Telegram Registration
  if (isNewUser || isNewProfile) {
    try {
      const { notifyNewUserRegistration } = await import('@/lib/telegram');
      notifyNewUserRegistration({
        id: targetUser!.id,
        email: email.includes('@telegram.local') ? undefined : email,
        full_name: fullName,
        avatar_url: avatarUrl,
        telegram_id: String(telegramId),
        telegram_username: userData.username ? `@${userData.username}` : undefined,
        auth_provider: 'Telegram Login',
        tier: cleanTier,
        credits_balance: nextBalance,
        preferred_language: 'ru',
        created_at: targetUser.created_at || new Date().toISOString()
      }).catch(err => console.error('[Telegram Auth] Failed to notify registration:', err));
    } catch (e) {
      console.error('[Telegram Auth] Notification error:', e);
    }
  }

  return { session: sessionData.session, user: targetUser };
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { hash, ...userData } = data;
    const result = await handleTelegramAuth(userData, hash);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectRef = supabaseUrl.split('.')[0].split('//')[1] || '';
    const cookieName = projectRef ? `sb-${projectRef}-auth-token` : '';

    const response = NextResponse.json(result);
    if (cookieName && result.session?.access_token) {
      response.cookies.set(cookieName, result.session.access_token, {
        maxAge: 604800,
        path: '/',
        sameSite: 'lax',
        httpOnly: false,
      });
    }
    return response;
  } catch (error: any) {
    console.error('Telegram POST Auth Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 400 });
  }
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get('hash');
  if (!hash) return NextResponse.redirect(new URL('/auth', request.url));

  // Build the callback URL with all parameters
  const callbackUrl = new URL(request.url);
  
  // Detect locale from cookie or path, defaulting to en
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const pathParts = new URL(request.url).pathname.split('/');
  const pathLocale = pathParts.find(p => p === 'ru' || p === 'en');
  const locale = cookieLocale === 'ru' ? 'ru' : (pathLocale || 'en');
  
  callbackUrl.pathname = locale === 'ru' ? '/ru/auth/telegram/callback' : '/auth/telegram/callback';
  
  return NextResponse.redirect(callbackUrl);
}
