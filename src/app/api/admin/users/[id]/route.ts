import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth';
import { isSuperAdmin, isUserAdminByAuth, getAdminUserDetail, adminGrantCredits, adminUpdateUserTier } from '@/lib/admin';
import { telegramService } from '@/lib/telegram';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
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

    const detail = await getAdminUserDetail(targetUserId);
    return NextResponse.json(detail);
  } catch (error: any) {
    console.error('[AdminUserDetail API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetUserId } = await params;
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

    const body = await req.json();
    const { action } = body;

    if (action === 'grant_credits') {
      const amount = parseInt(body.amount, 10);
      const reason = body.reason || 'Admin manual grant';
      if (isNaN(amount) || amount === 0) {
        return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 });
      }

      await adminGrantCredits(targetUserId, amount, reason);
      return NextResponse.json({ success: true, message: `Successfully added ${amount} credits.` });
    }

    if (action === 'update_tier') {
      const { tier, subscription_status } = body;
      await adminUpdateUserTier(targetUserId, tier, subscription_status || 'active');
      return NextResponse.json({ success: true, message: `Tier updated to ${tier}.` });
    }

    if (action === 'send_telegram_dm') {
      const { message } = body;
      const detail = await getAdminUserDetail(targetUserId);
      const tgId = detail.profile.telegram_id;

      if (!tgId) {
        return NextResponse.json({ error: 'User does not have a linked Telegram account' }, { status: 400 });
      }

      const res = await telegramService.sendMessage(tgId, message);
      if (!res.ok) {
        return NextResponse.json({ error: res.description || 'Failed to send message via Telegram' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Message sent via Telegram' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[AdminUserDetail PATCH API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
