/**
 * Example: Secure Component with CSP Nonce
 * Demonstrates how to use nonce in React components for inline scripts
 */

import React from 'react'
import { getCurrentNonce } from '@/lib/nonce-helper'

// Server component example - can access nonce from headers
export default async function SecureServerComponent() {
  const nonce = await getCurrentNonce()
  
  return (
    <div>
      <h1>Secure Server Component</h1>
      
      {/* Example of nonce-based inline script */}
      {nonce && (
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              console.log('This script is allowed by CSP via nonce');
              // Your secure inline script here
            `,
          }}
        />
      )}
      
      {/* Alternative: External script with nonce */}
      <script nonce={nonce} src="/js/secure-script.js" />
    </div>
  )
}

// Client component example - nonce must be passed as prop
interface SecureClientComponentProps {
  nonce?: string
}

export function SecureClientComponent({ nonce }: SecureClientComponentProps) {
  const handleSecureAction = () => {
    // Client-side logic that doesn't require inline scripts
    console.log('Secure client action')
  }
  
  return (
    <div>
      <h2>Secure Client Component</h2>
      <button onClick={handleSecureAction}>
        Secure Action
      </button>
      
      {/* If you absolutely need inline scripts in client components */}
      {nonce && (
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              // Only use inline scripts when absolutely necessary
              window.secureClientData = ${JSON.stringify({ timestamp: Date.now() })};
            `,
          }}
        />
      )}
    </div>
  )
}

// HOC for passing nonce to client components
export function withSecureNonce<T extends object>(
  Component: React.ComponentType<T & SecureClientComponentProps>
) {
  return async function SecureWrapper(props: T) {
    const nonce = await getCurrentNonce()
    return <Component {...props} nonce={nonce} />
  }
}

// Usage example
const SecureClientWithNonce = withSecureNonce(SecureClientComponent)

// Layout component that provides nonce context
export async function SecureLayout({ children }: { children: React.ReactNode }) {
  const nonce = await getCurrentNonce()
  
  return (
    <html>
      <head>
        {/* Meta tags with security headers */}
        <meta httpEquiv="Content-Security-Policy" content={`script-src 'self' 'nonce-${nonce}'`} />
        
        {/* Nonce-based analytics or tracking scripts */}
        {nonce && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                // Analytics initialization with nonce
                (function() {
                  console.log('Analytics loaded securely with nonce');
                  // Your analytics code here
                })();
              `,
            }}
          />
        )}
      </head>
      <body>
        {children}
        
        {/* Pass nonce to client components via data attribute */}
        <div id="app-data" data-nonce={nonce} style={{ display: 'none' }} />
      </body>
    </html>
  )
}

// Hook for accessing nonce in client components
export function useSecureNonce(): string | null {
  const [nonce, setNonce] = React.useState<string | null>(null)
  
  React.useEffect(() => {
    // Get nonce from data attribute set by server
    const appData = document.getElementById('app-data')
    if (appData) {
      setNonce(appData.getAttribute('data-nonce'))
    }
  }, [])
  
  return nonce
}

// Example of secure form component
export function SecureForm() {
  const nonce = useSecureNonce()
  
  const handleSubmit = async (formData: FormData) => {
    // Secure form submission
    const response = await fetch('/api/secure-endpoint', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/json',
        // Add any required security headers
      },
    })
    
    if (!response.ok) {
      throw new Error('Form submission failed')
    }
    
    return response.json()
  }
  
  return (
    <form action={handleSubmit}>
      <input type="text" name="data" required />
      <button type="submit">Submit Securely</button>
      
      {/* CSRF protection could be added here */}
      <input type="hidden" name="csrf_token" value="generated-csrf-token" />
    </form>
  )
}

// Best practices for CSP compliance:
// 1. Avoid inline scripts when possible
// 2. Use event handlers instead of inline onclick
// 3. Load scripts from external files with nonce
// 4. Use data attributes to pass data to client components
// 5. Implement proper error handling for CSP violations