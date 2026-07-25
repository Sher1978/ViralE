import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { isSuperAdmin, isUserAdminByAuth, getAdminOverviewStats } from '@/lib/admin';

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
      return NextResponse.json({ error: 'Forbidden: SuperAdmin access required' }, { status: 403 });
    }

    const stats = await getAdminOverviewStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('[AdminStats API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
