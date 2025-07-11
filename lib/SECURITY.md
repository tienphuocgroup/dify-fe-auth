# Security Implementation

This document describes the comprehensive security headers and Content Security Policy (CSP) implementation for the web application.

## Overview

The security implementation provides protection against:
- Cross-Site Scripting (XSS) attacks
- Clickjacking attacks
- MIME sniffing attacks
- Man-in-the-middle (MITM) attacks
- Mixed content attacks
- Various other web vulnerabilities

## Components

### 1. Security Headers (`security-headers.ts`)

Provides comprehensive security headers including:
- **HSTS**: HTTP Strict Transport Security
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME sniffing protection
- **Referrer-Policy**: Referrer information control
- **Permissions-Policy**: Browser feature restrictions
- **Cross-Origin policies**: COEP, COOP, CORP

### 2. CSP Implementation (`csp-nonce.ts`)

Implements Content Security Policy with:
- Nonce-based script loading
- Strict default policies
- Azure AD/MSAL integration
- Development/production configurations
- CSP violation reporting

### 3. API Security (`api-security.ts`)

Provides security utilities for API routes:
- Security header application
- Rate limiting
- CORS configuration
- Request validation

### 4. Testing Utilities (`security-test-utils.ts`)

Comprehensive testing for:
- Security header validation
- CSP effectiveness testing
- XSS prevention testing
- Performance testing

## Usage

### Next.js Configuration

The security headers are automatically applied via `next.config.js`:

```javascript
// Automatically configured - no manual setup needed
const { generateSecurityHeaders } = require('./lib/security-headers')
```

### Middleware CSP

Dynamic CSP with nonce generation is handled in `middleware.ts`:

```javascript
import { generateMiddlewareCSP } from './lib/csp-nonce'

// Automatically generates nonce and applies CSP
const { headerName, headerValue, nonce } = generateMiddlewareCSP(config)
```

### API Routes

Apply security headers to API routes:

```javascript
import { createSecuredApiResponse } from './lib/api-security'

export async function GET() {
  const data = { message: 'Hello World' }
  return createSecuredApiResponse(data)
}
```

### Client Components

Access nonce for inline scripts:

```javascript
import { useNonce } from './lib/nonce-helper'

function MyComponent({ nonce }) {
  const nonceContext = useNonce(nonce)
  
  return (
    <script {...nonceContext.getScriptProps()}>
      // Your inline script here
    </script>
  )
}
```

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
# CSP report URI (optional)
CSP_REPORT_URI=https://your-csp-report-endpoint.com/report

# HSTS max age (optional, defaults to 1 year)
HSTS_MAX_AGE=31536000
```

### Development vs Production

The implementation automatically adjusts for development:
- Uses CSP report-only mode in development
- Allows `unsafe-eval` for React dev tools
- Relaxes some cross-origin policies

## Testing

### Run Security Tests

```bash
# Test all security headers
npm run test:security-headers

# Test CSP effectiveness
npm run test:csp

# Test XSS prevention
npm run test:xss-prevention
```

### Manual Testing

1. **CSP Violation Testing**: Open browser dev tools and check for CSP violations
2. **XSS Testing**: Try injecting test payloads (safely in dev environment)
3. **Header Validation**: Use browser dev tools to verify all headers are present

## Security Headers Reference

### Applied Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer info |
| `Permissions-Policy` | `camera=(), microphone=(), ...` | Restrict browser features |
| `Content-Security-Policy` | Dynamic with nonce | Prevent XSS |

### CSP Directives

- `default-src 'self'`: Only allow same-origin resources
- `script-src 'self' 'nonce-{nonce}'`: Scripts from same origin or with nonce
- `style-src 'self' 'unsafe-inline'`: Styles from same origin or inline
- `img-src 'self' data: https:`: Images from same origin, data URLs, or HTTPS
- `frame-ancestors 'none'`: Prevent embedding in frames
- `object-src 'none'`: Block dangerous object embeds

## Azure AD Integration

The CSP is configured to work with Azure AD/MSAL:

```javascript
// Allowed Azure AD domains
'https://login.microsoftonline.com'
'https://login.live.com'
'https://graph.microsoft.com'
```

## Performance

- Header generation: < 5ms (tested with 1000 generations)
- Nonce generation: < 1ms per nonce
- No impact on page load times
- Efficient caching of static headers

## Troubleshooting

### Common Issues

1. **CSP Violations**: Check browser console for violation reports
2. **Blocked Resources**: Ensure all external resources are allowlisted in CSP
3. **Development Issues**: Check if development mode is properly detected

### Debug Mode

Enable CSP report-only mode for debugging:

```javascript
const cspConfig = {
  enableReportOnly: true, // Won't block, only report
  reportUri: 'https://your-report-endpoint.com'
}
```

## Security Best Practices

1. **Regular Updates**: Keep security headers updated with latest recommendations
2. **CSP Monitoring**: Monitor CSP violation reports
3. **Testing**: Regular security testing with real attack vectors
4. **Development**: Use report-only mode during development
5. **Gradual Rollout**: Implement CSP gradually to avoid breaking changes

## References

- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)