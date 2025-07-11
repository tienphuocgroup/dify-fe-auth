/**
 * CSP Nonce Generator
 * Provides nonce generation and CSP policy management for XSS protection
 */

// Use Web Crypto API for Edge Runtime compatibility

export interface CSPConfig {
  nonce?: string
  reportUri?: string
  isDevelopment?: boolean
  enableReportOnly?: boolean
}

/**
 * Generate a cryptographically secure nonce
 * Performance requirement: < 1ms generation time
 */
export function generateNonce(): string {
  // Use Web Crypto API for Edge Runtime compatibility
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    const array = new Uint8Array(16)
    window.crypto.getRandomValues(array)
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    // Edge Runtime environment
    const array = new Uint8Array(16)
    globalThis.crypto.getRandomValues(array)
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
  } else {
    // Fallback for environments without crypto
    const array = new Uint8Array(16)
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
  }
}

/**
 * Generate Content Security Policy with nonce support
 */
export function generateCSP(config: CSPConfig = {}): string {
  const {
    nonce,
    reportUri,
    isDevelopment = false,
    enableReportOnly = false,
  } = config

  // Base CSP policy - strict by default
  const basePolicy = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      ...(nonce ? [`'nonce-${nonce}'`] : []),
      // Azure AD/MSAL endpoints
      'https://login.microsoftonline.com',
      'https://login.live.com',
      // Allow Azure AD B2C if needed
      'https://*.b2clogin.com',
      // In development, allow unsafe-eval for React dev tools
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for dynamic styles and CSS-in-JS
      // Azure AD login pages
      'https://login.microsoftonline.com',
      'https://login.live.com',
    ],
    'img-src': [
      "'self'",
      'data:', // For base64 images
      'https:', // Allow all HTTPS images
      'blob:', // For blob URLs
    ],
    'font-src': [
      "'self'",
      'data:', // For base64 fonts
      'https:', // Allow CDN fonts
    ],
    'connect-src': [
      "'self'",
      // Azure AD/Graph API endpoints
      'https://graph.microsoft.com',
      'https://login.microsoftonline.com',
      'https://login.live.com',
      'https://*.b2clogin.com',
      // Dify API endpoints
      'https://api.dify.ai',
      // Allow WebSocket connections in development
      ...(isDevelopment ? ['ws://localhost:*', 'wss://localhost:*'] : []),
    ],
    'frame-src': [
      "'none'", // Strict: no frames allowed
    ],
    'frame-ancestors': [
      "'none'", // Prevent embedding in frames (clickjacking protection)
    ],
    'object-src': [
      "'none'", // Disable plugins
    ],
    'base-uri': [
      "'self'", // Restrict base URI
    ],
    'form-action': [
      "'self'",
      // Azure AD login forms
      'https://login.microsoftonline.com',
      'https://login.live.com',
    ],
    'manifest-src': [
      "'self'",
    ],
    'media-src': [
      "'self'",
      'data:',
      'blob:',
    ],
    'worker-src': [
      "'self'",
      'blob:',
    ],
    'child-src': [
      "'self'",
      'blob:',
    ],
  }

  // Add upgrade-insecure-requests in production
  const additionalDirectives = []
  if (!isDevelopment) {
    additionalDirectives.push('upgrade-insecure-requests')
  }

  // Add report-uri if provided
  if (reportUri) {
    additionalDirectives.push(`report-uri ${reportUri}`)
  }

  // Build CSP string
  const cspDirectives = Object.entries(basePolicy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .concat(additionalDirectives)
    .join('; ')

  return cspDirectives
}

/**
 * Inject nonce into CSP policy template
 */
export function injectNonce(cspTemplate: string, nonce: string): string {
  return cspTemplate.replace(/\{NONCE\}/g, nonce)
}

/**
 * Get CSP header name based on report-only mode
 */
export function getCSPHeaderName(reportOnly: boolean = false): string {
  return reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'
}

/**
 * Generate CSP for Next.js middleware
 */
export function generateMiddlewareCSP(config: CSPConfig = {}): {
  headerName: string
  headerValue: string
  nonce: string
} {
  const nonce = config.nonce || generateNonce()
  const csp = generateCSP({ ...config, nonce })
  
  return {
    headerName: getCSPHeaderName(config.enableReportOnly),
    headerValue: csp,
    nonce,
  }
}

/**
 * Validate CSP nonce format
 */
export function validateNonce(nonce: string): boolean {
  // Base64 pattern for 16 bytes (128 bits) = 24 characters
  const base64Pattern = /^[A-Za-z0-9+/]{22}==$/
  return base64Pattern.test(nonce)
}

/**
 * CSP policy templates for different environments
 */
export const CSP_TEMPLATES = {
  development: {
    'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'connect-src': ["'self'", "ws://localhost:*", "wss://localhost:*"],
  },
  production: {
    'script-src': ["'self'", "'nonce-{NONCE}'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'connect-src': ["'self'"],
  },
} as const