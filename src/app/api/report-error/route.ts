import { NextRequest, NextResponse } from 'next/server';
import { notifyAdminError } from '@/lib/telegram';
import { getAuthContext } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source, error, url, extra } = body;

    let userId: string | undefined = body.userId;
    let userEmail: string | undefined = body.userEmail;

    try {
      const auth = await getAuthContext();
      if (auth.user) {
        userId = auth.user.id;
        userEmail = auth.user.email || userEmail;
      }
    } catch (e) {
      // User might be unauthenticated or cookie token missing
    }

    if (error) {
      const errStr = typeof error === 'string' ? error : error?.message || String(error);
      const isNetworkErr = errStr.includes('Failed to fetch') || errStr.includes('NetworkError') || errStr.includes('Load failed') || errStr.includes('AbortError');
      const isAuthErr = errStr.includes('Unauthorized') || errStr.includes('401') || errStr.includes('User personality not found');
      
      if (!isNetworkErr && !isAuthErr) {
        await notifyAdminError({
          source: source || 'Client Session Error',
          error,
          userId,
          userEmail,
          url,
          extra,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Report Error API] Failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
