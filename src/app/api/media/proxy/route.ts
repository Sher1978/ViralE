import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaUrl = searchParams.get('url');

    if (!mediaUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    let targetUrl = mediaUrl.trim();
    if (targetUrl.startsWith('http://')) {
      targetUrl = targetUrl.replace('http://', 'https://');
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    let res = await fetch(targetUrl, { headers });

    if (!res.ok && mediaUrl.startsWith('http://')) {
      // Retry with original http if https upgrade failed
      res = await fetch(mediaUrl, { headers });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch media stream (${res.status})` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get('content-type') || 'audio/mpeg';
    const contentLength = res.headers.get('content-length');

    const resHeaders = new Headers();
    resHeaders.set('Content-Type', contentType);
    resHeaders.set('Access-Control-Allow-Origin', '*');
    resHeaders.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    resHeaders.set('Accept-Ranges', 'bytes');
    if (contentLength) {
      resHeaders.set('Content-Length', contentLength);
    }

    return new NextResponse(res.body, {
      status: 200,
      headers: resHeaders,
    });
  } catch (e: any) {
    console.error('[MediaProxy] Error proxying media:', e);
    return NextResponse.json({ error: e.message || 'Internal proxy error' }, { status: 500 });
  }
}
