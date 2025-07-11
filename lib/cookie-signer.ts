/**
 * Cookie Signing Service
 * 
 * This module provides HMAC-based cookie signing to ensure cookie integrity and prevent tampering.
 * 
 * Security Features:
 * - HMAC-SHA256 signing for strong integrity protection
 * - URL-safe base64 encoding for cookie compatibility
 * - Constant-time signature verification to prevent timing attacks
 * - Automatic signature validation
 */

import * as crypto from 'crypto'

export class CookieSigner {
  private secret: string
  private algorithm: string = 'sha256'

  constructor(secret: string) {
    if (!secret || secret.length < 32) {
      throw new Error('Cookie secret must be at least 32 characters for security')
    }
    this.secret = secret
  }

  /**
   * Signs a cookie value with HMAC-SHA256
   * 
   * @param value - The value to sign
   * @returns Signed value in format: value.signature
   */
  sign(value: string): string {
    if (!value) {
      throw new Error('Cannot sign empty value')
    }

    const signature = crypto
      .createHmac(this.algorithm, this.secret)
      .update(value)
      .digest('base64')
      .replace(/\+/g, '-')   // URL-safe base64
      .replace(/\//g, '_')   // URL-safe base64
      .replace(/=/g, '')     // Remove padding

    return `${value}.${signature}`
  }

  /**
   * Verifies a signed cookie value
   * 
   * @param signedValue - The signed value to verify
   * @returns Original value if valid, null if invalid or tampered
   */
  verify(signedValue: string): string | null {
    if (!signedValue || typeof signedValue !== 'string') {
      return null
    }

    const lastDotIndex = signedValue.lastIndexOf('.')
    if (lastDotIndex === -1) {
      return null
    }

    const value = signedValue.substring(0, lastDotIndex)
    const signature = signedValue.substring(lastDotIndex + 1)

    if (!value || !signature) {
      return null
    }

    try {
      // Generate expected signature
      const expectedSignature = this.sign(value).split('.')[1]
      
      // Use constant-time comparison to prevent timing attacks
      if (!this.constantTimeEqual(signature, expectedSignature)) {
        return null
      }

      return value
    } catch (error) {
      console.error('Cookie signature verification failed:', error)
      return null
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * 
   * @param a - First string
   * @param b - Second string
   * @returns True if strings are equal
   */
  private constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }

    return result === 0
  }

  /**
   * Generates a cryptographically secure random string for cookie secrets
   * 
   * @param length - Length of the secret (minimum 32)
   * @returns Random hex string
   */
  static generateSecret(length: number = 64): string {
    if (length < 32) {
      throw new Error('Secret length must be at least 32 characters')
    }
    return crypto.randomBytes(length / 2).toString('hex')
  }
}

/**
 * Default cookie signer instance
 * Uses COOKIE_SECRET environment variable or generates a warning
 */
let defaultSigner: CookieSigner | null = null

export const getDefaultCookieSigner = (): CookieSigner => {
  if (!defaultSigner) {
    const secret = process.env.COOKIE_SECRET

    if (!secret) {
      console.warn('COOKIE_SECRET environment variable not set. Using generated secret (sessions will not persist across server restarts)')
      const generatedSecret = CookieSigner.generateSecret()
      defaultSigner = new CookieSigner(generatedSecret)
    } else {
      defaultSigner = new CookieSigner(secret)
    }
  }

  return defaultSigner
}

/**
 * Utility functions for common cookie operations
 */
export const cookieUtils = {
  /**
   * Signs a session ID with the default signer
   * 
   * @param sessionId - Session ID to sign
   * @returns Signed session ID
   */
  signSessionId: (sessionId: string): string => {
    return getDefaultCookieSigner().sign(sessionId)
  },

  /**
   * Verifies a signed session ID
   * 
   * @param signedSessionId - Signed session ID to verify
   * @returns Original session ID if valid, null if invalid
   */
  verifySessionId: (signedSessionId: string): string | null => {
    return getDefaultCookieSigner().verify(signedSessionId)
  },

  /**
   * Checks if a cookie value is signed
   * 
   * @param value - Cookie value to check
   * @returns True if the value appears to be signed
   */
  isSigned: (value: string): boolean => {
    return typeof value === 'string' && value.includes('.') && value.split('.').length === 2
  },
}