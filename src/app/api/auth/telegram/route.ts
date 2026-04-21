import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { hash, ...userData } = data;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Telegram Bot Token not configured' }, { status: 500 });
    }

    // 1. Verify Telegram Data
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const dataCheckString = Object.keys(userData)
      .sort()
      .map(key => `${key}=${userData[key]}`)
      .join('\n');
    
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (hmac !== hash) {
      return NextResponse.json({ error: 'Invalid hash' }, { status: 401 });
    }

    // 2. Initialize Supabase Admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase Service Role Key missing' }, { status: 500 });
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
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(telegramId).catch(() => ({ data: { user: null }, error: null }));
    
    let targetUser = user;

    if (!targetUser) {
      // Check by email in case metadata wasn't set or ID differs
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
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

    // 4. Create Session (Sign in on server to get JWT)
    const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !sessionData.session) {
      throw signInError || new Error('Failed to create session');
    }

    // 5. Set Cookies (Standard Supabase Auth)
    // We can return the session to the client and let the client call setSession
    // This is safer and correctly updates the client store.
    
    return NextResponse.json({ 
      session: sessionData.session,
      user: targetUser
    });

  } catch (error: any) {
    console.error('Telegram Auth Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
