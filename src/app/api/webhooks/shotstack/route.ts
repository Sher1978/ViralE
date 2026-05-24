import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { safeJobUpdate } from '@/lib/video';

/**
 * SHOTSTACK WEBHOOK CALLBACK ENDPOINT
 * Receives the asynchronous render status from Shotstack Cloud.
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      console.error('[Shotstack Webhook] Missing Job ID in query params');
      return NextResponse.json({ error: 'Missing Job ID' }, { status: 400 });
    }

    const body = await req.json();
    console.log(`[Shotstack Webhook] Received status update for Job: ${jobId}`, {
      status: body.status,
      id: body.id
    });

    // 1. Fetch the Job metadata using supabaseAdmin (bypass RLS)
    const { data: job, error: jobError } = await supabaseAdmin
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error(`[Shotstack Webhook] Job ${jobId} not found in DB:`, jobError);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Fetch profile separately to avoid PostgREST relationship join issues
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('telegram_chat_id')
      .eq('id', job.user_id)
      .single();

    const telegramChatId = profile?.telegram_chat_id;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (body.status === 'done') {
      const videoUrl = body.url;

      // 2. Mark Render Job as Completed in DB using resilient safeJobUpdate helper
      await safeJobUpdate(supabaseAdmin, jobId, {
        status: 'completed',
        progress: 100,
        output_url: videoUrl,
        config_json: {
          ...(job.config_json || {}),
          status_message: 'Ready to share!'
        }
      });

      // 3. Mark Project as Completed
      await supabaseAdmin
        .from('projects')
        .update({
          status: 'completed',
          final_video_url: videoUrl
        })
        .eq('id', job.project_id);

      console.log(`[Shotstack Webhook] Job ${jobId} marked COMPLETED in database.`);

      // 4. Deliver Final Video via Telegram Bot API if Chat ID exists
      if (telegramChatId && botToken) {
        try {
          const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendVideo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              video: videoUrl,
              caption: '🎬 Ваше вирусное видео готово! Скачивайте и делитесь!'
            })
          });

          if (!telegramRes.ok) {
            const errText = await telegramRes.text();
            console.error('[Telegram delivery] Bot API failure details:', errText);
          } else {
            console.log(`[Telegram delivery] Final video successfully dispatched to chat: ${telegramChatId}`);
          }
        } catch (botErr) {
          console.error('[Telegram delivery] Unexpected error sending video:', botErr);
        }
      }

    } else if (body.status === 'failed') {
      const errorLog = body.error || 'Shotstack rendering engine failed internally';

      // Mark Render Job as Failed using resilient safeJobUpdate helper
      await safeJobUpdate(supabaseAdmin, jobId, {
        status: 'failed',
        error_log: errorLog,
        config_json: {
          ...(job.config_json || {}),
          status_message: 'Rendering failed'
        }
      });

      // Mark Project as Error
      await supabaseAdmin
        .from('projects')
        .update({
          status: 'error'
        })
        .eq('id', job.project_id);

      console.warn(`[Shotstack Webhook] Job ${jobId} failed rendering: ${errorLog}`);

      // Alert user via Telegram if Chat ID exists
      if (telegramChatId && botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: '⚠️ К сожалению, при генерации вашего видео произошла ошибка на стороне облачного рендерера.'
          })
        }).catch(e => console.error('[Telegram delivery] Failed to send error message:', e));
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Shotstack Webhook] Processing failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
