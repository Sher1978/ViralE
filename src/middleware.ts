import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Run i18n middleware first to handle locales
  const response = intlMiddleware(request);

  // 2. Inject pathname for server components layout logic (breadcrumbing, active states)
  response.headers.set('x-pathname', pathname);

  // 3. Fast Auth Redirect Optimization
  // We check for the Supabase auth token cookie directly in the middleware
  // to avoid the "Landing Page -> Client Auth Check -> Redirect" delay.
  
  // Skip checks for static assets, API routes, and internal Next.js paths
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

  // If the user is on the landing page but is already authenticated,
  // redirect them to the app dashboard immediately.
  const isRoot = pathname === '/' || pathname === '/ru' || pathname === '/en';
  
  if (isRoot && token) {
    // Determine locale from path or default
    const locale = pathname.startsWith('/en') ? 'en' : 'ru';
    const redirectUrl = new URL(`/${locale}/app/projects`, request.url);
    console.log(`[Middleware] Fast redirecting authenticated user to ${redirectUrl.pathname}`);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  // Match all pathnames except API routes, static files, and metadata
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
