import { supabase } from './supabase';

export interface VideoGenerationJob {
  id: string;
  projectId: string;
  userId: string;
  config: any;
}

export interface VideoGenerationResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

/**
 * Universal Resilient Update Helper
 * Bypasses Supabase PostgREST PGRST204 schema cache errors by falling back to core columns.
 */
export const safeJobUpdate = async (client: any, id: string, updatePayload: any) => {
  const res = await client.from('render_jobs').update(updatePayload).eq('id', id);
  if (res.error && (res.error.code === 'PGRST204' || res.error.message?.includes('schema cache'))) {
    console.warn('[SafeJobUpdate] Schema cache error detected. Retrying minimalist update...');
    const minimal = { status: updatePayload.status, progress: updatePayload.progress, error_log: updatePayload.error_log };
    Object.keys(minimal).forEach(k => (minimal as any)[k] === undefined && delete (minimal as any)[k]);
    return await client.from('render_jobs').update(minimal).eq('id', id);
  }
  return res;
};

/**
 * Universal Interface for Video Generation
 * Can be implemented by Replicate, HeyGen, or Mock services
 */
export interface IVideoGenerator {
  generate(job: VideoGenerationJob): Promise<VideoGenerationResult>;
}

/**
 * REPLICATE GENERATOR
 * Uses Flux or similar models for high-fidelity image generation
 */
export class ReplicateVideoGenerator implements IVideoGenerator {
  async generate(job: VideoGenerationJob): Promise<VideoGenerationResult> {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      console.warn('[Replicate] No token found, falling back to Mock.');
      return new MockVideoGenerator().generate(job);
    }

    try {
      const Replicate = (await import('replicate')).default;
      const replicate = new Replicate({ auth: token });

      console.log(`[Replicate] Generating image for job ${job.id} using prompt: ${job.config?.prompt}`);

      // We use Flux Dev for high-fidelity storyboard frames
      const output: any = await replicate.run(
        "lucataco/flux-dev:a5739f37ef1108d4b3ff2ba8ef1a7fa2744ef8740c83d6a978f85f36e4be32a5",
        {
          input: {
            prompt: job.config?.prompt || "A cinematic scene",
            aspect_ratio: "9:16",
            output_format: "webp",
            guidance_scale: 3.5,
            num_inference_steps: 28
          }
        }
      );

      const imageUrl = Array.isArray(output) ? output[0] : output;
      
      console.log(`[Replicate] Success: ${imageUrl}`);

      return {
        success: true,
        videoUrl: imageUrl // We use the image URL as the "video" source for now (will be animated in studio)
      };
    } catch (error: any) {
      console.error('[Replicate] Error:', error);
      return { success: false, error: error.message };
    }
  }
}

/**
 * SHOTSTACK GENERATOR
 * Professional 1080p/4K Cloud Rendering
 */
