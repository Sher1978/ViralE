import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoringService';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-secret');
  const secret = process.env.ADMIN_SECRET || 'viral_internal_secret_2026';

  if (authHeader !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = await monitoringService.getFullSystemReport();
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
