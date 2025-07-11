'use client'

import { MsalProvider } from '@azure/msal-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { msalInstance, isMsalConfigured } from '@/lib/auth-config'

type AuthProviderProps = {
  children: ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [isClient, setIsClient] = useState(false)
  const [msalInitialized, setMsalInitialized] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && msalInstance && !msalInitialized) {
      msalInstance.initialize().then(() => {
        setMsalInitialized(true)
      }).catch((error) => {
        console.error('MSAL initialization failed:', error)
        setMsalInitialized(true) // Still proceed to avoid infinite loading
      })
    }
    else if (isClient && !msalInstance) {
      // MSAL is not configured, proceed without authentication
      setMsalInitialized(true)
    }
  }, [isClient, msalInitialized])

  // Don't render on server side
  if (!isClient || !msalInitialized)
    return <div>Loading...</div>

  // If MSAL is not configured, render children without MSAL provider
  if (!msalInstance || !isMsalConfigured()) {
    return <>{children}</>
  }

  return (
    <MsalProvider instance={msalInstance}>
      {children}
    </MsalProvider>
  )
}
