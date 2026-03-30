import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Optional server-side middleware for route protection.
 *
 * Note: swr-login primarily handles auth on the client side via SWR cache.
 * This middleware demonstrates how you can add an additional server-side guard
 * for sensitive routes (e.g., checking a cookie-based session).
 *
 * For the demo, this middleware is a passthrough — all real auth is handled
 * client-side by AuthGuard and useUser().
 */
export function middleware(request: NextRequest) {
  // In a production app with cookie-based sessions, you could check here:
  //
  // const session = request.cookies.get('session');
  // if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
  //   return NextResponse.redirect(new URL('/', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
