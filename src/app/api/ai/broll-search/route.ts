import { NextRequest, NextResponse } from 'next/server';
import { pexelsService } from '@/lib/services/pexelsService';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query');
  if (!query) return NextResponse.json({ videos: [] });

  // 🧠 Smart Keyword Extraction: Pexels hates long sentences.
  // If the query looks like a quote or long prompt, we simplify it.
  let optimizedQuery = query;
  if (query.split(' ').length > 4) {
    // Strategy: Take the last 3-5 words if it's a generated prompt, 
    // or try to extract visual nouns if it's a quote.
    // For now, let's take the first 4 words as a pragmatic fallback.
    optimizedQuery = query.split(' ').slice(0, 5).join(' ');
  }

  try {
    const videos = await pexelsService.searchVideos(optimizedQuery, 12);
    
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
