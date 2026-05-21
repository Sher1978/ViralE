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
    console.log(`[renderService LOG] Starting uploadMedia. projectId = ${projectId}, type = ${type}, blobSize = ${(blob.size / (1024 * 1024)).toFixed(2)} MB, blobType = "${blob.type}"`);
    
    // Defensive check before uploading to Supabase Storage
    if (type === 'video' && blob.size < 50000) {
      throw new Error(`Записываемый видеофайл пуст или поврежден (${(blob.size / 1024).toFixed(1)} KB). Пожалуйста, сделайте запись заново.`);
    }
    if (type === 'audio' && blob.size < 3000) {
      throw new Error(`Записываемый аудиофайл пуст или поврежден (${(blob.size / 1024).toFixed(1)} KB). Пожалуйста, сделайте запись заново.`);
    }

    // Determine correct extension and content-type from blob.type (handles all WebM codec variants)
    let ext: string;
    let contentType: string;

    const blobType = blob.type || '';
    if (blobType.includes('mp4') || blobType.includes('avc')) {
      ext = 'mp4'; contentType = 'video/mp4';
    } else if (blobType.includes('quicktime') || blobType.includes('mov')) {
      ext = 'mov'; contentType = 'video/quicktime';
    } else if (blobType.includes('webm') || blobType.startsWith('video/')) {
      ext = 'webm'; contentType = 'video/webm';
    } else if (blobType.includes('audio/mp4') || blobType.includes('audio/aac')) {
      ext = 'mp4'; contentType = 'audio/mp4';
    } else if (blobType.includes('audio/webm') || blobType.includes('audio/ogg')) {
      ext = 'webm'; contentType = 'audio/webm';
    } else if (blobType.includes('audio/')) {
      ext = 'mp3'; contentType = 'audio/mpeg';
    } else if (blobType.includes('image/png')) {
      ext = 'png'; contentType = 'image/png';
    } else if (blobType.includes('image/jpeg') || blobType.includes('image/jpg')) {
      ext = 'jpg'; contentType = 'image/jpeg';
    } else {
      // Fallback based on type param
      ext = type === 'video' ? 'webm' : type === 'audio' ? 'mp3' : 'png';
      contentType = type === 'video' ? 'video/webm' : type === 'audio' ? 'audio/mpeg' : 'image/png';
    }

    const fileName = `${projectId}/${type}_${Date.now()}.${ext}`;
    const filePath = `user_recordings/${fileName}`;

    console.log(`[renderService LOG] Preparing upload to: "${filePath}". contentType: "${contentType}".`);

    // *** CRITICAL FIX: Convert Blob → ArrayBuffer before upload ***
    // The Supabase JS SDK v2 sometimes fails to stream bytes from a 'raw' browser Blob
    // (created from fetch(blob:URL)) and silently uploads 0 bytes.
    // Reading the entire blob into an ArrayBuffer first guarantees all bytes are present in memory
    // and forces a reliable, buffered upload every single time.
    console.log(`[renderService LOG] Loading blob into ArrayBuffer (converting blob to buffer)...`);
    const tBufStart = performance.now();
    const arrayBuffer = await blob.arrayBuffer();
    console.log(`[renderService LOG] ArrayBuffer ready. byteLength: ${arrayBuffer.byteLength} bytes. Time taken: ${(performance.now() - tBufStart).toFixed(0)} ms.`);

    if (arrayBuffer.byteLength < 100) {
      throw new Error(`ArrayBuffer пустой (${arrayBuffer.byteLength} байт). Похоже, blob:URL был отозван до загрузки. Пожалуйста, сделайте запись заново.`);
    }

    // 1. Upload to Storage (with 60s timeout for large mobile videos)
    console.log(`[renderService LOG] Initiating Supabase upload to bucket "media"...`);
    const tUploadStart = performance.now();
    const uploadPromise = supabase.storage
      .from('media')
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true
      });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Upload timeout after 60s — check network connection')), 60000)
    );

    const { data: uploadData, error: uploadError } = await Promise.race([
      uploadPromise,
      timeoutPromise as any
    ]) as any;

    if (uploadError) {
      console.error(`[renderService LOG] Supabase upload failed after ${(performance.now() - tUploadStart).toFixed(0)} ms. Error details:`, uploadError);
      throw uploadError;
    }
    console.log(`[renderService LOG] Supabase upload successful! Time taken: ${(performance.now() - tUploadStart).toFixed(0)} ms.`);

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);
    console.log(`[renderService LOG] Generated public URL: "${publicUrl}"`);

    // 3. Register Asset
    console.log(`[renderService LOG] Registering media asset in Database...`);
    const tDbStart = performance.now();
    const { data: asset, error: assetError } = await supabase
      .from('media_assets')
      .insert({
        project_id: projectId,
        file_path: filePath,
        public_url: publicUrl,
        asset_type: type,
        metadata: { studio_recorded: true, original_size: blob.size }
      })
      .select()
      .single();

    if (assetError) {
      console.error(`[renderService LOG] Database asset registration failed. Error details:`, assetError);
      throw assetError;
    }

    console.log(`[renderService LOG] Media asset registration successful! assetId: ${asset.id}. Time taken: ${(performance.now() - tDbStart).toFixed(0)} ms.`);
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
