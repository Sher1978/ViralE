
export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  video_files: {
    id: number;
    quality: 'hd' | 'sd';
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
}

export const pexelsService = {
  async searchVideos(query: string, perPage: number = 8): Promise<PexelsVideo[]> {
    const apiKey = process.env.NEXT_PUBLIC_PEXELS_API_KEY || process.env.PEXELS_API_KEY;
    
    if (!apiKey) {
      console.warn('[Pexels] API Key missing');
      return [];
    }

    try {
      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}`,
        {
          headers: {
            Authorization: apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.videos || [];
    } catch (error) {
      console.error('[Pexels] Search failed:', error);
      return [];
    }
  }
};
