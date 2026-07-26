import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

async function handleTelegramAuth(userData: any, hash: string) {
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

  const telegramId = userData.id.toString();
  const email = `tg_${telegramId}@telegram.local`;
  
  // Deterministic password based on service role key and telegram ID
  // Use a fallback for build time if needed, but it won't be called then
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'static_build_fallback';
  const password = crypto.createHmac('sha256', serviceRoleKey).update(telegramId).digest('hex');

  // 3. Upsert User
  let { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(telegramId).catch(() => ({ data: { user: null } }));
  
  if (!targetUser) {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    targetUser = users.find((u: any) => u.email === email) || null;
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
        username: userData.username
      }
    });
    if (createError) throw createError;
    targetUser = newUser;
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
        telegram_id: parseInt(telegramId),
        full_name: fullName,
        avatar_url: avatarUrl,
        username: userData.username
      })
      .eq('id', targetUser!.id);
    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: targetUser!.id,
        email,
        telegram_id: parseInt(telegramId),
        full_name: fullName,
        avatar_url: avatarUrl,
        username: userData.username,
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
    return NextResponse.json(result);
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
