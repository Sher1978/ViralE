import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { getAuthContext } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { videoUrl, projectId } = await req.json();

    if (!videoUrl || !videoUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Missing or invalid videoUrl' }, { status: 400 });
    }

    // If it's already hosted on Supabase, return it as is
    if (videoUrl.includes('supabase.co/storage')) {
      return NextResponse.json({ publicUrl: videoUrl, cached: true });
    }

    const authCtx = await getAuthContext().catch(() => null);
    const userId = authCtx?.user?.id || 'anon';

    // Download video stream from HeyGen
    const res = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Accept': '*/*',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to download video from origin (${res.status})` },
        { status: res.status }
      );
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const safeProjectId = projectId || 'unknown';
    const filePath = `heygen-renders/${safeProjectId}_${Date.now()}.mp4`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(filePath, buffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      console.error('[MirrorToStorage] Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: pubData } = supabaseAdmin.storage
      .from('media')
      .getPublicUrl(filePath);

    const permanentUrl = pubData.publicUrl;

    // If projectId is provided, also sync to project_versions script_data if available
    if (projectId) {
      try {
        const { data: version } = await supabaseAdmin
          .from('project_versions')
          .select('id, script_data')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (version && version.script_data) {
          const updatedScriptData = {
            ...version.script_data,
            aRollUrl: permanentUrl,
            videoUrl: permanentUrl,
          };
          await supabaseAdmin
            .from('project_versions')
            .update({ script_data: updatedScriptData })
            .eq('id', version.id);
        }
      } catch (dbErr) {
        console.warn('[MirrorToStorage] DB sync warning:', dbErr);
      }
    }

    return NextResponse.json({ ok: true, publicUrl: permanentUrl });
  } catch (err: any) {
    console.error('[MirrorToStorage] Error:', err);
    return NextResponse.json({ error: err?.message || 'Internal mirror error' }, { status: 500 });
  }
}
