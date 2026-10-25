import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getNormalizedContentType(url: string, upstreamType: string | null): string {
  const cleanUrl = url.toLowerCase().split('?')[0];
  if (cleanUrl.endsWith('.mp4')) return 'video/mp4';
  if (cleanUrl.endsWith('.webm')) return 'video/webm';
  if (cleanUrl.endsWith('.mp3')) return 'audio/mpeg';
  if (cleanUrl.endsWith('.wav')) return 'audio/wav';
  if (cleanUrl.endsWith('.m4a')) return 'audio/mp4';
  if (cleanUrl.endsWith('.ogg')) return 'audio/ogg';

  if (upstreamType && !upstreamType.includes('octet-stream')) {
    return upstreamType;
  }

  // Fallback if upstream sent binary/octet-stream but url contains mp4 query
  if (url.toLowerCase().includes('.mp4')) return 'video/mp4';
  return 'video/mp4';
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
    },
  });
}

export async function HEAD(req: NextRequest) {
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

    const forwardHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    const range = req.headers.get('range');
    if (range) {
      forwardHeaders['Range'] = range;
    }

    const res = await fetch(targetUrl, { method: 'HEAD', headers: forwardHeaders });
    const contentType = getNormalizedContentType(targetUrl, res.headers.get('content-type'));
    const contentLength = res.headers.get('content-length');
    const contentRange = res.headers.get('content-range');

    const resHeaders = new Headers();
    resHeaders.set('Content-Type', contentType);
    resHeaders.set('Access-Control-Allow-Origin', '*');
    resHeaders.set('Accept-Ranges', 'bytes');
    resHeaders.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    if (contentLength) resHeaders.set('Content-Length', contentLength);
    if (contentRange) resHeaders.set('Content-Range', contentRange);

    return new NextResponse(null, {
      status: res.status === 206 ? 206 : 200,
      headers: resHeaders,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'HEAD error' }, { status: 500 });
  }
}

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

    const forwardHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    const range = req.headers.get('range');
    if (range) {
      forwardHeaders['Range'] = range;
    }

    let res = await fetch(targetUrl, { headers: forwardHeaders });

    if (!res.ok && mediaUrl.startsWith('http://')) {
      // Retry with original http if https upgrade failed
      res = await fetch(mediaUrl, { headers: forwardHeaders });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch media stream (${res.status})` },
        { status: res.status }
      );
    }

    const contentType = getNormalizedContentType(targetUrl, res.headers.get('content-type'));
    const contentLength = res.headers.get('content-length');
    const contentRange = res.headers.get('content-range');

    const resHeaders = new Headers();
    resHeaders.set('Content-Type', contentType);
    resHeaders.set('Access-Control-Allow-Origin', '*');
    resHeaders.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    resHeaders.set('Accept-Ranges', 'bytes');
    if (contentLength) resHeaders.set('Content-Length', contentLength);
    if (contentRange) resHeaders.set('Content-Range', contentRange);

    return new NextResponse(res.body, {
      status: res.status === 206 ? 206 : 200,
      headers: resHeaders,
    });
  } catch (e: any) {
    console.error('[MediaProxy] Error proxying media:', e);
    return NextResponse.json({ error: e.message || 'Internal proxy error' }, { status: 500 });
  }
}
