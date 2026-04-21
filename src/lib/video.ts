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
 * MOCK GENERATOR
 * Used for testing the pipeline skeleton without spending credits/API keys
 */
export class MockVideoGenerator implements IVideoGenerator {
  async generate(job: VideoGenerationJob): Promise<VideoGenerationResult> {
    console.log(`[MockVideoGenerator] Starting generation for job ${job.id}...`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 8000)); 

    // Return a cinematic placeholder video
    return {
      success: true,
      videoUrl: 'https://cdn.pixabay.com/video/2023/10/22/186105-877322960_tiny.mp4' // High-tech placeholder
    };
  }
}

/**
 * ORCHESTRATOR
 * Handles job states and storage integration
 */
export async function processVideoJob(jobId: string) {
  const generator = new MockVideoGenerator();

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
