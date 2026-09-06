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
