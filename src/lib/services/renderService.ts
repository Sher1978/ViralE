import { supabase } from '../supabase';
import { marketingService } from './marketingService';

export interface RenderJob {
  id: string;
  project_id: string;
  version_id: string;
  user_id: string;
  status: 'pending' | 'queued' | 'processing' | 'assembling' | 'completed' | 'failed';
  render_type: 'preview' | 'pro';
  progress: number;
  output_url?: string;
  error_log?: string;
  config_json: any;
  created_at: string;
  updated_at: string;
}

export const renderService = {
  /**
   * Submits a new render job based on project configuration
   */
  async createJob(params: {
    projectId: string;
    versionId: string;
    config: any;
  }): Promise<RenderJob> {
    const { data: profile } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('render_jobs')
      .insert([
        {
          project_id: params.projectId,
          version_id: params.versionId,
          user_id: profile?.user?.id,
          status: 'pending',
          render_type: 'pro',
          config_json: params.config,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating render job:', error);
      throw error;
    }
    return data;
  },

  /**
   * Fetches the current status of a specific job
   */
  async getJobStatus(jobId: string): Promise<RenderJob | null> {
    const { data, error } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Error fetching job status:', error);
      return null;
    }
    return data;
  },

  /**
   * Uploads recorded media to Supabase storage
   */
  async uploadMedia(projectId: string, blob: Blob, type: 'video' | 'audio' | 'image'): Promise<{ assetId: string, publicUrl: string }> {
    const ext = type === 'video' ? 'webm' : type === 'audio' ? 'mp3' : 'png';
    const fileName = `${projectId}/${type}_${Date.now()}.${ext}`;

    const filePath = `user_recordings/${fileName}`;

    // 1. Upload to Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media') // User specified 'videos' or 'media'. schema.sql uses 'media_assets' table.
      .upload(filePath, blob);

    if (uploadError) throw uploadError;

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    // 3. Register Asset
    const { data: asset, error: assetError } = await supabase
      .from('media_assets')
      .insert({
        project_id: projectId,
        file_path: filePath,
        public_url: publicUrl,
        asset_type: type,
        metadata: { studio_recorded: true }
      })
      .select()
      .single();

    if (assetError) throw assetError;

    return { assetId: asset.id, publicUrl };
  },
  /**
   * Saves studio manifest to dedicated table
   */
  async saveManifest(projectId: string, manifest: any, name?: string): Promise<any> {
    const response = await fetch('/api/studio/manifest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, manifest, name })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save manifest');
    }
    
    return response.json();
  },

  /**
   * Fetches the latest active manifest for a project
   */
  async getLatestManifest(projectId: string): Promise<any> {
    const { data, error } = await supabase
      .from('studio_manifests')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.manifest_json || null;
  },

  /**
   * Triggers a final studio render (assembly) from a manifest
   */
  async triggerStudioRender(projectId: string, versionId: string, manifest: any, options: { includeMarketingPackage?: boolean } = {}): Promise<RenderJob> {
    const { data: profile } = await supabase.auth.getUser();

    // Try to get telegram_chat_id from project config
    const { data: project } = await supabase.from('projects').select('config_json').eq('id', projectId).single();
    const telegram_chat_id = project?.config_json?.telegram_chat_id;

    const { data, error } = await supabase
      .from('render_jobs')
      .insert([
        {
          project_id: projectId,
          version_id: versionId,
          user_id: profile?.user?.id,
          status: 'pending',
          render_type: 'pro',
          config_json: { 
            manifest,
            assembly_mode: true,
            telegram_chat_id,
            generate_marketing_package: options.includeMarketingPackage || false
          },
        },
      ])
      .select()
      .single();

    if (error) throw error;
    
    // 4. Update project status
    await supabase
      .from('projects')
      .update({ status: 'rendering' })
      .eq('id', projectId).catch((e: any) => console.error("Update status error", e));

    // 5. Trigger Marketing Package if requested
    if (options.includeMarketingPackage) {
      marketingService.generatePackage(projectId, manifest).catch((err: any) => {
        console.error('[RenderService] Failed to trigger marketing package:', err);
      });
    }

    return data;
  },

  async getBrollSuggestions(tags: string[]): Promise<string[]> {
    // In production, this calls internal Giphy/Mixkit scrapers
    // For now, returning curated high-motion placeholders
    const emotion = tags[0]?.toLowerCase() || 'dynamic';
    
    const giphyMocks: Record<string, string[]> = {
      'excited': [
        'https://media.giphy.com/media/l41lTfuxV6M0SCSvC/giphy.gif',
        'https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif',
        'https://media.giphy.com/media/3o7TKSjPqcK9I9sJk0/giphy.gif'
      ],
      'fear': [
        'https://media.giphy.com/media/l1J9vJ8E6L4f7L9kY/giphy.gif',
        'https://media.giphy.com/media/26AHON43y3dG2G7RK/giphy.gif'
      ],
      'happy': [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHU4dzRyZnd4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlHFRbmaZtBRhXG/giphy.gif'
      ]
    };

    return giphyMocks[emotion] || [
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHU4dzRyZnd4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKMGpx4Z5pPH0Ws/giphy.gif',
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHU4dzRyZnd4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26AHON43y3dG2G7RK/giphy.gif'
    ];
  }
};
