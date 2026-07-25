import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { isSuperAdmin, isUserAdminByAuth, getAdminPaymentsLog } from '@/lib/admin';

export async function GET(req: NextRequest) {
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

    const isAdmin = isSuperAdmin(user) || (await isUserAdminByAuth(user.id));
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const payments = await getAdminPaymentsLog(limit);
    return NextResponse.json({ payments });
  } catch (error: any) {
    console.error('[AdminPayments API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
