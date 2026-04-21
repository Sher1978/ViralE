import { supabase } from '../supabase';

export interface HiggsfieldGenerationParams {
  prompt: string;
  modelId?: 'kling-3.0' | 'nano-banana';
  avatarId?: string;
  voiceUrl?: string;
  faceImage?: string; // For character consistency
}

const HIGGSFIELD_API_BASE = 'https://api.higgsfield.ai/v1';

export const higgsfieldService = {
  /**
   * Submits a video generation task to Higgsfield
   */
  async generateAvatar(params: HiggsfieldGenerationParams): Promise<{ jobId: string }> {
    const keyId = process.env.HIGGSFIELD_API_KEY_ID;
    const keySecret = process.env.HIGGSFIELD_API_KEY_SECRET;

    console.log(`[Higgsfield] Submitting task with model: ${params.modelId || 'kling-3.0'}`);

    try {
      const response = await fetch(`${HIGGSFIELD_API_BASE}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Higgs-Key-ID': keyId || '',
          'X-Higgs-Key-Secret': keySecret || '',
        },
        body: JSON.stringify({
          model: params.modelId || 'kling-3.0',
          prompt: params.prompt,
          avatar_id: params.avatarId,
          audio_url: params.voiceUrl,
          options: {
            motion_bucket: 127,
            frames: 150, // 5 seconds @ 30fps
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Higgsfield API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { jobId: data.id };
    } catch (error) {
      console.error('[Higgsfield] Generation failed:', error);
      throw error;
    }
  },

  /**
   * Polls for completion
   */
  async checkStatus(jobId: string): Promise<{ status: 'processing' | 'completed' | 'failed', url?: string }> {
    const keyId = process.env.HIGGSFIELD_API_KEY_ID;
    const keySecret = process.env.HIGGSFIELD_API_KEY_SECRET;

    try {
      const response = await fetch(`${HIGGSFIELD_API_BASE}/jobs/${jobId}`, {
        headers: {
          'X-Higgs-Key-ID': keyId || '',
          'X-Higgs-Key-Secret': keySecret || '',
        },
      });

      if (!response.ok) return { status: 'failed' };

      const data = await response.json();
      
      if (data.status === 'succeeded') {
        return { status: 'completed', url: data.output_url };
      } else if (data.status === 'failed') {
        return { status: 'failed' };
      }
      
      return { status: 'processing' };
    } catch (error) {
      return { status: 'failed' };
    }
  },

  async getStockAvatars() {
    return [
      { id: 'hf-1', name: 'Cyberpunk Narrator', preview: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200', provider: 'higgsfield' },
      { id: 'hf-2', name: 'Tech Strategist', preview: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=200', provider: 'higgsfield' },
    ];
  },

  /**
   * Registers a new custom character with Higgsfield for consistency
   */
  async createCharacter(name: string, imageUrl: string): Promise<{ characterId: string }> {
    const keyId = process.env.HIGGSFIELD_API_KEY_ID;
    const keySecret = process.env.HIGGSFIELD_API_KEY_SECRET;

    console.log(`[Higgsfield] Creating character: ${name}`);

    try {
      const response = await fetch(`${HIGGSFIELD_API_BASE}/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Higgs-Key-ID': keyId || '',
          'X-Higgs-Key-Secret': keySecret || '',
        },
        body: JSON.stringify({
          name,
          image_url: imageUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`Higgsfield API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { characterId: data.id };
    } catch (error) {
      console.error('[Higgsfield] Character creation failed:', error);
      throw error;
    }
  }
};
