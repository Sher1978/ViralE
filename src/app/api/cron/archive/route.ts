import { NextRequest, NextResponse } from 'next/server';
import { archiveService } from '@/lib/services/archiveService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Basic security: Check for Cron header (standard for Vercel/GitHub Actions)
  // Or check for a custom secret if configured
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}` || isVercelCron;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await archiveService.runArchivalProcess();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[CronArchive] process failed:', error);
    return NextResponse.json({ error: 'Archival process failed' }, { status: 500 });
  }
}
