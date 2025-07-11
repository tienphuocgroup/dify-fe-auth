/**
 * Security Headers Configuration
 * 
 * This module provides comprehensive security headers to protect against common web vulnerabilities:
 * - XSS (Cross-Site Scripting)
 * - CSRF (Cross-Site Request Forgery)
 * - Clickjacking
 * - MIME type sniffing
 * - Content injection
 * - Insecure connections
 */

export interface SecurityHeadersConfig {
  hstsMaxAge?: number
  cspReportUri?: string
  isDevelopment?: boolean
}

export interface SecurityHeader {
  key: string
  value: string
}

/**
 * Generate comprehensive security headers
 * 
 * @param config - Security configuration
 * @returns Array of security headers
 */
export const generateSecurityHeaders = (config: SecurityHeadersConfig = {}): SecurityHeader[] => {
  const {
    hstsMaxAge = 31536000, // 1 year
    cspReportUri,
    isDevelopment = false
  } = config

  const headers: SecurityHeader[] = [
    // Prevent XSS attacks
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block'
    },
    // Prevent MIME type sniffing
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff'
    },
    // Prevent clickjacking
    {
      key: 'X-Frame-Options',
      value: 'DENY'
    },
    // Disable DNS prefetching for privacy
    {
      key: 'X-DNS-Prefetch-Control',
      value: 'off'
    },
    // Control referrer information
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin'
    },
    // Prevent Adobe Flash and PDF plugins from loading
    {
      key: 'X-Permitted-Cross-Domain-Policies',
      value: 'none'
    }
  ]

  // Add HSTS in production
  if (!isDevelopment) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: `max-age=${hstsMaxAge}; includeSubDomains; preload`
    })
  }

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'nonce-{NONCE}' https://login.microsoftonline.com", // Nonce-based script loading
    "style-src 'self' 'nonce-{NONCE}' 'unsafe-inline'", // Nonce-based styles with fallback for styled-components
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.dify.ai https://login.microsoftonline.com https://graph.microsoft.com",
    "frame-src 'self' https://login.microsoftonline.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ]

  // Add CSP report URI if provided
  if (cspReportUri) {
    cspDirectives.push(`report-uri ${cspReportUri}`)
  }

  // In development, be more permissive for hot reloading
  if (isDevelopment) {
    cspDirectives[1] = "script-src 'self' 'unsafe-inline' 'unsafe-eval' webpack:" // Allow webpack hot reloading
    cspDirectives[4] = "connect-src 'self' https://api.dify.ai https://login.microsoftonline.com https://graph.microsoft.com ws: wss:" // Allow WebSocket connections
  } else {
    // Production: Remove unsafe directives for better security
    cspDirectives[1] = "script-src 'self' 'nonce-{NONCE}' https://login.microsoftonline.com" // Production: nonce-based scripts only
    cspDirectives[2] = "style-src 'self' 'nonce-{NONCE}'" // Production: nonce-based styles only
  }

  headers.push({
    key: 'Content-Security-Policy',
    value: cspDirectives.join('; ')
  })

  // Feature Policy / Permissions Policy
  const permissionsPolicies = [
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'battery=()',
    'camera=()',
    'display-capture=()',
    'document-domain=()',
    'encrypted-media=()',
    'execution-while-not-rendered=()',
    'execution-while-out-of-viewport=()',
    'fullscreen=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'midi=()',
    'payment=()',
    'picture-in-picture=()',
    'screen-wake-lock=()',
    'sync-xhr=()',
    'usb=()',
    'web-share=()',
    'xr-spatial-tracking=()'
  ]

  headers.push({
    key: 'Permissions-Policy',
    value: permissionsPolicies.join(', ')
  })

  return headers
}

/**
 * Validate security headers configuration
 * 
 * @param config - Security configuration to validate
 * @returns Array of validation warnings
 */
export const validateSecurityConfig = (config: SecurityHeadersConfig): string[] => {
  const warnings: string[] = []

  if (config.hstsMaxAge && config.hstsMaxAge < 86400) {
    warnings.push('HSTS max-age should be at least 86400 seconds (1 day)')
  }

  if (config.cspReportUri && !config.cspReportUri.startsWith('https://')) {
    warnings.push('CSP report URI should use HTTPS')
  }

  return warnings
}

/**
 * Get security headers for API responses
 * 
 * @param config - Security configuration
 * @returns Headers object suitable for Next.js API responses
 */
export const getApiSecurityHeaders = (config: SecurityHeadersConfig = {}): Record<string, string> => {
  const headers = generateSecurityHeaders(config)
  const result: Record<string, string> = {}

  headers.forEach(header => {
    result[header.key] = header.value
  })

  return result
}

/**
 * Security headers specifically for authentication endpoints
 * 
 * @param config - Security configuration
 * @returns Headers with enhanced security for auth endpoints
 */
export const getAuthSecurityHeaders = (config: SecurityHeadersConfig = {}): Record<string, string> => {
  const baseHeaders = getApiSecurityHeaders(config)
  
  // Additional security for auth endpoints
  return {
    ...baseHeaders,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  }
}