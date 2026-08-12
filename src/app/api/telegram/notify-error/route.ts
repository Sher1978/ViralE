import { NextRequest, NextResponse } from 'next/server';
import { notifyAdminError } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stage, stageIndex, error, projectId, userId, userEmail, extra } = body;

    if (!error) {
      return NextResponse.json({ error: 'Error payload missing' }, { status: 400 });
    }

    const sourceText = `Remotion Render Pipeline (Stage ${stageIndex || 'N/A'}: ${stage || 'Unknown'})`;
    const fullError = typeof error === 'string' ? error : (error.message || JSON.stringify(error));

    const sent = await notifyAdminError({
      source: sourceText,
      error: fullError,
      userId,
      userEmail,
      extra: {
        projectId,
        stageIndex,
        stageName: stage,
        ...extra
      }
    });

    return NextResponse.json({ success: true, notified: sent });
  } catch (err: any) {
    console.error('[Telegram Notify API] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
}
