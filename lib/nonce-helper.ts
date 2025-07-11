/**
 * Nonce Helper Utility
 * Provides utilities for accessing and using CSP nonces in components
 */

import { headers } from 'next/headers'

/**
 * Get the current request's CSP nonce from headers
 * This function can be used in server components to access the nonce
 */
export async function getCurrentNonce(): Promise<string | null> {
  try {
    const headersList = await headers()
    return headersList.get('x-nonce')
  } catch (error) {
    console.warn('Failed to get nonce from headers:', error)
    return null
  }
}

/**
 * Generate script tag with nonce attribute
 */
export function createNonceScript(script: string, nonce: string): string {
  return `<script nonce="${nonce}">${script}</script>`
}

/**
 * Create nonce attribute for JSX elements
 */
export function getNonceAttribute(nonce: string | null): { nonce?: string } {
  return nonce ? { nonce } : {}
}

/**
 * Validate and sanitize script content for nonce usage
 */
export function sanitizeScriptContent(content: string): string {
  // Remove any existing nonce attributes to prevent conflicts
  return content.replace(/nonce\s*=\s*["'][^"']*["']/gi, '')
}

/**
 * CSP nonce context for React components
 */
export interface NonceContext {
  nonce: string | null
  createScriptTag: (script: string) => string
  getScriptProps: () => { nonce?: string }
}

/**
 * Create nonce context object
 */
export function createNonceContext(nonce: string | null): NonceContext {
  return {
    nonce,
    createScriptTag: (script: string) => 
      nonce ? createNonceScript(script, nonce) : `<script>${script}</script>`,
    getScriptProps: () => getNonceAttribute(nonce),
  }
}

/**
 * Hook for accessing nonce in client components
 * Note: This requires the nonce to be passed down from server components
 */
export function useNonce(nonce: string | null) {
  return createNonceContext(nonce)
}