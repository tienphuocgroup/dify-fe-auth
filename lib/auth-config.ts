import type { Configuration } from '@azure/msal-browser'
import { LogLevel, PublicClientApplication } from '@azure/msal-browser'

// Check if MSAL is configured
const isMsalConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_MSAL_CLIENT_ID && process.env.NEXT_PUBLIC_MSAL_TENANT_ID)
}

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_MSAL_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_MSAL_TENANT_ID || 'common'}`,
    redirectUri: process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : ''),
    postLogoutRedirectUri: process.env.NEXT_PUBLIC_MSAL_POST_LOGOUT_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : ''),
  },
  cache: {
    cacheLocation: 'sessionStorage', // Use sessionStorage temporarily during migration
    storeAuthStateInCookie: true,    // Enable cookie protection for auth state
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        if (containsPii)
          return

        switch (level) {
          case LogLevel.Error:
            console.error(message)
            return
          case LogLevel.Info:
            console.info(message)
            return
          case LogLevel.Verbose:
            console.debug(message)
            return
          case LogLevel.Warning:
            console.warn(message)
        }
      },
      piiLoggingEnabled: false,
      logLevel: process.env.NODE_ENV === 'development' ? LogLevel.Verbose : LogLevel.Error,
    },
  },
}

export const msalInstance = (typeof window !== 'undefined' && isMsalConfigured()) ? new PublicClientApplication(msalConfig) : null

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
  prompt: 'select_account' as const,
}

export const tokenRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
  forceRefresh: false,
}

export { isMsalConfigured }
