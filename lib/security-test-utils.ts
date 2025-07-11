/**
 * Security Test Utilities
 * Provides utilities for testing security headers and CSP effectiveness
 */

import { generateCSP, validateNonce } from './csp-nonce'
import { generateSecurityHeaders } from './security-headers'

export interface SecurityTestResult {
  passed: boolean
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface SecurityTestSuite {
  name: string
  tests: SecurityTestResult[]
  overallPassed: boolean
}

/**
 * Test security headers presence and values
 */
export function testSecurityHeaders(headers: Record<string, string>): SecurityTestSuite {
  const tests: SecurityTestResult[] = []
  
  // Test HSTS
  const hsts = headers['strict-transport-security']
  tests.push({
    passed: !!hsts && hsts.includes('max-age=') && hsts.includes('includeSubDomains'),
    message: 'HSTS header with proper configuration',
    severity: 'critical',
  })
  
  // Test X-Frame-Options
  const xFrameOptions = headers['x-frame-options']
  tests.push({
    passed: xFrameOptions === 'DENY' || xFrameOptions === 'SAMEORIGIN',
    message: 'X-Frame-Options header prevents clickjacking',
    severity: 'high',
  })
  
  // Test X-Content-Type-Options
  const xContentType = headers['x-content-type-options']
  tests.push({
    passed: xContentType === 'nosniff',
    message: 'X-Content-Type-Options prevents MIME sniffing',
    severity: 'medium',
  })
  
  // Test Referrer-Policy
  const referrerPolicy = headers['referrer-policy']
  tests.push({
    passed: !!referrerPolicy,
    message: 'Referrer-Policy header is present',
    severity: 'medium',
  })
  
  // Test CSP
  const csp = headers['content-security-policy']
  tests.push({
    passed: !!csp && csp.includes('default-src'),
    message: 'Content-Security-Policy header is present and configured',
    severity: 'critical',
  })
  
  // Test Permissions-Policy
  const permissionsPolicy = headers['permissions-policy']
  tests.push({
    passed: !!permissionsPolicy,
    message: 'Permissions-Policy header restricts browser features',
    severity: 'medium',
  })
  
  return {
    name: 'Security Headers Test',
    tests,
    overallPassed: tests.every(test => test.passed),
  }
}

/**
 * Test CSP effectiveness against XSS
 */
export function testCSPEffectiveness(csp: string): SecurityTestSuite {
  const tests: SecurityTestResult[] = []
  
  // Test script-src restrictions
  const hasScriptSrc = csp.includes('script-src')
  const allowsUnsafeInline = csp.includes("'unsafe-inline'")
  const allowsUnsafeEval = csp.includes("'unsafe-eval'")
  
  tests.push({
    passed: hasScriptSrc && !allowsUnsafeInline,
    message: 'CSP blocks inline scripts (XSS prevention)',
    severity: 'critical',
  })
  
  tests.push({
    passed: hasScriptSrc && !allowsUnsafeEval,
    message: 'CSP blocks eval() usage (XSS prevention)',
    severity: 'high',
  })
  
  // Test frame-ancestors
  const hasFrameAncestors = csp.includes('frame-ancestors')
  const denyFrameAncestors = csp.includes("frame-ancestors 'none'")
  
  tests.push({
    passed: hasFrameAncestors && denyFrameAncestors,
    message: 'CSP prevents clickjacking via frame-ancestors',
    severity: 'high',
  })
  
  // Test object-src
  const hasObjectSrc = csp.includes('object-src')
  const denyObjectSrc = csp.includes("object-src 'none'")
  
  tests.push({
    passed: hasObjectSrc && denyObjectSrc,
    message: 'CSP blocks dangerous object embeds',
    severity: 'medium',
  })
  
  // Test base-uri
  const hasBaseUri = csp.includes('base-uri')
  
  tests.push({
    passed: hasBaseUri,
    message: 'CSP restricts base URI to prevent injection',
    severity: 'medium',
  })
  
  return {
    name: 'CSP Effectiveness Test',
    tests,
    overallPassed: tests.every(test => test.passed),
  }
}

/**
 * Test nonce generation and validation
 */
export function testNonceGeneration(nonce: string): SecurityTestResult {
  const isValid = validateNonce(nonce)
  
  return {
    passed: isValid,
    message: 'Nonce is properly formatted and secure',
    severity: 'high',
  }
}

/**
 * Simulate XSS attack payloads for testing
 */
export const XSS_TEST_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '<svg onload=alert("XSS")>',
  'javascript:alert("XSS")',
  '<iframe src="javascript:alert(\'XSS\')">',
  '<object data="javascript:alert(\'XSS\')">',
  '<embed src="javascript:alert(\'XSS\')">',
  '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
  '<style>@import "javascript:alert(\'XSS\')"</style>',
  '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
]

