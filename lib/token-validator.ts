import jwt from 'jsonwebtoken'
import NodeCache from 'node-cache'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { getMicrosoftPublicKeys } from './microsoft-keys'

// Cache for validation results (5 minutes TTL)
const validationCache = new NodeCache({ stdTTL: 300 })

// Cache for blacklisted tokens (24 hours TTL)
const blacklistCache = new NodeCache({ stdTTL: 86400 })

// Rate limiter for validation requests (100 requests per minute per IP)
const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'token_validation',
  points: 100,
  duration: 60, // 1 minute
})

export interface TokenValidationResult {
  valid: boolean
  payload?: any
  error?: string
  userInfo?: {
    id: string
    email?: string
    name?: string
  }
}

export interface TokenBlacklistEntry {
  token: string
  reason: string
  timestamp: number
}

export class TokenValidator {
  private static instance: TokenValidator
  private readonly graphEndpoint = 'https://graph.microsoft.com/v1.0/me'

  private constructor() {}

  public static getInstance(): TokenValidator {
    if (!TokenValidator.instance) {
      TokenValidator.instance = new TokenValidator()
    }
    return TokenValidator.instance
  }

  /**
   * Validate an access token with comprehensive security checks
   */
  async validateAccessToken(token: string, clientIp?: string): Promise<TokenValidationResult> {
    try {
      // Rate limiting check
      if (clientIp) {
        try {
          await rateLimiter.consume(clientIp)
        } catch (rateLimitError) {
          console.warn(`Rate limit exceeded for IP: ${clientIp}`)
          return {
            valid: false,
            error: 'Rate limit exceeded'
          }
        }
      }

      // Check cache first
      const cacheKey = this.getTokenCacheKey(token)
      const cachedResult = validationCache.get<TokenValidationResult>(cacheKey)
      if (cachedResult) {
        return cachedResult
      }

      // Check if token is blacklisted
      if (await this.isTokenBlacklisted(token)) {
        const result: TokenValidationResult = {
          valid: false,
          error: 'Token is blacklisted'
        }
        validationCache.set(cacheKey, result, 60) // Cache for 1 minute only
        return result
      }

      // Validate JWT structure and decode header
      const decodedToken = jwt.decode(token, { complete: true })
      if (!decodedToken || typeof decodedToken === 'string') {
        const result: TokenValidationResult = {
          valid: false,
          error: 'Invalid token structure'
        }
        validationCache.set(cacheKey, result)
        return result
      }

      // Validate JWT signature with Microsoft public keys
      const signatureValid = await this.validateJWTSignature(token, decodedToken)
      if (!signatureValid) {
        const result: TokenValidationResult = {
          valid: false,
          error: 'Invalid token signature'
        }
        validationCache.set(cacheKey, result)
        return result
      }

      // Validate token claims
      const claimsValid = this.validateTokenClaims(decodedToken.payload)
      if (!claimsValid) {
        const result: TokenValidationResult = {
          valid: false,
          error: 'Invalid token claims'
        }
        validationCache.set(cacheKey, result)
        return result
      }

      // Verify with Microsoft Graph API
      const graphValid = await this.validateWithMicrosoftGraph(token)
      if (!graphValid) {
        const result: TokenValidationResult = {
          valid: false,
          error: 'Microsoft Graph validation failed'
        }
        validationCache.set(cacheKey, result)
        return result
      }

      // Extract user information
      const userInfo = this.extractUserInfo(decodedToken.payload)

      const result: TokenValidationResult = {
        valid: true,
        payload: decodedToken.payload,
        userInfo
      }

      // Cache successful validation
      validationCache.set(cacheKey, result)
      return result

    } catch (error) {
      console.error('Token validation error:', error)
      return {
        valid: false,
        error: 'Token validation failed'
      }
    }
  }

  /**
   * Validate JWT signature using Microsoft public keys
   */
  private async validateJWTSignature(token: string, decodedToken: any): Promise<boolean> {
    try {
      if (!decodedToken.header?.kid) {
        console.warn('Token missing key ID (kid) in header')
        return false
      }

      const publicKey = await getMicrosoftPublicKeys(decodedToken.header.kid)
      if (!publicKey) {
        console.warn(`No public key found for kid: ${decodedToken.header.kid}`)
        return false
      }

      // Verify the token signature
      jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: [
          'https://login.microsoftonline.com/common/v2.0',
          'https://login.microsoftonline.com/organizations/v2.0',
          'https://sts.windows.net/common/'
        ]
      })

