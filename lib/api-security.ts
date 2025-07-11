/**
 * API Security Utility
 * Provides security headers and utilities for API routes
 */

import { NextResponse } from 'next/server'
import { getApiSecurityHeaders } from './security-headers'
import { generateCSP } from './csp-nonce'

export interface ApiSecurityConfig {
  cspReportUri?: string
  hstsMaxAge?: number
  enableCors?: boolean
  corsOrigins?: string[]
  isDevelopment?: boolean
}

/**
 * Apply security headers to API response
 */
export function applyApiSecurityHeaders(
  response: NextResponse,
  config: ApiSecurityConfig = {}
): NextResponse {
  const {
    cspReportUri,
    hstsMaxAge = 31536000,
    enableCors = false,
    corsOrigins = [],
    isDevelopment = false,
  } = config

  // Get security headers
  const securityHeaders = getApiSecurityHeaders({
    cspReportUri,
    hstsMaxAge,
    isDevelopment,
  })

  // Apply security headers
  securityHeaders.forEach(header => {
    response.headers.set(header.key, header.value)
  })

  // Generate and set CSP for API routes
  const csp = generateCSP({
    reportUri: cspReportUri,
    isDevelopment,
  })
  response.headers.set('Content-Security-Policy', csp)

  // Apply CORS headers if enabled
  if (enableCors) {
    const origin = corsOrigins.length > 0 ? corsOrigins.join(', ') : '*'
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
  }

  return response
}

/**
 * Create a secured API response
 */
export function createSecuredApiResponse(
  data: any,
  config: ApiSecurityConfig = {}
): NextResponse {
  const response = NextResponse.json(data)
  return applyApiSecurityHeaders(response, config)
}

/**
 * Create a secured API error response
 */
export function createSecuredApiError(
  error: string,
  status: number = 500,
  config: ApiSecurityConfig = {}
): NextResponse {
  const response = NextResponse.json({ error }, { status })
  return applyApiSecurityHeaders(response, config)
}

/**
 * Security middleware for API routes
 */
export function withApiSecurity(
  handler: (req: Request) => Promise<NextResponse>,
  config: ApiSecurityConfig = {}
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      const response = await handler(req)
      return applyApiSecurityHeaders(response, config)
    } catch (error) {
      console.error('API Security Error:', error)
      return createSecuredApiError('Internal Server Error', 500, config)
    }
  }
}

/**
 * Rate limiting utility (basic implementation)
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs
    
    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || []
    
    // Filter out requests outside the window
    const validRequests = requests.filter(time => time > windowStart)
    
    // Check if under limit
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    // Add current request
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return true
  }
  
  clear() {
    this.requests.clear()
  }
}

/**
 * Apply rate limiting to API response
 */
export function applyRateLimit(
  response: NextResponse,
  identifier: string,
  rateLimiter: RateLimiter
): NextResponse {
  if (!rateLimiter.isAllowed(identifier)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }
  
  return response
}

/**
 * Validate API request security
 */
export function validateApiRequest(req: Request): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Check for required headers
  const contentType = req.headers.get('content-type')
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!contentType || !contentType.includes('application/json')) {
      errors.push('Content-Type must be application/json')
    }
  }
  
  // Check for potential security issues
  const userAgent = req.headers.get('user-agent')
  if (!userAgent || userAgent.length < 10) {
    errors.push('Invalid User-Agent header')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}