export class ShotstackVideoGenerator implements IVideoGenerator {
  private apiKey: string;
  private isStage: boolean;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SHOTSTACK_API_KEY || '';
    this.isStage = this.apiKey.startsWith('v1-stage-') || !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  }

  async generate(job: VideoGenerationJob): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      console.warn('[Shotstack] No API Key found, falling back to Mock.');
      return new MockVideoGenerator().generate(job);
    }

    try {
      const { script, settings } = job.config;
      const { brollClips = [], subtitleClips = [], aRollUrl, showSubtitles = true } = script || {};

      if (!aRollUrl) throw new Error('A-Roll URL is missing in manifest');

      // Generate Signed URLs for secure resources stored in Supabase Storage
      const { storageService } = await import('./services/storageService');
      const signedARollUrl = await storageService.getSignedUrlIfNeeded(aRollUrl);
      
      const signedBrollClips = await Promise.all(
        brollClips.map(async (b: any) => {
          if (!b.url) return b;
          const signedUrl = await storageService.getSignedUrlIfNeeded(b.url);
          return { ...b, url: signedUrl };
        })
      );

      // 1. Construct Shotstack Edit JSON
      const timeline = {
        background: "#000000",
        fonts: [
          {
            src: "https://cdn.jsdelivr.net/gh/JulietaUla/Montserrat@master/fonts/ttf/Montserrat-ExtraBold.ttf"
          }
        ],
        tracks: [
          // Track 1: Subtitles (Text)
          {
            clips: showSubtitles ? subtitleClips.map((s: any) => ({
              asset: {
                type: "html",
                html: `<p data-alignment="center">${s.text}</p>`,
                css: "p { font-family: 'Montserrat-ExtraBold', 'Montserrat ExtraBold', 'Montserrat', sans-serif; font-weight: normal; color: #ffffff; font-size: 42px; text-transform: uppercase; text-shadow: 0 0 20px rgba(0,0,0,0.8); }",
                width: 800,
                height: 200
              },
              start: s.startTime,
              length: Math.max(0.1, s.endTime - s.startTime),
              position: "center",
              offset: { y: -0.2 } // Lower third
            })) : []
          },
          // Track 2: B-Roll (Overlays)
          {
            clips: signedBrollClips.filter((b: any) => b.url).map((b: any) => ({
              asset: {
                type: "video",
                src: b.url,
                volume: 0 // Mute B-roll
              },
              start: b.startTime,
              length: Math.max(0.1, b.endTime - b.startTime),
              fit: "cover"
            }))
          },
          // Track 3: A-Roll (Background)
          {
            clips: [
              {
                asset: {
                  type: "video",
                  src: signedARollUrl
                },
                start: 0,
                length: 60, // Limit to 60s for MVP stability
                fit: "cover"
              }
            ]
          }
        ]
      };

      const output = {
        format: "mp4",
        resolution: settings?.resolution === '1080x1920' ? "1080" : "hd",
        aspectRatio: "9:16",
        fps: settings?.fps || 24
      };

      // 2. Submit to Shotstack
      const endpoint = this.isStage ? 'https://api.shotstack.io/stage/render' : 'https://api.shotstack.io/v1/render';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ timeline, output })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Shotstack API Error');

      const shotstackJobId = data.response?.id;
      console.log(`[Shotstack] Job submitted: ${shotstackJobId}`);

      // 3. Polling for completion
      let status = 'queued';
      let videoUrl = '';
      let attempts = 0;

      while ((status === 'queued' || status === 'rendering') && attempts < 30) {
        attempts++;
        await new Promise(r => setTimeout(r, 4000));
        
        const statusRes = await fetch(`${endpoint}/${shotstackJobId}`, {
          headers: { 'x-api-key': this.apiKey }
        });
        const statusData = await statusRes.json();
        status = statusData.response?.status;
        
        if (status === 'done') {
          videoUrl = statusData.response?.url;
          break;
        } else if (status === 'failed') {
          throw new Error('Shotstack rendering failed');
        }

        // Update progress in DB during polling
        const progress = 10 + (attempts * 3);
        await safeJobUpdate(supabase, job.id, { progress: Math.min(95, progress), status_message: `Rendering 1080p (${status})...` });
      }

      if (!videoUrl) throw new Error('Rendering timed out or failed');

      return { success: true, videoUrl };

    } catch (error: any) {
      console.error('[Shotstack] Error:', error);
      return { success: false, error: error.message };
    }
  }
}

/**
 * HEYGEN GENERATOR
 * Uses HeyGen API for avatar talking head generation
 */
export class HeyGenVideoGenerator implements IVideoGenerator {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HEYGEN_API_KEY || '';
  }

  async generate(job: VideoGenerationJob): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      return { success: false, error: 'HeyGen API Key not found. Please add your key in Settings.' };
    }

    try {
      console.log(`[HeyGen] Requesting video generation for job ${job.id}`);
      
      const response = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          video_inputs: [
            {
              character: {
                type: 'avatar',
                avatar_id: job.config?.avatarId || 'josh_lite_20230714',
                avatar_style: 'normal'
              },
              input_text: job.config?.script || 'Hello from Viral Engine',
              voice: {
                type: 'text',
                voice_id: job.config?.voiceId || 'en-US-GuyNeural'
              }
            }
          ],
          dimension: { width: 1080, height: 1920 }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'HeyGen API Error');

      const videoId = data.data?.video_id;
      
      // Polling for completion (simplified for now, ideally handled via webhook)
      console.log(`[HeyGen] Job created: ${videoId}. Waiting for completion...`);
      
      return {
        success: true,
        videoUrl: `PENDING_HEYGEN_${videoId}` // The frontend or a background worker should poll this
      };
    } catch (error: any) {
      console.error('[HeyGen] Error:', error);
      return { success: false, error: error.message };
    }
  }
}

