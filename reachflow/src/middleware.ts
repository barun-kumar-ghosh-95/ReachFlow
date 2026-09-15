// src/middleware.ts
// Protect app routes from unauthenticated access

export { auth as middleware } from '@/lib/auth'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/contacts/:path*',
    '/campaigns/:path*',
    '/templates/:path*',
    '/analytics/:path*',
    '/billing/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
}
