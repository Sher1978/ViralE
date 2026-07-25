import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { isSuperAdmin, isUserAdminByAuth, getAdminUsersList } from '@/lib/admin';

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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const tier = searchParams.get('tier') || 'all';
    const status = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

    const data = await getAdminUsersList({
      page,
      limit,
      search,
      tier,
      status,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[AdminUsers API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