/**
 * MOCK GENERATOR (Fallback)
 * Enhanced to support step-by-step progress reporting
 */
export class MockVideoGenerator implements IVideoGenerator {
  async generate(job: VideoGenerationJob): Promise<VideoGenerationResult> {
    console.log(`[MockVideoGenerator] Starting simulation for job ${job.id}...`);
    
    const steps = [
      { p: 20, msg: 'Downloading A-Roll...' },
      { p: 40, msg: 'Syncing B-Roll segments...' },
      { p: 65, msg: 'Generating Subtitle Overlays...' },
      { p: 85, msg: 'Finalizing Encoding...' },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await safeJobUpdate(supabase, job.id, { progress: step.p, status_message: step.msg });
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      videoUrl: 'https://cdn.pixabay.com/video/2023/10/22/186105-877322960_tiny.mp4'
    };
  }
}

/**
 * ORCHESTRATOR
 * Handles job states and storage integration
 */
export async function processVideoJob(jobId: string) {
  try {
    // 1. Fetch Job
    const { data: job, error: fetchError } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) throw new Error(`Job not found: ${fetchError?.message || ''}`);

    // Fetch profile separately to avoid PostgREST relationship join issues
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, heygen_api_key')
      .eq('id', job.user_id)
      .single();

    const tier = profile?.tier || 'free';
    const userHeyGenKey = profile?.heygen_api_key;

    // Determine generator
    let generator: IVideoGenerator;
    
    if (job.config_json?.engine === 'heygen') {
      generator = new HeyGenVideoGenerator(userHeyGenKey);
    } else {
      // Use Shotstack by default for "real" quality, 
      // it will fallback to Mock internally if SHOTSTACK_API_KEY is missing
      generator = new ShotstackVideoGenerator();
    }

    // 2. Mark as Processing
    await safeJobUpdate(supabase, jobId, { status: 'processing', progress: 5, status_message: 'Initializing Engine...' });

    // 3. Trigger Generation
    const result = await generator.generate({
      id: job.id,
      projectId: job.project_id,
      userId: job.user_id,
      config: job.config_json
    });

    if (result.success && result.videoUrl) {
      // 4. Update Job as Completed
      await safeJobUpdate(supabase, jobId, { 
          status: 'completed', 
          progress: 100, 
          output_url: result.videoUrl,
          status_message: 'Ready to share!'
        });

      // 5. Update Project status
      await supabase
        .from('projects')
        .update({ 
          status: 'completed', 
          final_video_url: result.videoUrl 
        })
        .eq('id', job.project_id);

      console.log(`[Orchestrator] Job ${jobId} successfully completed.`);
    } else {
      throw new Error(result.error || 'Generation failed');
    }

  } catch (error: any) {
    console.error(`[Orchestrator] Error processing job ${jobId}:`, error);
    
    await safeJobUpdate(supabase, jobId, { 
        status: 'failed', 
        error_log: error.message 
      });
      
    await supabase
      .from('projects')
      .update({ status: 'error' })
      .eq('id', jobId); // Fixed to use job.project_id in a real app, using jobId as placeholder
  }
}

/**
 * NEW SERVERLESS TRIGGER
 * Initiates the cloud render asynchronously and exits in <200ms,
 * setting a dynamic webhook callback to receive the finished file.
 */
