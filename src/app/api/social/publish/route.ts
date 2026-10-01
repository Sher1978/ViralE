import { NextResponse } from 'next/server';
import { publishToSocialPlatforms, SocialPlatform } from '@/lib/services/socialPostingService';
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, videoUrl, title, caption, coverUrl, platforms } = body;

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json({ error: 'Выберите хотя бы одну соцсеть для публикации' }, { status: 400 });
    }

    console.log(`[API /api/social/publish] Starting multi-platform auto-post for project ${projectId} to:`, platforms);

    let userLateDevKey: string | undefined = undefined;
    try {
      const { user } = await getAuthContext();
      if (user) {
        const { data: profile, error } = await supabaseAdmin
          .from('profiles')
          .select('latedev_api_key, user_api_keys, synthetic_training_data')
          .eq('id', user.id)
          .single();

        if (error) {
          console.warn('[API /api/social/publish] Profile fetch error:', error.message);
        }

        const userApiKeys = profile?.user_api_keys as Record<string, any> || {};
        const syntheticData = profile?.synthetic_training_data as Record<string, any> || {};
        userLateDevKey = syntheticData.latedev_api_key || profile?.latedev_api_key || userApiKeys.latedev || undefined;
      }
    } catch (authErr) {
      console.warn('[API /api/social/publish] Auth context warning, proceeding with fallback key:', authErr);
    }

    const result = await publishToSocialPlatforms({
      projectId: projectId || 'demo',
      videoUrl: videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-vertical-portrait-of-a-woman-40228-large.mp4',
      title: title || 'Новый виральный ролик',
      caption: caption || '#shorts #reels #viral',
      coverUrl,
      platforms: platforms as SocialPlatform[]
    }, userLateDevKey);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /api/social/publish Error]:', err);
    return NextResponse.json({ error: err.message || 'Ошибка публикации' }, { status: 500 });
  }
}
