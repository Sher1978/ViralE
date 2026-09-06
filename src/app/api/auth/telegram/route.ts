import { NextResponse } from 'next/server';
import crypto from 'crypto';
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
    .sort()
    .map(key => `${key}=${userData[key]}`)
    .join('\n');
  
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

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
    .select('id, email, telegram_id, full_name, avatar_url')
    .or(`telegram_id.eq.${telegramId},email.eq.${email}`)
    .maybeSingle();

  if (existingProfileData?.id) {
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(existingProfileData.id).catch(() => ({ data: { user: null } }));
    targetUser = user;
  }

  if (!targetUser) {
    // Fallback: search auth users list in case profile is missing or delayed
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch(() => ({ data: { users: [] } }));
    targetUser = users?.find((u: any) => u.email === email) || null;
  }

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
  } else {
    // Ensure password matches current HMAC secret key for existing users
    await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { password, email_confirm: true }).catch((err: any) => {
      console.warn('[Telegram Auth] Could not update password for existing user:', err);
    });
  }

  // 4. Create Session
  const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !sessionData.session) {
    throw signInError || new Error('Failed to create session');
  }

  // 5. Update Profile with telegram_id (preserve user custom updates)
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', targetUser!.id)
    .single();

  const fullName = existingProfile?.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
  const avatarUrl = existingProfile?.avatar_url || userData.photo_url;

  if (existingProfile) {
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        telegram_id: String(telegramId),
        email,
        full_name: fullName,
        avatar_url: avatarUrl
      })
      .eq('id', targetUser!.id);
    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: targetUser!.id,
        email,
        telegram_id: String(telegramId),
        full_name: fullName,
        avatar_url: avatarUrl,
        credits_balance: 0,
        tier: 'free',
        subscription_status: 'active',
        preferred_language: 'ru'
      });
    if (insertError) throw insertError;
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
  
  callbackUrl.pathname = `/${locale}/auth/telegram/callback`;
  
  return NextResponse.redirect(callbackUrl);
}
