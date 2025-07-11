import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { generateMiddlewareCSP } from './lib/csp-nonce'

export async function middleware(request: NextRequest) {
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

  // Note: Rate limiting moved to API routes to avoid Edge Runtime limitations
  // Each API route will handle its own rate limiting

  // Create response
  const response = NextResponse.next()

  // Rate limiting is handled in individual API routes

  // Generate CSP with nonce for script security
  const isDevelopment = process.env.NODE_ENV === 'development'
  const cspConfig = {
    reportUri: process.env.CSP_REPORT_URI,
    isDevelopment,
    enableReportOnly: isDevelopment, // Use report-only mode in development
  }

  const { headerName, headerValue, nonce } = generateMiddlewareCSP(cspConfig)

  // Set Content Security Policy header
  response.headers.set(headerName, headerValue)

  // Store nonce for use in components (if needed)
  // This can be accessed via request headers in API routes or server components
  response.headers.set('x-nonce', nonce)

  // Add additional security headers specific to middleware
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

  if (isPublicPath) {
    return response
  }

  // For now, just continue - authentication will be handled client-side
  // This can be enhanced later with server-side auth validation
  return response
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
