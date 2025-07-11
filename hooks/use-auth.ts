'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAccount, useMsal } from '@azure/msal-react'
import type { AccountInfo, SilentRequest } from '@azure/msal-browser'
import { loginRequest, tokenRequest, isMsalConfigured } from '@/lib/auth-config'

export type AuthUser = {
  id: string
  email: string
  name: string
  account: AccountInfo
}

export type AuthState = {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export type AuthActions = {
  login: () => Promise<void>
  logout: () => Promise<void>
  getAccessToken: () => Promise<string | null>
  clearError: () => void
}

export function useAuth(): AuthState & AuthActions {
  // Check if MSAL is configured
  const msalConfigured = isMsalConfigured()
  let instance: any = null
  let accounts: any[] = []
  let account: any = null

  try {
    if (msalConfigured) {
      const msalContext = useMsal()
      instance = msalContext.instance
      accounts = msalContext.accounts
      account = useAccount(accounts[0] || {})
    }
  }
  catch (error) {
    // MSAL hooks will throw if not wrapped in MsalProvider
    console.warn('MSAL hooks not available, proceeding without authentication')
  }

  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: msalConfigured,
    error: null,
  })

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const login = useCallback(async () => {
    if (!msalConfigured || !instance) {
      setState(prev => ({
        ...prev,
        error: 'Authentication is not configured',
        isLoading: false,
      }))
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      await instance.loginPopup(loginRequest)
    }
    catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      }))
    }
  }, [instance, msalConfigured])

  const logout = useCallback(async () => {
    if (!msalConfigured || !instance) {
      setState(prev => ({
        ...prev,
        error: 'Authentication is not configured',
        isLoading: false,
      }))
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      // Destroy secure session first
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include',
      })
      
      // Then logout from MSAL
      await instance.logoutPopup()
      // Force a full page reload after logout to clear any cached chunks
      window.location.href = '/'
    }
    catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Logout failed',
        isLoading: false,
      }))
      // Even if logout fails, try to reload to clear state
      window.location.href = '/'
    }
  }, [instance, msalConfigured])

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!msalConfigured || !account || !instance)
      return null

    try {
      // First try to get token from secure session
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      })

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json()
        if (sessionData.success && sessionData.session) {
          // Return from secure session if available
          return sessionData.session.accessToken || null
        }
      }

      // Fall back to MSAL token acquisition
      const request: SilentRequest = {
        ...tokenRequest,
        account,
      }
      const response = await instance.acquireTokenSilent(request)
      
      // Store the new token in secure session
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tokenData: response,
          userInfo: {
            id: account.localAccountId || account.homeAccountId,
            email: account.username,
            name: account.name || account.username,
          },
        }),
      })

      return response.accessToken
    }
    catch (error) {
      try {
        const response = await instance.acquireTokenPopup(tokenRequest)
        
        // Store the new token in secure session
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            tokenData: response,
            userInfo: {
              id: account.localAccountId || account.homeAccountId,
              email: account.username,
              name: account.name || account.username,
            },
          }),
        })

        return response.accessToken
      }
      catch (popupError) {
        setState(prev => ({
          ...prev,
          error: popupError instanceof Error ? popupError.message : 'Token acquisition failed',
        }))
        return null
      }
    }
  }, [instance, account, msalConfigured])

  useEffect(() => {
    if (!msalConfigured) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
      return
    }

    if (account) {
      const user: AuthUser = {
        id: account.localAccountId || account.homeAccountId,
        email: account.username,
        name: account.name || account.username,
        account,
      }
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    }
    else {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    }
  }, [account, msalConfigured])

  return {
    ...state,
    login,
    logout,
    getAccessToken,
    clearError,
  }
}
