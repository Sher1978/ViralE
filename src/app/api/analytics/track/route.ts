import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { notifyAdminUserAction } from '@/lib/telegram';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = (supabaseUrl && serviceKey)
  ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  : null;

// Critical events that automatically alert superadmin in Telegram
const AUTO_ALERT_EVENTS = new Set([
  'auth_signup',
  'prompter_record_completed',
  'video_export_completed',
  'payment_attempt',
  'payment_success',
  'support_request',
  'high_intent_checkout'
]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      eventName,
      properties = {},
      claritySessionId,
      clarityReplayUrl,
      posthogSessionId,
      posthogReplayUrl,
      url,
      notifyAdmin,
      videoUrl,
      title,
      description
    } = body;

    if (!eventName) {
      return NextResponse.json({ error: 'eventName is required' }, { status: 400 });
    }

    // Try to get authenticated user (optional - guest events are also valid)
    let user: any = null;
    try {
      user = await getAuthenticatedUser();
    } catch (e) {
      // Guest or unauthenticated user
    }

    const userId = user?.id || body.userId || null;
    const userEmail = user?.email || body.userEmail || null;
    const fullName = user?.user_metadata?.full_name || body.fullName || null;

    const userAgent = req.headers.get('user-agent') || undefined;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('x-real-ip') || undefined;

    // 1. Store event in Supabase user_events table
    if (supabaseAdmin) {
      try {
        const { error: insertError } = await supabaseAdmin.from('user_events').insert({
          user_id: userId,
          event_name: eventName,
          properties: properties,
          clarity_session_id: claritySessionId || null,
          clarity_replay_url: clarityReplayUrl || null,
          posthog_session_id: posthogSessionId || null,
          posthog_replay_url: posthogReplayUrl || null,
          page_url: url || null,
          user_agent: userAgent || null,
          ip_address: ipAddress || null
        });

        if (insertError) {
          // If table doesn't exist yet in Supabase schema cache, fallback gracefully
          if (insertError.code === 'PGRST205') {
            console.warn('[Analytics Track] Table user_events not yet migrated in Supabase. Falling back.');
            if (userId) {
              // Gracefully append to profile raw_onboarding_data if possible
              const { data: prof } = await supabaseAdmin
                .from('profiles')
                .select('raw_onboarding_data')
                .eq('id', userId)
                .maybeSingle();

              const currentData = prof?.raw_onboarding_data || {};
              const events = Array.isArray(currentData.recent_events) ? currentData.recent_events : [];
              events.push({
                event: eventName,
                time: new Date().toISOString(),
                properties,
                clarityReplayUrl,
                posthogReplayUrl
              });
              // Keep last 30 events
              currentData.recent_events = events.slice(-30);
              await supabaseAdmin.from('profiles').update({ raw_onboarding_data: currentData }).eq('id', userId);
            }
          } else {
            console.error('[Analytics Track] Supabase insert error:', insertError);
          }
        }
      } catch (dbErr) {
        console.error('[Analytics Track] Database operation failed:', dbErr);
      }
    }

    // 2. Telegram Alert to SuperAdmin for high-value actions or when explicitly requested
    const shouldNotify = Boolean(notifyAdmin || AUTO_ALERT_EVENTS.has(eventName));
    if (shouldNotify) {
      notifyAdminUserAction({
        userId,
        userEmail,
        fullName,
        eventName,
        title,
        description,
        properties,
        clarityReplayUrl,
        posthogReplayUrl,
        videoUrl: videoUrl || properties.videoUrl || properties.exportUrl
      }).catch(tgErr => console.error('[Analytics Track] Telegram notify failed:', tgErr));
    }

    return NextResponse.json({ success: true, event: eventName });
  } catch (err: any) {
    console.error('[Analytics Track] Error processing request:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
