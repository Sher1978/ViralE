const API_KEY = process.env.NEXT_PUBLIC_TWELVE_LABS_API_KEY;
const INDEX_ID = process.env.NEXT_PUBLIC_TWELVE_LABS_INDEX_ID;
const BASE_URL = 'https://api.twelvelabs.io/v1.3';

export interface TwelveLabsSearchResult {
  id: string;
  video_id: string;
  score: number;
  start: number;
  end: number;
  metadata: {
    filename: string;
    duration: number;
    video_url?: string;
  };
}

export const twelveLabsService = {
  async search(query: string): Promise<TwelveLabsSearchResult[]> {
    if (!API_KEY || !INDEX_ID) {
      console.warn('[TwelveLabs] API key or Index ID missing');
      return [];
    }

    try {
      const headers: Record<string, string> = {
        'x-api-key': API_KEY as string,
        'Content-Type': 'application/json'
      };
      const response = await fetch(`${BASE_URL}/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          index_id: INDEX_ID,
          query,
          search_options: ['visual'],
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error('[TwelveLabs] Search error:', errData);
        return [];
      }

      const data = await response.json();
      return data.data || [];
    } catch (error: any) {
      console.error('[TwelveLabs] Search exception:', error.message);
      return [];
    }
  },

  async getDownloadUrl(videoId: string): Promise<string | null> {
    try {
      const headers: Record<string, string> = {
        'x-api-key': API_KEY as string
      };
      const response = await fetch(`${BASE_URL}/indexes/${INDEX_ID}/videos/${videoId}`, {
        headers
      });
       
       if (!response.ok) return null;
       const data = await response.json();
       return data.hls?.video_url || data.source?.url || null;
     } catch (e) {
       return null;
     }
  }
};
