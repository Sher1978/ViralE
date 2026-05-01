import { NextRequest, NextResponse } from 'next/server';
import { pexelsService } from '@/lib/services/pexelsService';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query');
  if (!query) return NextResponse.json({ videos: [] });

  console.log('[B-Roll Search] Original query:', query);

  const pexelsKey = process.env.PEXELS_API_KEY || process.env.PEXELS_KEY || process.env.NEXT_PUBLIC_PEXELS_API_KEY;
  const giphyKey = process.env.GIPHY_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  let optimizedQuery = query;

  // 🧠 Smart Translation & Keyword Extraction
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `
        You are a video editor. Translate the following phrase to English 
        and extract 2-3 visual keywords for stock video search.
        Focus on physical objects, actions, or cinematic moods.
        Input: "${query}"
        Return ONLY the keywords separated by spaces.
      `;

      const result = await model.generateContent(prompt);
      const translated = result.response.text().trim().toLowerCase().replace(/[^\w\s]/gi, '');
      if (translated && translated.length > 2) {
        console.log(`[B-Roll Search] Translated: "${query}" -> "${translated}"`);
        optimizedQuery = translated;
      }
    } catch (err) {
      console.error('[B-Roll Search] Translation failed:', err);
    }
  }

  try {
    // 1. Fetch from Pexels
    const pexelsVideos = pexelsKey ? await pexelsService.searchVideos(optimizedQuery, 8) : [];
    
    const pexelsResults = pexelsVideos.map(v => ({
      id: `pexels-${v.id}`,
      source: 'stock',
      title: 'Pexels Clip',
      previewUrl: v.image, 
      videoUrl: v.video_files.find(f => f.quality === 'hd')?.link || v.video_files[0]?.link,
      tags: ['stock', 'cinematic']
    }));

    // 2. Fetch from Giphy (Fallback/Addition)
    let giphyResults: any[] = [];
    if (giphyKey) {
      try {
        const gRes = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${giphyKey}&q=${encodeURIComponent(optimizedQuery)}&limit=4&rating=g`);
        const gData = await gRes.json();
        giphyResults = (gData.data || []).map((g: any) => ({
          id: `giphy-${g.id}`,
          source: 'giphy',
          title: g.title || 'Giphy Clip',
          previewUrl: g.images.fixed_height_still.url,
          videoUrl: g.images.looping?.mp4 || g.images.original.mp4, // HD-ish mp4
          tags: ['giphy', 'dynamic']
        }));
      } catch (e) {
        console.error('[B-Roll Search] Giphy failed:', e);
      }
    }

    const allResults = [...pexelsResults, ...giphyResults];
    console.log(`[B-Roll Search] Found ${allResults.length} total results for "${optimizedQuery}"`);

    return NextResponse.json({ videos: allResults });
  } catch (error: any) {
    console.error('[B-Roll Search] Search failure:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
