import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  const publicPaths = [
    '/',
    '/api/auth',
    '/favicon.ico',
    '/_next',
    '/static',
    '/auth',
  ]

  // Check if path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  if (isPublicPath)
    return NextResponse.next()

  // For now, just continue - authentication will be handled client-side
  // This can be enhanced later with server-side auth validation
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
