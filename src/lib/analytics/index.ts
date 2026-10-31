import { posthogCapture, posthogIdentify, posthogReset, getPostHogSessionInfo } from './posthog';
import { getClaritySessionInfo } from '@/components/analytics/ClarityAnalytics';

export interface TrackEventOptions {
  notifyAdmin?: boolean;
  videoUrl?: string;
  title?: string;
  description?: string;
}

/**
 * Universal Event Tracker for Viral Engine.
 * Dispatches to:
 * 1. PostHog (Product analytics, conversion funnels, session replay)
 * 2. Microsoft Clarity (Heatmaps, DOM session replay)
 * 3. Supabase (Permanent database audit log in user_events)
 * 4. Telegram SuperAdmin Bot (Real-time alert with 1-click video session replay link)
 */
export async function trackEvent(
  eventName: string,
  properties: Record<string, any> = {},
  options: TrackEventOptions = {}
): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // 1. PostHog Tracking
    posthogCapture(eventName, properties);

    // 2. Microsoft Clarity Tracking
    try {
      const win = window as any;
      if (typeof win.clarity === 'function') {
        win.clarity('event', eventName);
      }
    } catch (e) {
      // Ignore
    }

    // 3. Collect active session replay links
    const clarityInfo = getClaritySessionInfo();
    const posthogInfo = getPostHogSessionInfo();

    const payload = {
      eventName,
      properties,
      claritySessionId: clarityInfo.sessionId,
      clarityReplayUrl: clarityInfo.replayUrl,
      posthogSessionId: posthogInfo.sessionId,
      posthogReplayUrl: posthogInfo.replayUrl,
      url: window.location.href,
      notifyAdmin: options.notifyAdmin,
      videoUrl: options.videoUrl || properties.videoUrl || properties.exportUrl,
      title: options.title,
      description: options.description
    };

    // 4. Send to server for Supabase storage and Telegram alert
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => {
      console.warn('[Analytics] Server track call failed:', err);
    });
  } catch (err) {
    console.error('[Analytics] trackEvent error:', err);
  }
}

/**
 * Synchronizes user identification across PostHog, Microsoft Clarity, and analytics cookies.
 */
export function identifyUser(user: {
  id: string;
  email?: string | null;
  full_name?: string | null;
  tier?: string | null;
  credits_balance?: number | null;
}): void {
  if (typeof window === 'undefined' || !user?.id) return;

  const traits = {
    email: user.email || undefined,
    name: user.full_name || undefined,
    tier: user.tier || 'FREE',
    credits_balance: user.credits_balance || 0,
    updated_at: new Date().toISOString(),
  };

  // 1. Identify in PostHog
  posthogIdentify(user.id, traits);

  // 2. Identify in Microsoft Clarity
  try {
    const win = window as any;
    if (typeof win.clarity === 'function') {
      win.clarity('identify', user.id, undefined, undefined, user.full_name || user.email || user.id);
      if (user.tier) win.clarity('set', 'tier', user.tier);
      if (user.email) win.clarity('set', 'email', user.email);
    }
  } catch (e) {
    // Ignore
  }

  // 3. Track sign-in / session event
  trackEvent('user_identified', traits);
}

/**
 * Resets user sessions upon sign-out.
 */
export function resetAnalyticsSession(): void {
  if (typeof window === 'undefined') return;
  posthogReset();
}
