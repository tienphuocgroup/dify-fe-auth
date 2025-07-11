import { NextRequest, NextResponse } from 'next/server'

/**
 * Simplified rate limiting for API routes
 * Uses in-memory storage to avoid Edge Runtime issues
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory rate limit storage
const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  skipOnError?: boolean
}

export const RATE_LIMIT_CONFIGS = {
  api: {
    maxRequests: parseInt(process.env.RATE_LIMIT_API_REQUESTS || '100'),
    windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW || '60') * 1000,
  },
  auth: {
    maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_REQUESTS || '20'),
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '60') * 1000,
  },
  upload: {
    maxRequests: parseInt(process.env.RATE_LIMIT_UPLOAD_REQUESTS || '10'),
    windowMs: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW || '60') * 1000,
  },
  chat: {
    maxRequests: parseInt(process.env.RATE_LIMIT_CHAT_REQUESTS || '50'),
    windowMs: parseInt(process.env.RATE_LIMIT_CHAT_WINDOW || '60') * 1000,
  },
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const clientIP = request.headers.get('x-client-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (clientIP) {
    return clientIP
  }
  
  return request.ip || 'unknown'
}

/**
 * Simple rate limiting check
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{
  allowed: boolean
  remaining: number
  resetTime: number
  response?: NextResponse
}> {
  try {
    const identifier = getClientIP(request)
    const key = `${identifier}:${Date.now() - (Date.now() % config.windowMs)}`
    const now = Date.now()
    
    // Clean up old entries
    const cutoff = now - config.windowMs
    for (const [k, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < cutoff) {
        rateLimitStore.delete(k)
      }
    }
    
    // Get or create entry
    let entry = rateLimitStore.get(key)
    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      }
      rateLimitStore.set(key, entry)
    }
    
    // Increment count
    entry.count += 1
    
    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
        },
        { status: 429 }
      )
      
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString())
      response.headers.set('Retry-After', Math.ceil((entry.resetTime - now) / 1000).toString())
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        response,
      }
    }
    
    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime,
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    
    // If skipOnError is true, allow the request
    if (config.skipOnError) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs,
      }
    }
    
    // Otherwise, return error response
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + config.windowMs,
      response: NextResponse.json(
        { error: 'Rate limiting service unavailable' },
        { status: 500 }
      ),
    }
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetTime: number,
  maxRequests: number
): void {
  response.headers.set('X-RateLimit-Limit', maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())
}

/**
 * Create rate limit wrapper for API routes
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResult = await checkRateLimit(request, config)
    
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!
    }
    
    const response = await handler(request)
    
    // Add rate limit headers
    addRateLimitHeaders(
      response,
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      config.maxRequests
    )
    
    return response
  }
}

/**
 * Periodic cleanup of old rate limit entries
 */
setInterval(() => {
  const now = Date.now()
  const cutoff = now - (5 * 60 * 1000) // 5 minutes ago
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < cutoff) {
      rateLimitStore.delete(key)
    }
  }
}, 60 * 1000) // Run every minute

export default {
  checkRateLimit,
  addRateLimitHeaders,
  withRateLimit,
  RATE_LIMIT_CONFIGS,
}