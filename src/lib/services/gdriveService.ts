import { supabase } from '@/lib/supabase';

export interface GDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  createdTime?: string;
  size?: string;
}

export const gdriveService = {
  /**
   * Initiate Google OAuth with Drive scope for Gmail authenticated user
   */
  async signInWithGoogleDrive(redirectTo?: string): Promise<{ error: any }> {
    try {
      const redirectUrl = redirectTo || (typeof window !== 'undefined' ? window.location.href : '/app/dashboard');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      return { error };
    } catch (err: any) {
      console.error('[GDriveService] Sign in failed:', err);
      return { error: err };
    }
  },

  /**
   * Get active Google provider access token from current session
   */
  async getProviderToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) {
        return session.provider_token;
      }
      // Fallback: check localStorage cache
      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('gdrive_access_token');
        if (storedToken) return storedToken;
      }
      return null;
    } catch (e) {
      console.warn('[GDriveService] Token fetch error:', e);
      return null;
    }
  },

  /**
   * Upload video or media file directly to user's Google Drive
   */
  async uploadFileToDrive(fileBlob: Blob, fileName: string, mimeType: string = 'video/mp4'): Promise<{ fileId?: string; webViewLink?: string; error?: string }> {
    const token = await this.getProviderToken();
    if (!token) {
      return { error: 'Google Drive authorization token not found. Please log in with Google.' };
    }

    try {
      const metadata = {
        name: fileName,
        mimeType: mimeType,
        description: 'Uploaded via ViralEngine'
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', fileBlob, fileName);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Drive upload failed with HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[GDriveService] Upload success:', data);
      return {
        fileId: data.id,
        webViewLink: data.webViewLink
      };
    } catch (err: any) {
      console.error('[GDriveService] Upload failed:', err);
      return { error: err.message || String(err) };
    }
  },

  /**
   * List video files stored in user's Google Drive
   */
  async listUserVideos(): Promise<{ files: GDriveFile[]; error?: string }> {
    const token = await this.getProviderToken();
    if (!token) {
      return { files: [], error: 'Google Drive authorization token not found. Please log in with Google.' };
    }

    try {
      const query = encodeURIComponent("trashed = false and (mimeType contains 'video/' or mimeType contains 'image/')");
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,createdTime,size)&pageSize=30&orderBy=createdTime%20desc`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Drive fetch failed with HTTP ${response.status}`);
      }

      const data = await response.json();
      return { files: data.files || [] };
    } catch (err: any) {
      console.error('[GDriveService] List files failed:', err);
      return { files: [], error: err.message || String(err) };
    }
  }
};
