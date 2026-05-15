import { fal } from "@fal-ai/client";

// Note: Ensure FAL_KEY is set in your environment variables
export const falService = {
  /**
   * Uploads a file to Fal.ai storage
   */
  async uploadFile(fileData: Blob | Buffer | string) {
    try {
      const isBrowser = typeof window !== 'undefined';
      const url = await fal.storage.upload(fileData as any, {
        // @ts-ignore
        proxyUrl: isBrowser ? "/api/ai/fal/proxy" : undefined,
      });
      return url;
    } catch (error) {
      console.error("[FalService] Upload failed:", error);
      throw error;
    }
  },

  /**
   * Triggers the LivePortrait motion transfer
   * @param faceImageUrl The static image of the avatar/persona
   * @param drivingVideoUrl The user's recorded performance segment
   */
  async animateAvatar(faceImageUrl: string, drivingVideoUrl: string, onProgress?: (status: string) => void) {
    try {
      console.log(`[FalService] Initiating LivePortrait:`, { faceImageUrl, drivingVideoUrl });
      if (onProgress) onProgress('Starting AI Engine...');
      
      const isBrowser = typeof window !== 'undefined';
      
      const result = await fal.subscribe("fal-ai/live-portrait", {
        input: {
          face_image_url: faceImageUrl,
          driving_video_url: drivingVideoUrl,
          live_portrait_config: {
            crop_driving_video: true,
            lip_zero: true,
            eye_retargeting: true,
            smile_retargeting: true,
            hand_retargeting: false 
          }
        } as any,
        logs: true,
        // @ts-ignore
        proxyUrl: isBrowser ? "/api/ai/fal/proxy" : undefined,
        onQueueUpdate: (update: any) => {
          const timestamp = new Date().toISOString();
          console.log(`[FalService][${timestamp}] Status: ${update.status}`);
          if (update.logs && update.logs.length > 0) {
            console.log(`[FalService] Last Log:`, update.logs[update.logs.length - 1].message);
          }
          if (onProgress) {
            const msg = update.status === 'IN_PROGRESS' ? 'AI Synthesizing (Motion Transfer)...' : `AI Status: ${update.status}`;
            onProgress(msg);
          }
        }
      });

      const timestamp = new Date().toISOString();
      console.log(`[FalService][${timestamp}] Task Finished. RequestId: ${result.requestId}`);
      console.log('[FalService] Full Result Object:', JSON.stringify(result, null, 2));

      const videoUrl = (result.data as any).video?.url || (result.data as any).url;
      
      if (!videoUrl) {
          console.error('[FalService] No video URL in response:', result.data);
          throw new Error('AI processing completed but no video URL was returned.');
      }

      return {
        videoUrl,
        requestId: result.requestId
      };
    } catch (error: any) {
      console.error("[FalService] LivePortrait CRITICAL FAIL:", error);
      // Detailed error reporting
      const errorDetail = error.body?.detail || error.message || "Unknown AI error";
      throw new Error(`AI Synthesis Failed: ${errorDetail}`);
    }
  },

  /**
   * Parallel processing for multiple segments
   */
  async processTimeline(segments: Array<{ id: string, source_image_url?: string, driving_video_url: string }>) {
    const promises = segments.map(async (segment) => {
      if (segment.source_image_url) {
        return this.animateAvatar(segment.source_image_url, segment.driving_video_url);
      }
      return { videoUrl: segment.driving_video_url, original: true };
    });

    return Promise.all(promises);
  }
};
