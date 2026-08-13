import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { supabase } from '../supabase';

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

export const storageService = {
  /**
   * Uploads a file directly using S3/R2 client on Node.js server environment,
   * falling back to Supabase storage if R2 is not configured.
   */
  async uploadFileDirect(file: File | Blob, path: string, bucket: string = 'media'): Promise<string | null> {
    try {
      const fileName = `${Date.now()}_${path.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
      const r2 = getR2Client();
      const r2PublicDomain = process.env.R2_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN;

      // 1. Try Cloudflare R2 Upload if configured
      if (r2 && r2PublicDomain) {
        const bucketName = process.env.R2_BUCKET_NAME || 'virale';
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await r2.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: buffer,
          ContentType: file.type || 'application/octet-stream'
        }));

        const cleanDomain = r2PublicDomain.replace(/\/$/, '');
        const fileUrl = `${cleanDomain}/${fileName}`;
        console.log(`[Storage] Uploaded successfully to Cloudflare R2: ${fileUrl}`);
        return fileUrl;
      }

      // 2. Fallback to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('[Storage] Supabase Upload error details:', {
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
      console.error('[Storage] Unexpected error during file upload:', err);
      return null;
    }
  },

  /**
   * Main entry point for uploading files.
   * If called from the browser, routes request to /api/storage/upload API route.
   * If called on the server, executes direct upload.
   */
  async uploadFile(file: File | Blob, path: string, bucket: string = 'media'): Promise<string | null> {
    if (typeof window !== 'undefined') {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);
        formData.append('bucket', bucket);

        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) return data.url;
        }
      } catch (clientErr) {
        console.warn('[Storage] Client API upload failed, attempting fallback...', clientErr);
      }
    }

    return this.uploadFileDirect(file, path, bucket);
  },

  /**
   * If a URL points to Supabase Storage, converts it to a Signed URL valid for 60 minutes.
   * If it's a Cloudflare R2 or external URL, returns the original public URL directly.
   */
  async getSignedUrlIfNeeded(url: string): Promise<string> {
    if (!url) return url;
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (!supabaseUrl || !url.startsWith(supabaseUrl)) {
      return url; // R2 or external URL, no signed URL needed!
    }

    try {
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
        .createSignedUrl(path, 3600);
        
      if (error || !data?.signedUrl) {
        console.error('[Storage] Error generating signed URL:', error);
        return url;
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

      const { data: files, error: listError } = await supabaseAdmin.storage
        .from('media')
        .list(folderPath);

      if (listError) {
        console.error(`[Storage] Failed to list files in folder ${folderPath}:`, listError);
        return { success: false, deletedCount: 0, error: listError };
      }

      if (!files || files.length === 0) {
        return { success: true, deletedCount: 0 };
      }

      const pathsToDelete = files.map((file: any) => `${folderPath}/${file.name}`);

      const { data: deleted, error: deleteError } = await supabaseAdmin.storage
        .from('media')
        .remove(pathsToDelete);

      if (deleteError) {
        console.error(`[Storage] Failed to delete files for project ${projectId}:`, deleteError);
        return { success: false, deletedCount: 0, error: deleteError };
      }

      return { success: true, deletedCount: deleted?.length || 0 };
    } catch (err) {
      console.error('[Storage] Unexpected error during project file cleanup:', err);
      return { success: false, deletedCount: 0, error: err };
    }
  }
};
