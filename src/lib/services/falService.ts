import { fal } from "@fal-ai/client";

// Note: FAL_KEY is automatically read from process.env.FAL_KEY by the fal client.
// No manual fal.config() call is needed when the env var is set.

export const falService = {
  /**
   * Uploads a file to Fal.ai storage.
   *
   * IMPORTANT: fal.storage.upload() expects a Web API Blob object with proper
   * .type and .size properties. Node.js Buffer is NOT compatible — it has
   * .length instead of .size and no .type property, causing the file to be
   * uploaded as 'application/octet-stream' with a .bin extension, which makes
   * Fal AI unable to decode the video stream (422 / "corrupted file" error).
   *
   * This wrapper converts Buffer → Blob with the correct MIME type before upload.
   */
  async uploadFile(
    fileData: Blob | Buffer | string,
    options?: { fileName?: string; contentType?: string }
  ): Promise<string> {
    try {
      let uploadBlob: Blob;

      if (Buffer.isBuffer(fileData)) {
        // ✅ FIX: Convert Node.js Buffer to proper Web API Blob.
        // This ensures fal.storage.upload receives .size, .type, and .slice()
        // so the CDN stores the file with the correct MIME type and extension.
        const mimeType = options?.contentType || "application/octet-stream";
        // Use Uint8Array wrapper — TypeScript/Node.js Buffer has SharedArrayBuffer
        // incompatibility with the Blob constructor's BlobPart type
        uploadBlob = new Blob([new Uint8Array(fileData)], { type: mimeType });
        console.log(
          `[FalService] Converted Buffer (${fileData.length} bytes) to Blob (type: ${mimeType})`
        );
      } else if (typeof fileData === "string") {
        // Treat as URL — pass through directly (already uploaded somewhere else)
        return fileData;
      } else {
        // Already a Blob — use as is
        uploadBlob = fileData;
      }

      // Verify the blob is not empty before upload
      if (uploadBlob.size === 0) {
        throw new Error(
          "[FalService] Refusing to upload an empty Blob (0 bytes). The source Buffer/Blob was empty."
        );
      }

      console.log(
        `[FalService] Uploading to Fal storage: ${uploadBlob.size} bytes, type: ${uploadBlob.type}`
      );
      const url = await fal.storage.upload(uploadBlob);
      console.log(`[FalService] Upload successful → ${url}`);
      return url;
    } catch (error) {
      console.error("[FalService] Upload failed:", error);
      throw error;
    }
  },

  /**
   * Triggers the LivePortrait motion transfer.
   * @param faceImageUrl The static image of the avatar/persona (must be a direct public URL from Fal CDN)
   * @param drivingVideoUrl The user's recorded performance segment (must be a direct public URL from Fal CDN)
   */
  async animateAvatar(
    faceImageUrl: string,
    drivingVideoUrl: string,
    onProgress?: (status: string) => void
  ) {
    try {
      console.log(`[FalService] Initiating LivePortrait:`, {
        faceImageUrl,
        drivingVideoUrl,
      });
      if (onProgress) onProgress("Starting AI Engine...");

      const result = await fal.subscribe("fal-ai/live-portrait", {
        input: {
          video_url: drivingVideoUrl, // The driving video (user's recording) — must be a Fal CDN URL
          image_url: faceImageUrl, // The avatar portrait image — must be a Fal CDN URL
          flag_lip_zero: true,
          flag_stitching: true,
          flag_relative: true,
          flag_pasteback: true,
          flag_do_crop: true,
          flag_do_rot: true,
          dsize: 512,
          scale: 2.3,
          vy_ratio: -0.125,
          batch_size: 32,
        },
        logs: true,
        onQueueUpdate: (update: any) => {
          const timestamp = new Date().toISOString();
          console.log(`[FalService][${timestamp}] Queue status: ${update.status}`);
          if (update.logs && update.logs.length > 0) {
            console.log(
              `[FalService] Last log:`,
              update.logs[update.logs.length - 1].message
            );
          }
          if (onProgress) {
            const msg =
              update.status === "IN_PROGRESS"
                ? "AI Synthesizing (Motion Transfer)..."
                : `AI Status: ${update.status}`;
            onProgress(msg);
          }
        },
      });

      const timestamp = new Date().toISOString();
      console.log(
        `[FalService][${timestamp}] Task finished. RequestId: ${result.requestId}`
      );
      console.log(
        "[FalService] Full result:",
        JSON.stringify(result, null, 2)
      );

      const videoUrl =
        (result.data as any).video?.url || (result.data as any).url;

      if (!videoUrl) {
        console.error("[FalService] No video URL in response:", result.data);
        throw new Error(
          "AI processing completed but no video URL was returned."
        );
      }

      return {
        videoUrl,
        requestId: result.requestId,
      };
    } catch (error: any) {
      console.error("[FalService] LivePortrait CRITICAL FAIL:", error);
      const rawDetail =
        error.body?.detail || error.message || "Unknown AI error";
      const errorDetail =
        typeof rawDetail === "object"
          ? JSON.stringify(rawDetail)
          : String(rawDetail);
      throw new Error(`AI Synthesis Failed: ${errorDetail}`);
    }
  },

  /**
   * Parallel processing for multiple segments.
   */
  async processTimeline(
    segments: Array<{
      id: string;
      source_image_url?: string;
      driving_video_url: string;
    }>
  ) {
    const promises = segments.map(async (segment) => {
      if (segment.source_image_url) {
        return this.animateAvatar(
          segment.source_image_url,
          segment.driving_video_url
        );
      }
      return { videoUrl: segment.driving_video_url, original: true };
    });

    return Promise.all(promises);
  },
};
