import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  // Inject pathname for server components layout logic
  response.headers.set('x-pathname', request.nextUrl.pathname);
  return response;
}

export const config = {
  // Match all pathnames except API routes, static files, and metadata
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
