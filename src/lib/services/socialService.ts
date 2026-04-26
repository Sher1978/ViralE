import { Profile, profileService } from './profileService';
import { supabase } from '../supabase';

export type SocialProvider = 'instagram' | 'tiktok' | 'youtube';

export interface SocialPostStatus {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export const socialService = {
  /**
    * Returns the OAuth authorization URL for a specific provider
    */
  getAuthUrl(provider: SocialProvider): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/social/${provider}/callback`;
    
    switch (provider) {
      case 'instagram':
        // Instagram Graph API OAuth
        const instaClientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;
        return `https://api.instagram.com/oauth/authorize?client_id=${instaClientId}&redirect_uri=${redirectUri}&scope=instagram_basic,instagram_content_publish&response_type=code`;
        
      case 'tiktok':
        // TikTok For Developers OAuth
        const tiktokKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
        return `https://www.tiktok.com/v2/auth/authorize/?client_key=${tiktokKey}&scope=video.upload,user.info.basic&response_type=code&redirect_uri=${redirectUri}`;
        
      default:
        return '#';
    }
  },

  /**
    * Publishes a video to the specified social platform
    */
  async publishVideo(
    userId: string, 
    provider: SocialProvider, 
    videoUrl: string, 
    caption: string
  ): Promise<SocialPostStatus> {
    const profile = await profileService.getProfile(userId);
    if (!profile) return { success: false, error: 'User profile not found' };

    const token = this.getProviderToken(profile, provider);
    if (!token) return { success: false, error: `Account for ${provider} is not linked` };

    console.log(`[SocialService] Publishing to ${provider}...`);
    
    // In a real implementation, we would call the provider's API here
    // For MVP, we simulate the API handshake
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // MOCK REAL LOGIC PER PROVIDER
      // if (provider === 'instagram') return await this.postToInstagram(token, videoUrl, caption);
      
      return {
        success: true,
        postId: `mock_${Date.now()}`,
        postUrl: `https://${provider}.com/p/mock_success`
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
    * Internal helper to extract the correct token from profile
    */
  getProviderToken(profile: Profile, provider: SocialProvider): string | null | undefined {
    switch (provider) {
      case 'instagram': return profile.instagram_token;
      case 'tiktok': return profile.tiktok_token;
      case 'youtube': return profile.youtube_token;
      default: return null;
    }
  }
};
