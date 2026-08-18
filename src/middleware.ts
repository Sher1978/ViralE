import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

/**
 * STANDARD NEXT.JS MIDDLEWARE
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isI18nBypass = pathname.includes('.') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/_next');

  // Run i18n middleware first to handle locales
  const response = isI18nBypass ? NextResponse.next() : intlMiddleware(request);

  // Inject pathname for server components layout logic
  response.headers.set('x-pathname', pathname);

  // Capture referral code from URL query parameter (?ref=...) and store in cookie for 30 days
  const refParam = request.nextUrl.searchParams.get('ref');
  if (refParam) {
    const cleanRef = refParam.trim().toLowerCase();
    response.cookies.set('viral_ref_code', cleanRef, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    });
  }

  // Bypass Supabase auth checks for static assets, APIs, and auth pages
  const isAuthBypass = isI18nBypass || pathname.includes('/auth');
  if (isAuthBypass) {
    return response;
  }

  // Extract project ref for cookie naming
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectRef = supabaseUrl.split('.')[0].split('//')[1] || '';
  const cookieName = projectRef ? `sb-${projectRef}-auth-token` : '';
  const token = cookieName ? (request.cookies.get(cookieName)?.value || request.cookies.get(`${cookieName}.0`)?.value) : null;

  // Instant redirect for authenticated users on landing page
  const isRoot = pathname === '/' || pathname === '/ru' || pathname === '/en';
  
  if (isRoot && token) {
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    const locale = pathname.startsWith('/ru') 
      ? 'ru' 
      : (pathname.startsWith('/en') 
        ? 'en' 
        : (cookieLocale === 'ru' ? 'ru' : 'en'));
    
    const redirectUrl = new URL(`/${locale}/app/projects`, request.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export default middleware;

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
