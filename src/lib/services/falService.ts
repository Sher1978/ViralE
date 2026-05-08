import { fal } from "@fal-ai/client";

// Note: Ensure FAL_KEY is set in your environment variables
export const falService = {
  /**
   * Uploads a file to Fal.ai storage
   */
  async uploadFile(fileData: Blob | Buffer | string) {
    try {
      const url = await fal.storage.upload(fileData as any);
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
  async animateAvatar(faceImageUrl: string, drivingVideoUrl: string) {
    try {
      console.log(`[FalService] Initiating LivePortrait: ${faceImageUrl} -> ${drivingVideoUrl}`);
      
      const result = await fal.subscribe("fal-ai/live-portrait", {
        input: {
          face_image_url: faceImageUrl,
          driving_video_url: drivingVideoUrl,
          live_portrait_config: {
            crop_driving_video: true,
            lip_zero: true,
            eye_retargeting: true,
            smile_retargeting: true,
            hand_retargeting: false // Usually disabled for face-only A-roll
          }
        } as any,
        logs: true,
        onQueueUpdate: (update) => {
          console.log(`[FalService] Queue Update: ${update.status}`, update.logs?.[0]?.message);
        }
      });

      return {
        videoUrl: (result.data as any).video?.url || (result.data as any).url,
        requestId: result.requestId
      };
    } catch (error) {
      console.error("[FalService] LivePortrait failed:", error);
      throw error;
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
