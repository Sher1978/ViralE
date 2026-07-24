import { NextRequest, NextResponse } from 'next/server';
import { notifyAdminError } from '@/lib/telegram';
import { getAuthContext } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source, error, url, extra } = body;

    let userId: string | undefined;
    let userEmail: string | undefined;

    try {
      const auth = await getAuthContext();
      if (auth.user) {
        userId = auth.user.id;
        userEmail = auth.user.email;
      }
    } catch (e) {
      // User might be unauthenticated
    }

    if (error) {
      await notifyAdminError({
        source: source || 'Client Session Error',
        error,
        userId,
        userEmail,
        url,
        extra,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Report Error API] Failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
