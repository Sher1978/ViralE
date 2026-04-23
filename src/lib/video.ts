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
 * MOCK GENERATOR (Fallback)
 */
export class MockVideoGenerator implements IVideoGenerator {
  async generate(job: VideoGenerationJob): Promise<VideoGenerationResult> {
    console.log(`[MockVideoGenerator] Starting generation for job ${job.id}...`);
    await new Promise(resolve => setTimeout(resolve, 3000)); 
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
  const generator = new ReplicateVideoGenerator();

  try {
    // 1. Fetch Job
    const { data: job, error: fetchError } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) throw new Error('Job not found');

    // 2. Mark as Processing
    await supabase
      .from('render_jobs')
      .update({ status: 'processing', progress: 10 })
      .eq('id', jobId);

    // 3. Trigger Generation
    const result = await generator.generate({
      id: job.id,
      projectId: job.project_id,
      userId: job.user_id,
      config: job.config_json
    });

    if (result.success && result.videoUrl) {
      // 4. Update Job as Completed
      await supabase
        .from('render_jobs')
        .update({ 
          status: 'completed', 
          progress: 100, 
          output_url: result.videoUrl 
        })
        .eq('id', jobId);

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
    
    await supabase
      .from('render_jobs')
      .update({ 
        status: 'failed', 
        error_log: error.message 
      })
      .eq('id', jobId);
      
    await supabase
      .from('projects')
      .update({ status: 'error' })
      .eq('id', (error as any).projectId || '');
  }
}
