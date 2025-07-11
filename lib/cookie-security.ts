/**
 * Cookie Security Configuration
 * 
 * This module provides secure cookie configuration to prevent XSS, CSRF, and session hijacking attacks.
 * 
 * Security Features:
 * - HttpOnly: Prevents JavaScript access to cookies (XSS protection)
 * - Secure: Ensures cookies are only sent over HTTPS in production
 * - SameSite=strict: Prevents cross-site request forgery (CSRF)
 * - Proper expiration: 1 hour session timeout
 * - Domain and path control: Limits cookie scope
 */

export interface SecureCookieOptions {
  httpOnly: boolean
  secure: boolean
  sameSite: 'strict' | 'lax' | 'none'
  maxAge: number
  path: string
  domain?: string | undefined
}

export interface SecureCookieConfig {
  name: string
  options: SecureCookieOptions
}

/**
 * Secure session cookie configuration
 * 
 * This configuration ensures:
 * - XSS protection via HttpOnly=true
 * - CSRF protection via SameSite=strict
 * - Secure transport via Secure flag in production
 * - Proper session expiration (1 hour)
 */
export const secureSessionCookie: SecureCookieConfig = {
  name: 'session_id',
  options: {
    httpOnly: true,                                    // ✅ Prevent XSS access
    secure: process.env.NODE_ENV === 'production',     // ✅ HTTPS only in production
    sameSite: 'strict',                                // ✅ Prevent CSRF attacks
    maxAge: 60 * 60 * 1000,                           // ✅ 1 hour expiration (in milliseconds)
    path: '/',                                         // ✅ Site-wide access
    domain: process.env.COOKIE_DOMAIN ? process.env.COOKIE_DOMAIN : undefined,    // ✅ Domain control
  },
}

/**
 * Creates a secure cookie string from configuration
 * 
 * @param name - Cookie name
 * @param value - Cookie value (should be signed)
 * @param options - Security options
 * @returns Formatted cookie string for Set-Cookie header
 */
export const createSecureCookieString = (
  name: string,
  value: string,
  options: SecureCookieOptions
): string => {
  const cookieParts = [
    `${name}=${value}`,
    `Path=${options.path}`,
    `Max-Age=${Math.floor(options.maxAge / 1000)}`, // Convert to seconds
    `SameSite=${options.sameSite}`,
  ]

  if (options.httpOnly) {
    cookieParts.push('HttpOnly')
  }

  if (options.secure) {
    cookieParts.push('Secure')
  }

  if (options.domain) {
    cookieParts.push(`Domain=${options.domain}`)
  }

  return cookieParts.join('; ')
}

/**
 * Environment-specific cookie configuration
 * 
 * Development: Less restrictive for local testing
 * Production: Maximum security settings
 */
export const getEnvironmentCookieConfig = (): SecureCookieConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return {
    name: 'session_id',
    options: {
      httpOnly: true,                                    // Always true for security
      secure: !isDevelopment,                            // Only in production (HTTPS)
      sameSite: 'strict',                                // Always strict for CSRF protection
      maxAge: 60 * 60 * 1000,                           // 1 hour
      path: '/',
      domain: isDevelopment ? undefined : (process.env.COOKIE_DOMAIN ? process.env.COOKIE_DOMAIN : undefined),
    },
  }
}

/**
 * Validates cookie security configuration
 * 
 * @param config - Cookie configuration to validate
 * @returns Array of security warnings
 */
export const validateCookieSecurity = (config: SecureCookieConfig): string[] => {
  const warnings: string[] = []

  if (!config.options.httpOnly) {
    warnings.push('HttpOnly=false: Cookie is vulnerable to XSS attacks')
  }

  if (!config.options.secure && process.env.NODE_ENV === 'production') {
    warnings.push('Secure=false in production: Cookie can be sent over HTTP')
  }

  if (config.options.sameSite !== 'strict') {
    warnings.push(`SameSite=${config.options.sameSite}: May be vulnerable to CSRF attacks`)
  }

  if (config.options.maxAge > 24 * 60 * 60 * 1000) {
    warnings.push('Long expiration: Consider shorter session timeout for security')
  }

  return warnings
}