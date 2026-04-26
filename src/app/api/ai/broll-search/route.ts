import { NextRequest, NextResponse } from 'next/server';
import { pexelsService } from '@/lib/services/pexelsService';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query');
  if (!query) return NextResponse.json({ videos: [] });

  try {
    const videos = await pexelsService.searchVideos(query, 12);
    
    // Map Pexels response to our simpler frontend format
    const results = videos.map(v => ({
      id: v.id.toString(),
      source: 'stock',
      title: 'Pexels Clip',
      previewUrl: v.image, // Thumbnail
      videoUrl: v.video_files.find(f => f.quality === 'hd')?.link || v.video_files[0]?.link,
      tags: []
    }));

    return NextResponse.json({ videos: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
