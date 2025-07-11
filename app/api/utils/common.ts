import { type NextRequest } from 'next/server'
import { ChatClient } from 'dify-client'
import { API_KEY, API_URL, APP_ID } from '@/config'

const authUserPrefix = `auth_${APP_ID}:`
const anonUserPrefix = `anon_${APP_ID}:`

const decodeJWT = (token: string) => {
  try {
    const base64Payload = token.split('.')[1]
    const payload = Buffer.from(base64Payload, 'base64').toString('utf-8')
    return JSON.parse(payload)
  }
  catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

const getSessionBasedInfo = (request: NextRequest) => {
  // Use existing session-based flow for unauthenticated users
  const sessionId = request.cookies.get('session_id')?.value || generateSessionId()
  const user = anonUserPrefix + sessionId

  return {
    sessionId,
    user,
    isAuthenticated: false,
    token: null,
    userInfo: null,
  }
}

export const getInfo = (request: NextRequest) => {
  // Check for Authorization header
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (bearerToken) {
    // Authenticated user flow
    const tokenPayload = decodeJWT(bearerToken)
    if (!tokenPayload) {
      console.warn('Invalid JWT token provided')
      // Fall back to session-based authentication
      return getSessionBasedInfo(request)
    }

    // Extract user ID from MSAL token claims - prioritize oid (Object ID) for corporate environments
    // oid is the immutable, universal identifier recommended for corporate multi-app scenarios
    const userId = tokenPayload.oid || tokenPayload.sub

    if (!userId) {
      console.warn('Unable to identify user from authentication token - no oid or sub claim found')
      // Fall back to session-based authentication
      return getSessionBasedInfo(request)
    }

    return {
      sessionId: userId,
      user: authUserPrefix + userId,
      isAuthenticated: true,
      token: bearerToken,
      userInfo: {
        id: userId,
        email: tokenPayload.email || tokenPayload.preferred_username || tokenPayload.upn,
        name: tokenPayload.name || tokenPayload.given_name,
      },
    }
  }

  // Fall back to session-based authentication for backward compatibility
  return getSessionBasedInfo(request)
}

export const setSession = (sessionId: string) => {
  return { 'Set-Cookie': `session_id=${sessionId}; Path=/; SameSite=Lax; HttpOnly=false` }
}

export const getSessionHeaders = (request: NextRequest, newSessionId: string) => {
  const existingSessionId = request.cookies.get('session_id')?.value
  // Only set cookie if session ID has changed
  if (existingSessionId !== newSessionId) {
    return setSession(newSessionId)
  }
  return {}
}

export const client = new ChatClient(API_KEY, API_URL || undefined)
