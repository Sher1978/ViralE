import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

/**
 * STANDARD NEXT.JS MIDDLEWARE
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isBypass = pathname.includes('.') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/_next') ||
    pathname.startsWith('/auth');

  // Run i18n middleware first to handle locales
  const response = isBypass ? NextResponse.next() : intlMiddleware(request);

  // Inject pathname for server components layout logic
  response.headers.set('x-pathname', pathname);

  if (isBypass) {
    return response;
  }

  // Extract project ref for cookie naming
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectRef = supabaseUrl.match(/(?:https?:\/\/)?([^.]+)/)?.[1];
  const cookieName = projectRef ? `sb-${projectRef}-auth-token` : '';
  const token = cookieName ? (request.cookies.get(cookieName)?.value || request.cookies.get(`${cookieName}.0`)?.value) : null;

  // Instant redirect for authenticated users on landing page
  const isRoot = pathname === '/' || pathname === '/ru' || pathname === '/en';
  
  if (isRoot && token) {
    const locale = pathname.startsWith('/en') ? 'en' : 'ru';
    const redirectUrl = new URL(`/${locale}/app/projects`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export default middleware;

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