/**
 * Test CSP against XSS payloads
 */
export function testCSPAgainstXSS(csp: string): SecurityTestSuite {
  const tests: SecurityTestResult[] = []
  
  XSS_TEST_PAYLOADS.forEach((payload, index) => {
    // This is a simplified test - in practice, you'd need to test in a browser
    const wouldBlock = shouldCSPBlockPayload(csp, payload)
    
    tests.push({
      passed: wouldBlock,
      message: `CSP blocks XSS payload #${index + 1}`,
      severity: 'critical',
    })
  })
  
  return {
    name: 'XSS Prevention Test',
    tests,
    overallPassed: tests.every(test => test.passed),
  }
}

/**
 * Simplified CSP payload blocking test
 */
function shouldCSPBlockPayload(csp: string, payload: string): boolean {
  // This is a simplified heuristic - real testing should be done in browsers
  if (payload.includes('<script>') && !csp.includes("'unsafe-inline'")) {
    return true
  }
  
  if (payload.includes('onerror=') && !csp.includes("'unsafe-inline'")) {
    return true
  }
  
  if (payload.includes('javascript:') && csp.includes("'self'")) {
    return true
  }
  
  return false
}

/**
 * Generate comprehensive security test report
 */
export function generateSecurityTestReport(
  headers: Record<string, string>,
  csp: string,
  nonce: string
): {
  suites: SecurityTestSuite[]
  overallPassed: boolean
  summary: string
} {
  const suites = [
    testSecurityHeaders(headers),
    testCSPEffectiveness(csp),
    testCSPAgainstXSS(csp),
  ]
  
  const nonceTest = testNonceGeneration(nonce)
  suites.push({
    name: 'Nonce Generation Test',
    tests: [nonceTest],
    overallPassed: nonceTest.passed,
  })
  
  const overallPassed = suites.every(suite => suite.overallPassed)
  const totalTests = suites.reduce((sum, suite) => sum + suite.tests.length, 0)
  const passedTests = suites.reduce(
    (sum, suite) => sum + suite.tests.filter(test => test.passed).length,
    0
  )
  
  return {
    suites,
    overallPassed,
    summary: `${passedTests}/${totalTests} tests passed. ${
      overallPassed ? 'All security tests passed!' : 'Some security tests failed.'
    }`,
  }
}

/**
 * Console logger for security test results
 */
export function logSecurityTestResults(
  report: ReturnType<typeof generateSecurityTestReport>
): void {
  console.log('\n=== Security Test Report ===')
  console.log(report.summary)
  console.log('')
  
  report.suites.forEach(suite => {
    console.log(`${suite.name}: ${suite.overallPassed ? '✅ PASSED' : '❌ FAILED'}`)
    
    suite.tests.forEach(test => {
      const icon = test.passed ? '✅' : '❌'
      const severity = test.severity.toUpperCase()
      console.log(`  ${icon} [${severity}] ${test.message}`)
    })
    
    console.log('')
  })
}