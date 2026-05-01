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
        console.error('[Storage] Upload error:', error);
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
  }
};
