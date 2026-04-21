import { supabase } from '../supabase';

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
  async uploadMedia(projectId: string, blob: Blob, type: 'video' | 'audio'): Promise<{ assetId: string, publicUrl: string }> {
    const fileName = `${projectId}/${type}_${Date.now()}.${blob.type.includes('video') ? 'webm' : 'webm'}`;
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
    const { data, error } = await supabase
      .from('studio_manifests')
      .insert({
        project_id: projectId,
        manifest_json: manifest,
        name: name || `Draft ${new Date().toLocaleTimeString()}`,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
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
  async triggerStudioRender(projectId: string, versionId: string, manifest: any): Promise<RenderJob> {
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
            telegram_chat_id
          },
        },
      ])
      .select()
      .single();

    if (error) throw error;
    
    // Also update project status
    await supabase
      .from('projects')
      .update({ status: 'rendering' })
      .eq('id', projectId);

    return data;
  }
};
