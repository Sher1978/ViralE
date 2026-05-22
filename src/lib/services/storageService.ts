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
  }
};

