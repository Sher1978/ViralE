import { NextRequest, NextResponse } from 'next/server';
import { pexelsService } from '@/lib/services/pexelsService';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query');
  if (!query) return NextResponse.json({ videos: [] });

  const apiKey = process.env.GEMINI_API_KEY;
  let optimizedQuery = query;

  // 🧠 Smart Translation & Keyword Extraction using Gemini
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      
      const prompt = `
        You are a visual researcher. Translate the following text to English 
        and extract 2-3 visual keywords for a stock video search (Pexels). 
        Only return the keywords separated by spaces.
        Example Input: "успешный успех и деньги"
        Example Output: "success money growth"
        Input: "${query}"
      `;

      const result = await model.generateContent(prompt);
      const translated = result.response.text().trim().toLowerCase();
      if (translated && translated.length > 2) {
        console.log(`[B-Roll Search] Translated "${query}" -> "${translated}"`);
        optimizedQuery = translated;
      }
    } catch (err) {
      console.error('[B-Roll Search] Translation failed, using original query', err);
    }
  }

  try {
    const videos = await pexelsService.searchVideos(optimizedQuery, 12);
    
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
    console.error('[B-Roll Search] Pexels failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
