import { supabase } from '../supabase';

export const storageService = {
  /**
   * Uploads a file to a Supabase bucket and returns the public URL.
   * Bucket name defaults to 'temp-assets'.
   */
  async uploadFile(file: File | Blob, path: string, bucket: string = 'temp-assets'): Promise<string | null> {
    try {
      const fileName = `${Date.now()}_${path}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('[Storage] Upload error details:', {
          message: error.message,
          statusCode: (error as any).statusCode,
          error: (error as any).error
        });
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.error('[Storage] Unexpected error:', err);
      return null;
    }
  },

  /**
   * If a URL points to our Supabase Storage, converts it to a Signed URL valid for 60 minutes.
   * Otherwise, returns the original URL as-is.
   */
  async getSignedUrlIfNeeded(url: string): Promise<string> {
    if (!url) return url;
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!supabaseUrl || !url.startsWith(supabaseUrl)) {
      return url; // External URL (e.g. stock footage/Pexels), no signing needed
    }

    try {
      // Supabase Storage URL structure: 
      // [supabaseUrl]/storage/v1/object/[public/authenticated]/[bucket]/[path...]
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/');
      
      const objectIdx = parts.indexOf('object');
      if (objectIdx === -1 || parts.length <= objectIdx + 3) {
        return url;
      }
      
      const bucket = parts[objectIdx + 2];
      const path = parts.slice(objectIdx + 3).join('/');
      
      const { supabaseAdmin } = await import('../supabase');
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hour expiration
        
      if (error || !data?.signedUrl) {
        console.error('[Storage] Error generating signed URL:', error);
        return url; // fallback to original public URL
      }
      
      return data.signedUrl;
    } catch (err) {
      console.error('[Storage] Failed to sign URL:', err);
      return url;
    }
  },

  /**
   * Deletes all files in Supabase Storage associated with a specific project.
   */
  async deleteProjectFiles(projectId: string): Promise<{ success: boolean; deletedCount: number; error?: any }> {
    try {
      const { supabaseAdmin } = await import('../supabase');
      const folderPath = `user_recordings/${projectId}`;

      // 1. List files in the folder
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from('media')
        .list(folderPath);

      if (listError) {
        console.error(`[Storage] Failed to list files in folder ${folderPath}:`, listError);
        return { success: false, deletedCount: 0, error: listError };
      }

      if (!files || files.length === 0) {
        console.log(`[Storage] No files found in folder ${folderPath} to delete.`);
        return { success: true, deletedCount: 0 };
      }

      // 2. Map files to their full paths within the bucket
      const pathsToDelete = files.map((file: any) => `${folderPath}/${file.name}`);

      // 3. Delete files
      const { data: deleted, error: deleteError } = await supabaseAdmin.storage
        .from('media')
        .remove(pathsToDelete);

      if (deleteError) {
        console.error(`[Storage] Failed to delete files for project ${projectId}:`, deleteError);
        return { success: false, deletedCount: 0, error: deleteError };
      }

      console.log(`[Storage] Successfully deleted ${deleted?.length || 0} files for project ${projectId}.`);
      return { success: true, deletedCount: deleted?.length || 0 };
    } catch (err) {
      console.error('[Storage] Unexpected error during project file cleanup:', err);
      return { success: false, deletedCount: 0, error: err };
    }
  }
};