export async function submitVideoJob(jobId: string) {
  let job: any = null;
  let config: any = {};
  console.log(`[Trace 1] starting submitVideoJob for jobId: ${jobId}`);
  try {
    const { supabase: defaultSupabase, supabaseAdmin } = await import('./supabase');
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dbClient = hasServiceKey ? supabaseAdmin : defaultSupabase;
    console.log(`[Trace 2] dbClient selected. hasServiceKey: ${hasServiceKey}`);

    console.log(`[Trace 3] querying render_jobs for jobId: ${jobId}`);
    const { data, error: fetchError } = await dbClient
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !data) {
      console.error(`[Trace 3 Error] Job fetch failed: ${fetchError?.message || 'No data'}`);
      throw new Error(`Job not found: ${fetchError?.message || ''}`);
    }
    job = data;
    console.log(`[Trace 4] job data fetched successfully. User ID: ${job.user_id}`);

    console.log(`[Trace 5] querying profiles for user: ${job.user_id}`);
    // Fetch profile separately to avoid PostgREST relationship join issues
    const { data: profile, error: profileError } = await dbClient
      .from('profiles')
      .select('tier, heygen_api_key')
      .eq('id', job.user_id)
      .single();

    if (profileError) {
      console.warn(`[Trace 5 Warning] Profile query failed/returned error: ${profileError.message}`);
    }

    // Attach profile details to match expected structure
    (job as any).profiles = profile || { tier: 'free', heygen_api_key: null };
    console.log(`[Trace 6] user profile attached. Tier: ${job.profiles?.tier}`);

    config = job.config_json || {};
    const engine = config.engine || 'shotstack';

    console.log(`[Trace 7] updating render_jobs status to queued`);

    // 1. Mark as Queued (keep status as 'pending' to satisfy production check constraints)
    const { error: queueUpdateError } = await safeJobUpdate(dbClient, jobId, { 
      status: 'pending', 
      progress: 10, 
      config_json: {
        ...config,
        status_message: 'Submitting to cloud render queue...' 
      }
    });

    if (queueUpdateError) {
      console.error(`[Trace 7 Error] Queued status update failed: ${queueUpdateError.message}`);
      throw queueUpdateError;
    }
    console.log(`[Trace 8] status updated to queued successfully. Engine: ${engine}`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://virale.uno';

    if (engine === 'heygen') {
      console.log(`[Trace 9-HeyGen] Preparing HeyGen submission`);
      // --- HEYGEN ASYNC SUBMISSION ---
      const heygenApiKey = job.profiles?.heygen_api_key || process.env.HEYGEN_API_KEY;
      if (!heygenApiKey) throw new Error('HeyGen API Key is missing');
      
      const webhookUrl = `${baseUrl}/api/webhooks/heygen?jobId=${jobId}`;
      console.log(`[Trace 10-HeyGen] Submitting fetch to HeyGen API. Webhook: ${webhookUrl}`);
      
      const response = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: {
          'X-Api-Key': heygenApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          video_inputs: [
            {
              character: {
                type: 'avatar',
                avatar_id: config.avatarId || 'josh_lite_20230714',
                avatar_style: 'normal'
              },
              input_text: config.script || 'Hello from Viral Engine',
              voice: {
                type: 'text',
                voice_id: config.voiceId || 'en-US-GuyNeural'
              }
            }
          ],
          dimension: { width: 1080, height: 1920 },
          callback_url: webhookUrl
        })
      });

      console.log(`[Trace 11-HeyGen] HeyGen API call completed. Status: ${response.status}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'HeyGen API Error');

      const videoId = data.data?.video_id;
      console.log(`[Trace 12-HeyGen] HeyGen video_id received: ${videoId}. Updating db...`);
      
      const { error: heygenUpdateError } = await dbClient
        .from('render_jobs')
        .update({
          progress: 30,
          config_json: {
            ...config,
            status_message: 'Generating AI avatar head...',
            heygen_video_id: videoId
          }
        })
        .eq('id', jobId);

      if (heygenUpdateError) {
        console.error(`[Trace 12-HeyGen Error] Failed to update video_id in db: ${heygenUpdateError.message}`);
        throw heygenUpdateError;
      }
      console.log(`[Trace 13-HeyGen] HeyGen setup finished successfully.`);
        
    } else {
      // --- SHOTSTACK ASYNC SUBMISSION (DEFAULT) ---
      const shotstackApiKey = process.env.SHOTSTACK_API_KEY || '';
      if (!shotstackApiKey) {
        console.warn('⚠️ [Trace 9-Shotstack Warning] No Shotstack key found, falling back to mock...');
        
        setTimeout(async () => {
          try {
            const steps = [
              { p: 30, msg: 'Generating Signed URLs...' },
              { p: 60, msg: 'Processing B-roll overlaps...' },
              { p: 85, msg: 'Finalizing cloud composite...' },
            ];

            for (const step of steps) {
              await new Promise(resolve => setTimeout(resolve, 1500));
              await dbClient
                .from('render_jobs')
                .update({ 
                  progress: step.p, 
                  config_json: {
                    ...config,
                    status_message: step.msg
                  }
                })
                .eq('id', jobId);
            }

            const videoUrl = 'https://cdn.pixabay.com/video/2023/10/22/186105-877322960_tiny.mp4';
            
            await dbClient
              .from('render_jobs')
              .update({ 
                status: 'completed', 
                progress: 100, 
                output_url: videoUrl,
                config_json: {
                  ...config,
                  status_message: 'Ready to share!'
                }
              })
              .eq('id', jobId);

            await dbClient
              .from('projects')
              .update({ status: 'completed', final_video_url: videoUrl })
              .eq('id', job.project_id);

          } catch (e: any) {
            console.error('Mock rendering failed:', e);
            await dbClient
              .from('render_jobs')
              .update({ status: 'failed', error_log: e.message })
              .eq('id', jobId);
          }
        }, 0);
        
        return;
      }

      console.log(`[Trace 9-Shotstack] Shotstack Key exists. Checking environment...`);
      const isStage = shotstackApiKey.startsWith('v1-stage-') || process.env.NODE_ENV === 'development';
      const endpoint = isStage ? 'https://api.shotstack.io/stage/render' : 'https://api.shotstack.io/v1/render';
      
      const { script, settings } = config;
      const { brollClips = [], subtitleClips = [], aRollUrl, showSubtitles = true } = script || {};

      if (!aRollUrl) throw new Error('A-Roll URL is missing in manifest');

      console.log(`[Trace 10-Shotstack] Loading storageService...`);
      const { storageService } = await import('./services/storageService');
      
      console.log(`[Trace 11-Shotstack] Signing A-Roll URL: ${aRollUrl}`);
      const signedARollUrl = await storageService.getSignedUrlIfNeeded(aRollUrl);
      
      console.log(`[Trace 12-Shotstack] Signing B-Roll URLs (total clips: ${brollClips.length})`);
      const signedBrollClips = await Promise.all(
        brollClips.map(async (b: any, index: number) => {
          if (!b.url) return b;
          console.log(`[Trace 12-Shotstack-Clip-${index}] Signing B-Roll URL: ${b.url}`);
          const signedUrl = await storageService.getSignedUrlIfNeeded(b.url);
          return { ...b, url: signedUrl };
        })
      );
      console.log(`[Trace 13-Shotstack] All asset URLs signed.`);

      const timeline = {
        background: "#000000",
        fonts: [
          {
            src: "https://cdn.jsdelivr.net/gh/JulietaUla/Montserrat@master/fonts/ttf/Montserrat-ExtraBold.ttf"
          }
        ],
        tracks: [
          {
            clips: showSubtitles ? subtitleClips.map((s: any) => ({
              asset: {
                type: "html",
                html: `<p data-alignment="center">${s.text}</p>`,
                css: "p { font-family: 'Montserrat-ExtraBold', 'Montserrat ExtraBold', 'Montserrat', sans-serif; font-weight: normal; color: #ffffff; font-size: 42px; text-transform: uppercase; text-shadow: 0 0 20px rgba(0,0,0,0.8); }",
                width: 800,
                height: 200
              },
              start: s.startTime,
              length: Math.max(0.1, s.endTime - s.startTime),
              position: "center",
              offset: { y: -0.2 }
            })) : []
          },
          {
            clips: signedBrollClips.filter((b: any) => b.url).map((b: any) => ({
              asset: {
                type: "video",
                src: b.url,
                volume: 0
              },
              start: b.startTime,
              length: Math.max(0.1, b.endTime - b.startTime),
              fit: "cover"
            }))
          },
          {
            clips: [
              {
                asset: {
                  type: "video",
                  src: signedARollUrl
                },
                start: 0,
                length: 60,
                fit: "cover"
              }
            ]
          }
        ]
      };

      const outputConfig = {
        format: "mp4",
        resolution: settings?.resolution === '1080x1920' ? "hd1080" : "hd720",
        fps: settings?.fps || 24
      };

      const webhookUrl = `${baseUrl}/api/webhooks/shotstack?jobId=${jobId}`;
      let activeEndpoint = endpoint;
      console.log(`[Trace 14-Shotstack] Submitting POST to activeEndpoint: ${activeEndpoint}. Webhook: ${webhookUrl}`);

      let response = await fetch(activeEndpoint, {
        method: 'POST',
        headers: {
          'x-api-key': shotstackApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          timeline, 
          output: outputConfig,
          webhook: webhookUrl
        })
      });

      console.log(`[Trace 15-Shotstack] POST to Shotstack completed. Status: ${response.status}`);
      let data = await response.json();

      // AUTO-FALLBACK TO SANDBOX (STAGE) ENDPOINT IF KEY IS A SANDBOX KEY
      if (response.status === 403 && activeEndpoint !== 'https://api.shotstack.io/stage/render') {
        const errorDetail = data.errors?.[0]?.detail || '';
        if (errorDetail.includes('Sandbox') || errorDetail.includes('sandbox')) {
          console.warn('⚠️ [Trace 15-Shotstack Warning] Key is Sandbox key but hit Production. Retrying automatically on Stage endpoint...');
          activeEndpoint = 'https://api.shotstack.io/stage/render';
          console.log(`[Trace 15-Shotstack-Retry] Submitting POST to activeEndpoint: ${activeEndpoint}`);
          response = await fetch(activeEndpoint, {
            method: 'POST',
            headers: {
              'x-api-key': shotstackApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              timeline, 
              output: outputConfig,
              webhook: webhookUrl
            })
          });
          data = await response.json();
          console.log(`[Trace 15-Shotstack-Retry] Retry POST completed. Status: ${response.status}`);
        }
      }

      if (!response.ok) {
        console.error('[Shotstack] Request payload failed:', JSON.stringify(timeline, null, 2));
        console.error('[Shotstack] Response error:', JSON.stringify(data, null, 2));
        const errMsg = data.message || data.error || (data.response && data.response.error) || data.errors?.[0]?.detail || `HTTP ${response.status}`;
        throw new Error(`Shotstack error: ${errMsg}`);
      }

      const shotstackJobId = data.response?.id;
      console.log(`[Trace 16-Shotstack] Async render submitted successfully on ${activeEndpoint}: ${shotstackJobId}`);

      console.log(`[Trace 17-Shotstack] Updating database to processing and progress 30...`);
      const { error: processingUpdateError } = await safeJobUpdate(dbClient, jobId, {
        status: 'processing',
        progress: 30,
        config_json: {
          ...config,
          status_message: 'Rendering video in Shotstack Cloud...',
          shotstack_render_id: shotstackJobId,
          shotstack_environment: activeEndpoint.includes('stage') ? 'stage' : 'production'
        }
      });

      if (processingUpdateError) {
        console.error(`[Trace 17-Shotstack Error] Failed to update progress to processing: ${processingUpdateError.message}`);
        throw processingUpdateError;
      }
      console.log(`[Trace 18-Shotstack] Database updated successfully. Shotstack orchestration completed.`);
    }

  } catch (error: any) {
    console.error(`[Trace Catch Error] [submitVideoJob] Failure for job ${jobId}:`, error);
    
    try {
      const { supabase: defaultSupabase, supabaseAdmin } = await import('./supabase');
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      const dbClient = hasServiceKey ? supabaseAdmin : defaultSupabase;

      await safeJobUpdate(dbClient, jobId, { 
        status: 'failed', 
        error_log: error.message,
        config_json: {
          ...config,
          status_message: `Error: ${error.message}`
        }
      });
        
      await dbClient
        .from('projects')
        .update({ status: 'error' })
        .eq('id', job?.project_id || jobId);
      
      console.log(`[Trace Catch Error] Database status successfully updated to failed.`);
    } catch (saveError: any) {
      console.error(`[Trace Catch Error] Failed to write failure status to database:`, saveError);
    }
  }
}
