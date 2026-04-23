import { SceneSegment, AvatarProvider } from '../types/studio';
import { higgsfieldService } from './higgsfieldService';
import { profileService } from './profileService';
import { CREDIT_COSTS } from '../credits';

export const avatarService = {
  /**
   * Routes generation to the correct provider
   */
  async generateAvatar(segment: SceneSegment, userId?: string) {
    const provider = segment.provider || 'heygen';
    
    if (provider === 'higgsfield') {
      return await higgsfieldService.generateAvatar({
        prompt: segment.prompt,
        avatarId: segment.avatarId,
        modelId: segment.modelId as any,
        voiceUrl: segment.voiceUrl
      });
    }
    
    // HeyGen Implementation with User-Key Support
    let apiKey = process.env.HEYGEN_API_KEY; // Default system key
    
    if (userId) {
      const profile = await profileService.getProfile(userId);
      if (profile?.heygen_api_key) {
        apiKey = profile.heygen_api_key;
        console.log(`[HeyGen] Using personal API key for user: ${userId}`);
      }
    }

    console.log(`[HeyGen] Submitting task for segment: ${segment.id}`);
    
    // Real HeyGen API call (Simulated for this turn, but using the selected key)
    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey || '',
      },
      body: JSON.stringify({
        video_settings: {
          avatar_id: segment.avatarId || 'default',
          input_text: segment.prompt,
          voice_id: segment.voiceUrl, // Assuming voice ID for HeyGen
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HeyGen API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { jobId: data.data.video_id };
  },

  /**
   * Get total cost for the segment based on provider
   */
  getCost(segment: SceneSegment): number {
    const provider = segment.provider || 'heygen';
    return provider === 'higgsfield' ? CREDIT_COSTS.AVATAR_HIGGSFIELD : CREDIT_COSTS.AVATAR_HEYGEN;
  },

  /**
   * Combined library of avatars from all providers
   */
  async getAllStockAvatars() {
    const hf = await higgsfieldService.getStockAvatars();
    const hg = [
      { id: 'hg-1', name: 'Corporate Speaker', preview: 'https://images.unsplash.com/photo-1519085185750-7407a274359c?q=80&w=200', provider: 'heygen' },
      { id: 'hg-2', name: 'Virtual Presenter', preview: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200', provider: 'heygen' },
    ];
    
    return [...hg, ...hf];
  }
};
