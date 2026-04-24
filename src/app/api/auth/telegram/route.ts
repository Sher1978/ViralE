import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

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

  // 2. Initialize Supabase Admin
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Supabase Service Role Key missing');
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const telegramId = userData.id.toString();
  const email = `tg_${telegramId}@telegram.local`;
  
  // Deterministic password based on service role key and telegram ID
  const password = crypto.createHmac('sha256', serviceRoleKey).update(telegramId).digest('hex');

  // 3. Upsert User
  let { data: { user: targetUser } } = await supabaseAdmin.auth.admin.getUserById(telegramId).catch(() => ({ data: { user: null } }));
  
  if (!targetUser) {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    targetUser = users.find(u => u.email === email) || null;
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
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash');
    if (!hash) throw new Error('Missing hash');

    const userData: any = {};
    searchParams.forEach((value, key) => {
      if (key !== 'hash') userData[key] = value;
    });

    const result = await handleTelegramAuth(userData, hash);

    // If it's a direct redirect from Telegram, we need to return a script that sets the session
    // Or redirect to a page that handles it.
    // For simplicity, we'll redirect to a client-side route that has the session in a hash or query
    // But since we have the session, we can just render a small HTML that calls supabase.auth.setSession
    
    const next = searchParams.get('next') || '/en/app/projects';
    
    return new NextResponse(
      `<html>
        <body>
          <script>
            localStorage.setItem('tg_session', '${JSON.stringify(result.session)}');
            window.location.href = '${next}';
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error: any) {
    console.error('Telegram GET Auth Error:', error);
    return NextResponse.redirect(new URL('/auth?error=telegram_failed', request.url));
  }
}
