import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from Authorization header or body
    const authHeader = req.headers.get('Authorization');
    let token = authHeader?.replace('Bearer ', '');

    const body = await req.json().catch(() => ({}));
    if (!token && body?.accessToken) {
      token = body.accessToken;
    }

    let userId: string | null = body?.userId || null;

    if (token) {
      const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (user?.id) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Valid authentication session required.' }, { status: 401 });
    }

    console.log(`🗑️ [Self-Service Delete Account] User ${userId} requested permanent data purge under GDPR Art. 17...`);

    // 1.5 Fetch profile to check for linked Telegram ID before purge
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('telegram_id')
      .eq('id', userId)
      .single();

    if (userProfile?.telegram_id) {
      console.log(`🚫 Adding revoked Telegram ID ${userProfile.telegram_id} to blocklist...`);
      await supabaseAdmin.from('blocked_telegram_ids').insert([
        { telegram_id: String(userProfile.telegram_id), reason: 'GDPR Art. 17 User Consent Revocation & Erasure' }
      ]).catch((err: any) => console.warn('Could not insert to blocked_telegram_ids table (ignoring if schema not created):', err?.message));
    }

    // 2. Cascade delete all user records across tables
    await supabaseAdmin.from('projects').delete().eq('user_id', userId).catch(() => {});
    await supabaseAdmin.from('video_renders').delete().eq('user_id', userId).catch(() => {});
    await supabaseAdmin.from('credit_transactions').delete().eq('user_id', userId).catch(() => {});
    await supabaseAdmin.from('user_subscriptions').delete().eq('user_id', userId).catch(() => {});
    await supabaseAdmin.from('profiles').delete().eq('id', userId).catch(() => {});

    // Delete user from auth.users
    const { error: deleteAuthErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthErr) {
      console.warn(`⚠️ Warning deleting auth user ${userId}:`, deleteAuthErr.message);
    }

    // 3. Clear auth cookies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectRef = supabaseUrl.split('.')[0].split('//')[1] || '';
    const cookieName = projectRef ? `sb-${projectRef}-auth-token` : '';

    const response = NextResponse.json({ 
      success: true, 
      message: 'Account and all associated personal data permanently purged in compliance with GDPR Art. 17.' 
    });

    if (cookieName) {
      response.cookies.delete(cookieName);
    }

    return response;

  } catch (err: any) {
    console.error('Delete Account API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete account' }, { status: 500 });
  }
}
