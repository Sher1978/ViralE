import { NextRequest, NextResponse } from 'next/server';
import { pexelsService } from '@/lib/services/pexelsService';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query');
  if (!query) return NextResponse.json({ videos: [] });

  console.log('[B-Roll Search] Original query:', query);

  // Check for both common Pexels key names
  const pexelsKey = process.env.PEXELS_API_KEY || process.env.PEXELS_KEY || process.env.NEXT_PUBLIC_PEXELS_API_KEY;
  if (!pexelsKey) {
    console.error('[B-Roll Search] Pexels API key is missing on server');
    return NextResponse.json({ error: 'Pexels API key missing' }, { status: 500 });
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  let optimizedQuery = query;

  // 🧠 Smart Translation & Keyword Extraction
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      // Using 1.5-flash for search as it's more stable for small tasks
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `
        Translate to English and extract 2-3 visual keywords for stock video search. 
        Only return the keywords separated by spaces.
        Input: "${query}"
      `;

      const result = await model.generateContent(prompt);
      const translated = result.response.text().trim().toLowerCase();
      if (translated && translated.length > 2) {
        console.log(`[B-Roll Search] Translated: "${query}" -> "${translated}"`);
        optimizedQuery = translated;
      }
    } catch (err) {
      console.error('[B-Roll Search] Translation failed:', err);
    }
  }

  try {
    // Inject the key manually if needed (though service should handle it, we'll be safe)
    const videos = await pexelsService.searchVideos(optimizedQuery, 12);
    console.log(`[B-Roll Search] Found ${videos.length} videos for "${optimizedQuery}"`);
    
    const results = videos.map(v => ({
      id: v.id.toString(),
      source: 'stock',
      title: 'Pexels Clip',
      previewUrl: v.image, 
      videoUrl: v.video_files.find(f => f.quality === 'hd')?.link || v.video_files[0]?.link,
      tags: []
    }));

    return NextResponse.json({ videos: results });
  } catch (error: any) {
    console.error('[B-Roll Search] Pexels failure:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