      return true
    } catch (error) {
      console.warn('JWT signature validation failed:', error)
      return false
    }
  }

  /**
   * Validate token claims (expiration, audience, etc.)
   */
  private validateTokenClaims(payload: any): boolean {
    try {
      const now = Math.floor(Date.now() / 1000)

      // Check expiration
      if (payload.exp && payload.exp < now) {
        console.warn('Token has expired')
        return false
      }

      // Check not before
      if (payload.nbf && payload.nbf > now) {
        console.warn('Token not yet valid')
        return false
      }

      // Check issued at (allow some clock skew)
      if (payload.iat && payload.iat > now + 300) {
        console.warn('Token issued in the future')
        return false
      }

      // Check audience - ensure it matches our client ID
      const clientId = process.env.NEXT_PUBLIC_MSAL_CLIENT_ID
      if (clientId && payload.aud && payload.aud !== clientId) {
        console.warn('Token audience mismatch')
        return false
      }

      // Check that we have required claims
      if (!payload.oid && !payload.sub) {
        console.warn('Token missing required user identifier claims')
        return false
      }

      return true
    } catch (error) {
      console.warn('Token claims validation failed:', error)
      return false
    }
  }

  /**
   * Validate token with Microsoft Graph API
   */
  private async validateWithMicrosoftGraph(token: string): Promise<boolean> {
    try {
      const response = await fetch(this.graphEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        return true
      }

      // Log specific error codes for debugging
      if (response.status === 401) {
        console.warn('Microsoft Graph returned 401 - token invalid or expired')
      } else if (response.status === 403) {
        console.warn('Microsoft Graph returned 403 - insufficient permissions')
      } else {
        console.warn(`Microsoft Graph returned ${response.status}`)
      }

      return false
    } catch (error) {
      console.warn('Microsoft Graph validation failed:', error)
      return false
    }
  }

  /**
   * Extract user information from token payload
   */
  private extractUserInfo(payload: any): { id: string; email?: string; name?: string } {
    return {
      id: payload.oid || payload.sub,
      email: payload.email || payload.preferred_username || payload.upn,
      name: payload.name || payload.given_name
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.getTokenHash(token)
    const blacklistEntry = blacklistCache.get<TokenBlacklistEntry>(tokenHash)
    return blacklistEntry !== undefined
  }

  /**
   * Add token to blacklist
   */
  async blacklistToken(token: string, reason: string): Promise<void> {
    const tokenHash = this.getTokenHash(token)
    const entry: TokenBlacklistEntry = {
      token: tokenHash,
      reason,
      timestamp: Date.now()
    }
    
    blacklistCache.set(tokenHash, entry)
    
    // Also invalidate any cached validation results
    const cacheKey = this.getTokenCacheKey(token)
    validationCache.del(cacheKey)
    
    console.info(`Token blacklisted: ${reason}`)
  }

  /**
   * Remove token from blacklist
   */
  async removeFromBlacklist(token: string): Promise<void> {
    const tokenHash = this.getTokenHash(token)
    blacklistCache.del(tokenHash)
    
    // Also invalidate any cached validation results
    const cacheKey = this.getTokenCacheKey(token)
    validationCache.del(cacheKey)
    
    console.info('Token removed from blacklist')
  }

  /**
   * Get blacklist statistics
   */
  getBlacklistStats(): { count: number; keys: string[] } {
    const keys = blacklistCache.keys()
    return {
      count: keys.length,
      keys
    }
  }

  /**
   * Generate cache key for token validation results
   */
  private getTokenCacheKey(token: string): string {
    return `validation_${this.getTokenHash(token)}`
  }

  /**
   * Generate hash for token (for blacklist and cache keys)
   */
  private getTokenHash(token: string): string {
    // Create a simple hash of the token for cache/blacklist keys
    // This avoids storing the full token in memory
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16)
  }

  /**
   * Clear all caches (for testing/debugging)
   */
  clearCaches(): void {
    validationCache.flushAll()
    blacklistCache.flushAll()
  }
}

// Export singleton instance
export const tokenValidator = TokenValidator.getInstance()