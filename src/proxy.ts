import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

/**
 * CUSTOM PROXY MIDDLEWARE
 * Note: This project uses 'proxy.ts' instead of 'middleware.ts' due to custom Next.js build constraints.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Run i18n middleware first to handle locales
  const response = intlMiddleware(request);

  // 2. Inject pathname for server components layout logic
  response.headers.set('x-pathname', pathname);

  // 3. Fast Auth Redirect Optimization
  if (
    pathname.includes('.') || 
    pathname.startsWith('/api') || 
    pathname.startsWith('/_next') ||
    pathname.startsWith('/auth')
  ) {
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

// Export as default for standard Next.js compatibility (if any)
export default proxy;

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
