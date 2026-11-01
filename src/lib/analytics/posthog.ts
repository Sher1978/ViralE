import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_ypAmyXcC4u2bxE9SnBHUJ7j7xdMn8XXY45PYBrek9n2D';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

let isInitialized = false;

export function initPostHog(): typeof posthog | null {
  if (typeof window === 'undefined') return null;
  if (isInitialized) return posthog;

  if (!POSTHOG_KEY) {
    // PostHog key not configured yet; return singleton without init
    return posthog;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'always',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      autocapture: true,
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: {
          password: true,
        },
      },
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PostHog] Initialized successfully');
        }
      },
    });
    isInitialized = true;
    return posthog;
  } catch (err) {
    console.error('[PostHog] Init error:', err);
    return null;
  }
}

export function getPostHogSessionInfo(): { sessionId?: string; replayUrl?: string } {
  if (typeof window === 'undefined') return {};

  try {
    const sessionId = posthog.get_session_id();
    const replayUrl = posthog.get_session_replay_url({ withTimestamp: true });
    return {
      sessionId: sessionId || undefined,
      replayUrl: replayUrl || undefined,
    };
  } catch (e) {
    return {};
  }
}

export function posthogCapture(eventName: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  try {
    if (isInitialized) {
      posthog.capture(eventName, properties);
    }
  } catch (e) {
    console.error('[PostHog] Capture error:', e);
  }
}

export function posthogIdentify(userId: string, traits?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  try {
    if (isInitialized) {
      posthog.identify(userId, traits);
    }
  } catch (e) {
    console.error('[PostHog] Identify error:', e);
  }
}

export function posthogReset() {
  if (typeof window === 'undefined') return;
  try {
    if (isInitialized) {
      posthog.reset();
    }
  } catch (e) {
    console.error('[PostHog] Reset error:', e);
  }
}

export { posthog };
