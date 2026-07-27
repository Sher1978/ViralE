/// <reference lib="dom" />

export interface TrafficData {
  referrer: string;
  landing_page: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  is_ai_traffic: boolean;
  ai_provider?: string;
  is_dark_traffic: boolean;
  captured_at: string;
}

const AI_REFERRER_PATTERNS: { pattern: RegExp; provider: string }[] = [
  { pattern: /chatgpt\.com|chat\.openai\.com/i, provider: 'ChatGPT (OpenAI)' },
  { pattern: /perplexity\.ai/i, provider: 'Perplexity AI' },
  { pattern: /claude\.ai/i, provider: 'Claude (Anthropic)' },
  { pattern: /copilot\.microsoft\.com|bing\.com\/chat/i, provider: 'Microsoft Copilot' },
  { pattern: /gemini\.google\.com/i, provider: 'Google Gemini' },
  { pattern: /poe\.com/i, provider: 'Poe AI' },
  { pattern: /you\.com/i, provider: 'You.com AI' },
];

export function captureTrafficSource(): TrafficData | null {
  if (typeof globalThis === 'undefined' || !(globalThis as any).window) return null;

  const win = (globalThis as any).window;
  const doc = (globalThis as any).document;
  const session = (globalThis as any).sessionStorage;
  const local = (globalThis as any).localStorage;

  try {
    // Check if initial_ref already exists in sessionStorage or localStorage to preserve original entry point
    if (session && session.getItem('initial_ref')) {
      return JSON.parse(session.getItem('initial_ref'));
    }

    if (local && local.getItem('initial_ref')) {
      return JSON.parse(local.getItem('initial_ref'));
    }

    const rawReferrer = doc?.referrer || '';
    const landingPage = win?.location?.href || '';
    const searchStr = win?.location?.search || '';
    const urlParams = new URLSearchParams(searchStr);

    const utm_source = urlParams.get('utm_source') || 'none';
    const utm_medium = urlParams.get('utm_medium') || 'none';
    const utm_campaign = urlParams.get('utm_campaign') || 'none';
    const utm_content = urlParams.get('utm_content') || 'none';
    const utm_term = urlParams.get('utm_term') || 'none';

    // AI Referrer Detection
    let is_ai_traffic = false;
    let ai_provider: string | undefined = undefined;

    for (const item of AI_REFERRER_PATTERNS) {
      if (item.pattern.test(rawReferrer) || item.pattern.test(landingPage)) {
        is_ai_traffic = true;
        ai_provider = item.provider;
        break;
      }
    }

    // Check if utm_source explicitly indicates AI
    if (!is_ai_traffic && /chatgpt|perplexity|claude|gemini|copilot|ai/i.test(utm_source)) {
      is_ai_traffic = true;
      ai_provider = utm_source;
    }

    // Dark Traffic detection: Direct / (none) on deep landing pages or specific product pages
    const pathname = win?.location?.pathname || '/';
    const isHomepage = pathname === '/' || pathname === '/ru' || pathname === '/en';
    const isDirect = !rawReferrer || rawReferrer === '';
    const is_dark_traffic = isDirect && !isHomepage;

    const trafficData: TrafficData = {
      referrer: rawReferrer || 'Direct / Bookmark',
      landing_page: landingPage,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      is_ai_traffic,
      ai_provider,
      is_dark_traffic,
      captured_at: new Date().toISOString()
    };

    if (session) session.setItem('initial_ref', JSON.stringify(trafficData));
    if (local) local.setItem('initial_ref', JSON.stringify(trafficData));

    console.log('[TrafficTracker] Captured initial traffic source:', trafficData);
    return trafficData;
  } catch (err) {
    console.error('[TrafficTracker] Failed to capture traffic source:', err);
    return null;
  }
}

export function getTrafficData(): TrafficData | null {
  if (typeof globalThis === 'undefined' || !(globalThis as any).window) return null;
  try {
    const session = (globalThis as any).sessionStorage;
    const local = (globalThis as any).localStorage;

    if (session && session.getItem('initial_ref')) {
      return JSON.parse(session.getItem('initial_ref'));
    }

    if (local && local.getItem('initial_ref')) {
      return JSON.parse(local.getItem('initial_ref'));
    }

    return captureTrafficSource();
  } catch {
    return null;
  }
}
