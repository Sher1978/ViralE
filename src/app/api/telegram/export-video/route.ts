import { NextRequest, NextResponse } from 'next/server';
import { telegramService } from '@/lib/telegram';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { videoUrl, caption, userId, projectId } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    let userTelegramId: string | null = null;
    
    if (userId && supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_id, telegram_chat_id')
        .eq('id', userId)
        .maybeSingle();

      userTelegramId = profile?.telegram_chat_id || (profile?.telegram_id ? String(profile.telegram_id) : null);
    }

    if (userTelegramId) {
      const textCaption = caption ? caption.substring(0, 1000) : '🚀 Ваше готовое видео из Viral Engine!';
      const res = await telegramService.sendVideo(userTelegramId, videoUrl, textCaption);
      
      if (res.ok) {
        return NextResponse.json({ success: true, deliveredDirectly: true, result: res.result });
      }
    }

    // Fallback bot link
    const botUsername = 'Viralengin_bot';
    const fallbackLink = `https://t.me/${botUsername}?start=video_${projectId || 'export'}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(videoUrl)}&text=${encodeURIComponent(caption || 'Viral Engine Video')}`;

    return NextResponse.json({
      success: true,
      deliveredDirectly: false,
      botLink: fallbackLink,
      shareUrl
    });

  } catch (err: any) {
    console.error('[Telegram Export Video Route Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
