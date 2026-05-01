import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query');
  if (!query) return NextResponse.json({ videos: [] });

  console.log('[B-Roll Search] Original query:', query);

  // Используем только серверные ключи
  const pexelsKey = process.env.PEXELS_API_KEY || process.env.PEXELS_KEY;
  const giphyKey = process.env.GIPHY_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!pexelsKey) {
    console.error('[B-Roll Search] PEXELS_API_KEY is missing on server');
    return NextResponse.json({ error: 'Pexels API key missing on server', videos: [] }, { status: 500 });
  }

  let optimizedQuery = query;

  // 🧠 Smart Translation & Keyword Extraction via Gemini
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `
        You are a cinematic video editor. Translate the following phrase to English 
        and extract 2-3 visual, concrete keywords for stock video search.
        Focus on objects, movements, and lighting.
        Input: "${query}"
        Return ONLY the keywords separated by spaces.
        Example: "грустный человек в офисе" -> "man sad office window"
      `;

      const result = await model.generateContent(prompt);
      const translated = result.response.text().trim().toLowerCase().replace(/[^\w\s]/gi, '');
      if (translated && translated.length > 2) {
        console.log(`[B-Roll Search] Gemini Optimized: "${query}" -> "${translated}"`);
        optimizedQuery = translated;
      }
    } catch (err) {
      console.error('[B-Roll Search] Translation failed:', err);
    }
  }

  try {
    // 1. Fetch from Pexels
    const pexelsRes = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(optimizedQuery)}&per_page=10`,
      { headers: { 'Authorization': pexelsKey } }
    );

    let pexelsResults: any[] = [];
    if (pexelsRes.ok) {
      const pexelsData = await pexelsRes.json();
      pexelsResults = (pexelsData.videos || []).map((v: any) => ({
        id: `pexels-${v.id}`,
        source: 'stock',
        title: 'Pexels Clip',
        previewUrl: v.image, 
        videoUrl: v.video_files.find((f: any) => f.quality === 'hd')?.link || v.video_files[0]?.link,
        tags: ['stock', 'pexels']
      })).filter((v: any) => v.videoUrl);
    }

    // 2. Fetch from Pixabay
    let pixabayResults: any[] = [];
    const pixabayKey = process.env.PIXABAY_API_KEY;
    if (pixabayKey) {
      try {
        const pixRes = await fetch(`https://pixabay.com/api/videos/?key=${pixabayKey}&q=${encodeURIComponent(optimizedQuery)}&per_page=10`);
        if (pixRes.ok) {
          const pixData = await pixRes.json();
          pixabayResults = (pixData.hits || []).map((v: any) => ({
            id: `pix-${v.id}`,
            source: 'stock',
            title: 'Pixabay Clip',
            previewUrl: v.userImageURL || v.picture_id ? `https://i.vimeocdn.com/video/${v.picture_id}_640x360.jpg` : '',
            videoUrl: v.videos.medium?.url || v.videos.small?.url || v.videos.large?.url,
            tags: ['stock', 'pixabay']
          })).filter((v: any) => v.videoUrl);
        }
      } catch (e) {
        console.error('[B-Roll Search] Pixabay failed:', e);
      }
    }

    // 3. Fetch from Giphy
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
          videoUrl: g.images.looping?.mp4 || g.images.original.mp4,
          tags: ['giphy', 'dynamic']
        })).filter((v: any) => v.videoUrl);
      } catch (e) {
        console.error('[B-Roll Search] Giphy failed:', e);
      }
    }

    // 3. Fetch from Twelve Labs (Semantic AI)
    let twelveLabsResults: any[] = [];
    const tlKey = process.env.NEXT_PUBLIC_TWELVE_LABS_API_KEY;
    const tlIndex = process.env.NEXT_PUBLIC_TWELVE_LABS_INDEX_ID;
    
    if (tlKey && tlIndex) {
      try {
        console.log('[B-Roll Search] Querying Twelve Labs...');
        const tlRes = await fetch('https://api.twelvelabs.io/v1.3/search', {
          method: 'POST',
          headers: {
            'x-api-key': tlKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            index_id: tlIndex,
            query: optimizedQuery,
            search_options: ['visual']
          })
        });

        if (tlRes.ok) {
          const tlData = await tlRes.json();
          twelveLabsResults = (tlData.data || []).map((v: any) => ({
            id: `tl-${v.video_id}-${v.start}`,
            source: 'movie',
            title: v.metadata?.filename || 'Semantic Clip',
            previewUrl: v.metadata?.video_url || '', // Twelve Labs usually provides a proxy or we use a placeholder
            videoUrl: v.metadata?.video_url || '',
            tags: ['ai', 'semantic', 'movie']
          })).filter((v: any) => v.videoUrl);
        }
      } catch (e) {
        console.error('[B-Roll Search] Twelve Labs failed:', e);
      }
    }

    const allResults = [...twelveLabsResults, ...pixabayResults, ...pexelsResults, ...giphyResults];
    console.log(`[B-Roll Search] Found ${allResults.length} total results (TL: ${twelveLabsResults.length}, PIX: ${pixabayResults.length}, PX: ${pexelsResults.length}, GP: ${giphyResults.length})`);

    return NextResponse.json({ videos: allResults });
  } catch (error: any) {
    console.error('[B-Roll Search] Search failure:', error.message);
    return NextResponse.json({ error: error.message, videos: [] }, { status: 500 });
  }
}
