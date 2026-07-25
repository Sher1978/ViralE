import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    let user;
    try {
      const authCtx = await getAuthContext();
      user = authCtx.user;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Promo codes deactivated by SuperAdmin
    return NextResponse.json(
      { error: 'Активация промокодов временно отключена администратором.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[Promo API] Error handling promo code redemption:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
