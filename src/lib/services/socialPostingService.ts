/**
 * socialPostingService.ts
 * Multi-Platform Social Auto-Posting Service for Virali AI via Late.dev / Social API.
 * Supports YouTube Shorts, Instagram Reels, TikTok, and Telegram Channels.
 */

export type SocialPlatform = 'youtube' | 'instagram' | 'tiktok' | 'telegram';

export interface SocialPublishPayload {
  projectId: string;
  videoUrl: string;
  title: string;
  caption: string;
  coverUrl?: string;
  platforms: SocialPlatform[];
  userTokenMap?: Partial<Record<SocialPlatform, string>>;
}

export interface PlatformPublishResult {
  platform: SocialPlatform;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface MultiPlatformPublishResponse {
  results: PlatformPublishResult[];
  overallSuccess: boolean;
}

const LATE_DEV_API_ENDPOINT = process.env.LATE_DEV_API_ENDPOINT || 'https://getlate.dev/api/v1/posts';
const LATE_DEV_ACCOUNTS_ENDPOINT = 'https://getlate.dev/api/v1/accounts';

export interface ConnectedAccountInfo {
  id: string;
  platform: SocialPlatform;
  username?: string;
  displayName?: string;
  profilePicture?: string;
  isActive: boolean;
}

/**
 * Fetches connected social media accounts for the provided Late.dev API key
 */
export async function getLateDevConnectedAccounts(userApiKey?: string): Promise<{
  connectedPlatforms: SocialPlatform[];
  accounts: ConnectedAccountInfo[];
}> {
  const apiKey = userApiKey || process.env.LATE_DEV_API_KEY || process.env.SOCIAL_POSTING_API_KEY;
  if (!apiKey) {
    return { connectedPlatforms: [], accounts: [] };
  }

  try {
    const res = await fetch(LATE_DEV_ACCOUNTS_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!res.ok) {
      console.warn(`[SocialPostingService] Failed to fetch Late.dev accounts (HTTP ${res.status})`);
      return { connectedPlatforms: [], accounts: [] };
    }

    const data = await res.json();
    const rawAccounts: any[] = data.accounts || [];

    const accounts: ConnectedAccountInfo[] = rawAccounts
      .filter((acc: any) => acc.enabled !== false && acc.isActive !== false)
      .map((acc: any) => ({
        id: acc._id || acc.id,
        platform: (acc.platform?.toLowerCase() as SocialPlatform) || 'youtube',
        username: acc.username || acc.metadata?.profileData?.username,
        displayName: acc.displayName || acc.metadata?.profileData?.displayName,
        profilePicture: acc.profilePicture || acc.metadata?.profileData?.profilePicture,
        isActive: true
      }));

    const connectedPlatforms = Array.from(new Set(accounts.map(a => a.platform)));
    return { connectedPlatforms, accounts };
  } catch (err: any) {
    console.error('[SocialPostingService] Error fetching Late.dev accounts:', err);
    return { connectedPlatforms: [], accounts: [] };
  }
}

/**
 * Publishes video, caption, and cover to selected social media platforms
 */
export async function publishToSocialPlatforms(
  payload: SocialPublishPayload,
  userApiKey?: string
): Promise<MultiPlatformPublishResponse> {
  const apiKey = userApiKey || process.env.LATE_DEV_API_KEY || process.env.SOCIAL_POSTING_API_KEY;
  const results: PlatformPublishResult[] = [];

  for (const platform of payload.platforms) {
    try {
      if (!apiKey) {
        results.push({
          platform,
          success: false,
          error: 'API Ключ Late.dev / Zernio не привязан. Перейдите в профиль и нажмите "⚙️ Привязать Late.dev API Ключ".'
        });
        continue;
      }

      const res = await fetch(LATE_DEV_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          platform,
          media_type: 'video',
          video_url: payload.videoUrl,
          title: payload.title,
          caption: payload.caption,
          cover_url: payload.coverUrl || undefined,
          collaborators: payload.collaborators && payload.collaborators.length > 0 ? payload.collaborators : undefined,
          instagram_collaborators: payload.collaborators && payload.collaborators.length > 0 ? payload.collaborators : undefined
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        results.push({
          platform,
          success: false,
          error: errorData.message || errorData.error || `HTTP ${res.status}`
        });
        continue;
      }

      const data = await res.json();
      results.push({
        platform,
        success: true,
        postId: data.post_id || data._id || data.id,
        postUrl: data.post_url || data.url || getSimulatedPostUrl(platform)
      });
    } catch (err: any) {
      console.error(`[SocialPostingService] Error posting to ${platform}:`, err);
      results.push({
        platform,
        success: false,
        error: err.message || 'Network request failed'
      });
    }
  }

  const overallSuccess = results.some(r => r.success);
  return { results, overallSuccess };
}

function getSimulatedPostUrl(platform: SocialPlatform): string {
  switch (platform) {
    case 'youtube': return 'https://youtube.com/shorts/viral_engine_demo';
    case 'instagram': return 'https://instagram.com/reels/viral_engine_demo';
    case 'tiktok': return 'https://tiktok.com/@viral_engine/video/demo';
    case 'telegram': return 'https://t.me/viral_engine_channel/1';
    default: return '#';
  }
}
