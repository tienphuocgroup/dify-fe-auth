import { cookies } from 'next/headers'
import { encryptTokenData, decryptTokenData, generateSecureSessionId } from './token-encryption'

/**
 * Simplified session manager to avoid Edge Runtime issues
 * Uses in-memory storage for now, will be enhanced once the app is stable
 */

export interface SessionData {
  sessionId: string
  userId: string
  email: string
  name: string
  accessToken: string
  refreshToken?: string
  tokenExpiry: number
  createdAt: number
  lastActivity: number
}

export interface SessionOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  maxAge?: number
  path?: string
}

// Default session configuration
const DEFAULT_SESSION_OPTIONS: SessionOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60, // 1 hour
  path: '/'
}

// Session timeout: 1 hour
const SESSION_TIMEOUT = 60 * 60 * 1000 // 1 hour in milliseconds

// Max concurrent sessions per user
const MAX_CONCURRENT_SESSIONS = 5

// In-memory session store
const sessionStore = new Map<string, SessionData>()
const userSessions = new Map<string, Set<string>>()

/**
 * Create a new session
 */
export const createSession = async (
  tokenData: any,
  userInfo: { id: string; email: string; name: string }
): Promise<string> => {
  const sessionId = generateSecureSessionId()
  const now = Date.now()
  
  // Clean up old sessions for this user
  await cleanupUserSessions(userInfo.id)
  
  const sessionData: SessionData = {
    sessionId,
    userId: userInfo.id,
    email: userInfo.email,
    name: userInfo.name,
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    tokenExpiry: tokenData.expiresOn?.getTime() || now + SESSION_TIMEOUT,
    createdAt: now,
    lastActivity: now
  }
  
  // Store session
  sessionStore.set(sessionId, sessionData)
  
  // Track user sessions
  if (!userSessions.has(userInfo.id)) {
    userSessions.set(userInfo.id, new Set())
  }
  userSessions.get(userInfo.id)!.add(sessionId)
  
  // Set secure session cookie
  await setSessionCookie(sessionId, sessionData)
  
  return sessionId
}

/**
 * Get session data by session ID
 */
export const getSession = async (sessionId: string): Promise<SessionData | null> => {
  const session = sessionStore.get(sessionId)
  
  if (!session) {
    return null
  }
  
  // Check if session is expired
  if (isSessionExpired(session)) {
    await destroySession(sessionId)
    return null
  }
  
  // Update last activity
  session.lastActivity = Date.now()
  sessionStore.set(sessionId, session)
  
  return session
}

/**
 * Update session with new token data
 */
export const updateSession = async (
  sessionId: string,
  tokenData: any
): Promise<SessionData | null> => {
  const session = sessionStore.get(sessionId)
  
  if (!session) {
    return null
  }
  
  // Update token data
  session.accessToken = tokenData.accessToken
  session.refreshToken = tokenData.refreshToken || session.refreshToken
  session.tokenExpiry = tokenData.expiresOn?.getTime() || session.tokenExpiry
  session.lastActivity = Date.now()
  
  sessionStore.set(sessionId, session)
  
  // Update session cookie
  await setSessionCookie(sessionId, session)
  
  return session
}

/**
 * Destroy a session
 */
export const destroySession = async (sessionId: string): Promise<void> => {
  const session = sessionStore.get(sessionId)
  
  if (session) {
    // Remove from user sessions
    const userSessionSet = userSessions.get(session.userId)
    if (userSessionSet) {
      userSessionSet.delete(sessionId)
      if (userSessionSet.size === 0) {
        userSessions.delete(session.userId)
      }
    }
    
    // Remove from session store
    sessionStore.delete(sessionId)
  }
  
  // Clear session cookie
  await clearSessionCookie()
}

/**
 * Get session ID from request cookies
 */
export const getSessionIdFromCookies = async (): Promise<string | null> => {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session_id')
    
    if (!sessionCookie?.value) {
      return null
    }
    
    // Decrypt session ID
    const decryptedData = decryptTokenData(sessionCookie.value)
    return decryptedData.sessionId || null
  } catch (error) {
    console.error('Failed to get session ID from cookies:', error)
    return null
  }
}

/**
 * Set encrypted session cookie
 */
const setSessionCookie = async (sessionId: string, sessionData: SessionData): Promise<void> => {
  try {
    const cookieStore = await cookies()
    
    // Encrypt session data for cookie
    const encryptedData = encryptTokenData({
      sessionId,
      userId: sessionData.userId,
      createdAt: sessionData.createdAt
    })
    
    const options = {
      ...DEFAULT_SESSION_OPTIONS,
      expires: new Date(Date.now() + (DEFAULT_SESSION_OPTIONS.maxAge! * 1000))
    }
    
    cookieStore.set('session_id', encryptedData, options)
  } catch (error) {
    console.error('Failed to set session cookie:', error)
    throw new Error('Failed to set session cookie')
  }
}

/**
 * Clear session cookie
 */
const clearSessionCookie = async (): Promise<void> => {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('session_id')
  } catch (error) {
    console.error('Failed to clear session cookie:', error)
  }
}

/**
 * Check if session is expired
 */
const isSessionExpired = (session: SessionData): boolean => {
  const now = Date.now()
  
  // Check token expiry
  if (session.tokenExpiry && session.tokenExpiry < now) {
    return true
  }
  
  // Check session inactivity
  if (now - session.lastActivity > SESSION_TIMEOUT) {
    return true
  }
  
  return false
}

/**
 * Clean up old sessions for a user
 */
const cleanupUserSessions = async (userId: string): Promise<void> => {
  const userSessionSet = userSessions.get(userId)
  
  if (!userSessionSet) {
    return
  }
  
  const sessionIds = Array.from(userSessionSet)
  
  if (sessionIds.length >= MAX_CONCURRENT_SESSIONS) {
    // Get sessions with creation time
    const sessionsWithTime = sessionIds
      .map(id => ({ id, session: sessionStore.get(id) }))
      .filter(item => item.session)
      .sort((a, b) => b.session!.createdAt - a.session!.createdAt)
    
    // Keep only the latest MAX_CONCURRENT_SESSIONS - 1 sessions
    const sessionsToRemove = sessionsWithTime.slice(MAX_CONCURRENT_SESSIONS - 1)
    
    for (const item of sessionsToRemove) {
      await destroySession(item.id)
    }
  }
}

/**
 * Clean up expired sessions
 */
export const cleanupExpiredSessions = async (): Promise<void> => {
  const now = Date.now()
  const expiredSessions: string[] = []
  
  for (const [sessionId, session] of sessionStore.entries()) {
    if (isSessionExpired(session)) {
      expiredSessions.push(sessionId)
    }
  }
  
  for (const sessionId of expiredSessions) {
    await destroySession(sessionId)
  }
}

/**
 * Get all active sessions for a user
 */
export const getUserSessions = async (userId: string): Promise<string[]> => {
  const userSessionSet = userSessions.get(userId)
  return userSessionSet ? Array.from(userSessionSet) : []
}

/**
 * Validate session and extend activity
 */
export const validateAndExtendSession = async (sessionId: string): Promise<SessionData | null> => {
  const session = await getSession(sessionId)
  
  if (!session) {
    return null
  }
  
  // Session is valid and activity was already updated in getSession
  return session
}