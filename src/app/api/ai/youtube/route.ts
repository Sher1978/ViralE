import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { getAuthContext } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // Ensure user is authenticated
    await getAuthContext();

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Missing YouTube URL' }, { status: 400 });
    }

    // Extract video ID to validate the URL format roughly
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
    if (!isYoutube) {
      return NextResponse.json({ error: 'Неверная ссылка на YouTube (Invalid YouTube URL)' }, { status: 400 });
    }

    console.log(`[YouTubeAPI] Fetching transcript for: ${url}`);
    
    // Fetch transcript
    const transcriptArray = await YoutubeTranscript.fetchTranscript(url);
    
    if (!transcriptArray || transcriptArray.length === 0) {
      throw new Error('No transcript available');
    }

    // Combine all transcript segments into a single string
    const fullTranscript = transcriptArray.map(t => t.text).join(' ');

    console.log(`[YouTubeAPI] Successfully fetched transcript. Length: ${fullTranscript.length} chars`);

    return NextResponse.json({
      success: true,
      transcript: fullTranscript
    });

  } catch (error: any) {
    console.error('[YouTubeAPI] Error:', error);
    
    let userFriendlyError = 'Не удалось получить субтитры с этого видео. Возможно, они отключены или видео недоступно.';
    if (error.message?.includes('No transcripts')) {
      userFriendlyError = 'В этом видео нет доступных субтитров для анализа.';
    }
    
    return NextResponse.json({ 
      error: userFriendlyError,
      details: error.message 
    }, { status: 500 });
  }
}
