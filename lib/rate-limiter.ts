import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible'
import { NextRequest, NextResponse } from 'next/server'
import Redis from 'ioredis'

/**
 * Rate limiting implementation for API protection
 * Uses Redis for production, in-memory for development
 */

export interface RateLimitConfig {
  keyPrefix?: string
  points: number        // Number of requests
  duration: number      // Per duration in seconds
  blockDuration?: number // Block duration in seconds (defaults to duration)
  execEvenly?: boolean   // Spread requests evenly across duration
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  used: number
  remaining: number
  resetTime: Date
  retryAfter?: number
}

class RateLimiterService {
  private redis: Redis | null = null
  private limiters: Map<string, RateLimiterRedis | RateLimiterMemory> = new Map()
  private useRedis: boolean = false

  constructor() {
    this.useRedis = process.env.NODE_ENV === 'production' || !!process.env.REDIS_HOST
    
    if (this.useRedis) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        lazyConnect: true,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
      })
    }
  }

  private getLimiter(key: string, config: RateLimitConfig): RateLimiterRedis | RateLimiterMemory {
    if (!this.limiters.has(key)) {
      const options = {
        keyPrefix: config.keyPrefix || key,
        points: config.points,
        duration: config.duration,
        blockDuration: config.blockDuration || config.duration,
        execEvenly: config.execEvenly || false,
      }

      let limiter: RateLimiterRedis | RateLimiterMemory

      if (this.useRedis && this.redis) {
        limiter = new RateLimiterRedis({
          ...options,
          storeClient: this.redis,
        })
      } else {
        limiter = new RateLimiterMemory(options)
      }

      this.limiters.set(key, limiter)
    }

    return this.limiters.get(key)!
  }

  async checkLimit(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const limiter = this.getLimiter(config.keyPrefix || 'default', config)

    try {
      const result = await limiter.consume(identifier, 1)
      
      return {
        allowed: true,
        limit: config.points,
        used: config.points - result.remainingPoints,
        remaining: result.remainingPoints,
        resetTime: new Date(Date.now() + result.msBeforeNext),
      }
    } catch (rateLimiterRes: any) {
      if (rateLimiterRes.remainingPoints !== undefined) {
        return {
          allowed: false,
          limit: config.points,
          used: config.points - rateLimiterRes.remainingPoints,
          remaining: rateLimiterRes.remainingPoints,
          resetTime: new Date(Date.now() + rateLimiterRes.msBeforeNext),
          retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000),
        }
      }
      
      // Handle other errors by allowing the request (fail open)
      console.error('Rate limiter error:', rateLimiterRes)
      return {
        allowed: true,
        limit: config.points,
        used: 0,
        remaining: config.points,
        resetTime: new Date(Date.now() + config.duration * 1000),
      }
    }
  }

  async resetLimit(identifier: string, keyPrefix: string = 'default'): Promise<void> {
    const limiter = this.limiters.get(keyPrefix)
    if (limiter) {
      try {
        await limiter.delete(identifier)
      } catch (error) {
        console.error('Failed to reset rate limit:', error)
      }
    }
  }

  async getStats(identifier: string, keyPrefix: string = 'default'): Promise<{ points: number; remaining: number } | null> {
    const limiter = this.limiters.get(keyPrefix)
    if (!limiter) {
      return null
    }

    try {
      const result = await limiter.get(identifier)
      return result ? {
        points: result.totalHits,
        remaining: result.remainingPoints || 0,
      } : null
    } catch (error) {
      console.error('Failed to get rate limit stats:', error)
      return null
    }
  }
}

// Singleton instance
const rateLimiterService = new RateLimiterService()

// Rate limiting configurations
export const RATE_LIMIT_CONFIGS = {
  // General API endpoints
  api: {
    keyPrefix: 'api',
    points: parseInt(process.env.RATE_LIMIT_API_REQUESTS || '100'),
    duration: parseInt(process.env.RATE_LIMIT_API_WINDOW || '60'), // 60 seconds
    blockDuration: 60, // 1 minute block
  },
  
  // Authentication endpoints
  auth: {
    keyPrefix: 'auth',
    points: parseInt(process.env.RATE_LIMIT_AUTH_REQUESTS || '20'),
    duration: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '60'), // 60 seconds
    blockDuration: 300, // 5 minutes block
  },
  
  // File upload endpoints
  upload: {
    keyPrefix: 'upload',
    points: parseInt(process.env.RATE_LIMIT_UPLOAD_REQUESTS || '10'),
    duration: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW || '60'), // 60 seconds
    blockDuration: 120, // 2 minutes block
  },
  
  // Chat/messaging endpoints
  chat: {
    keyPrefix: 'chat',
    points: parseInt(process.env.RATE_LIMIT_CHAT_REQUESTS || '50'),
    duration: parseInt(process.env.RATE_LIMIT_CHAT_WINDOW || '60'), // 60 seconds
    blockDuration: 60, // 1 minute block
  },
  
  // Strict limits for sensitive operations
  sensitive: {
    keyPrefix: 'sensitive',
    points: parseInt(process.env.RATE_LIMIT_SENSITIVE_REQUESTS || '5'),
    duration: parseInt(process.env.RATE_LIMIT_SENSITIVE_WINDOW || '60'), // 60 seconds
    blockDuration: 600, // 10 minutes block
  },
} as const

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  // Check for forwarded IP (behind proxy/load balancer)
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
  
  // Fallback to connection IP
  return request.ip || 'unknown'
}

/**
 * Get user identifier for rate limiting
 */
export async function getUserIdentifier(request: NextRequest): Promise<string> {
  try {
    // Try to get authenticated user ID from session
    const { getInfo } = await import('../app/api/utils/common')
    const info = await getInfo(request)
    
    if (info.isAuthenticated && info.userInfo?.id) {
      return `user:${info.userInfo.id}`
    }
  } catch (error) {
    // Fall back to IP-based identification
    console.warn('Failed to get user identifier from session:', error)
  }
  
  // Fall back to IP-based identification
  return `ip:${getClientIP(request)}`
}

/**
 * Apply rate limiting to a request
 */
export async function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const id = identifier || await getUserIdentifier(request)
  const result = await rateLimiterService.checkLimit(id, config)
  
  if (!result.allowed) {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: result.retryAfter,
      },
      { status: 429 }
    )
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', result.limit.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', result.resetTime.toISOString())
    
    if (result.retryAfter) {
      response.headers.set('Retry-After', result.retryAfter.toString())
    }
    
    return { allowed: false, response }
  }
  
  return { allowed: true }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): void {
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.resetTime.toISOString())
}

/**
 * Middleware helper for rate limiting
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const result = await applyRateLimit(request, config)
    
    if (!result.allowed) {
      return result.response!
    }
    
    return null // Continue to next middleware
  }
}

/**
 * Get rate limiter service instance
 */
export function getRateLimiterService(): RateLimiterService {
  return rateLimiterService
}

export default rateLimiterService