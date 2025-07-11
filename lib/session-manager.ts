import { cookies } from 'next/headers'
import { encryptTokenData, decryptTokenData, generateSecureSessionId } from './token-encryption'

/**
 * Session manager for secure server-side token storage
 * Implements secure cookie-based session management with encryption
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

// Fallback in-memory store for development/testing
const fallbackSessionStore = new Map<string, SessionData>()
const fallbackUserSessions = new Map<string, Set<string>>()

// Redis session store (lazy loaded to avoid Edge Runtime issues)
let redisSessionStore: any = null
let redisAvailable = false

// Determine if we should use Redis or fallback
const useRedis = process.env.NODE_ENV === 'production' || process.env.REDIS_HOST

// Initialize Redis store if available
const initializeRedisStore = async () => {
  if (useRedis && !redisSessionStore) {
    try {
      const { getRedisSessionStore } = await import('./redis-session-store')
      redisSessionStore = getRedisSessionStore()
      redisAvailable = true
    } catch (error) {
      console.warn('Redis not available, falling back to in-memory storage:', error)
      redisAvailable = false
    }
  }
}

/**
 * Create a new session
 * @param tokenData - Token data from MSAL
 * @param userInfo - User information
 * @returns Session ID
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
  if (useRedis) {
    await initializeRedisStore()
    if (redisSessionStore) {
      await redisSessionStore.set(sessionId, sessionData, SESSION_TIMEOUT / 1000)
    } else {
      // Fall back to in-memory if Redis fails
      fallbackSessionStore.set(sessionId, sessionData)
      if (!fallbackUserSessions.has(userInfo.id)) {
        fallbackUserSessions.set(userInfo.id, new Set())
      }
      fallbackUserSessions.get(userInfo.id)!.add(sessionId)
    }
  } else {
    fallbackSessionStore.set(sessionId, sessionData)
    
    // Track user sessions
    if (!fallbackUserSessions.has(userInfo.id)) {
      fallbackUserSessions.set(userInfo.id, new Set())
    }
    fallbackUserSessions.get(userInfo.id)!.add(sessionId)
  }
  
  // Set secure session cookie
  await setSessionCookie(sessionId, sessionData)
  
  return sessionId
}

/**
 * Get session data by session ID
 * @param sessionId - Session ID
 * @returns Session data or null
 */
export const getSession = async (sessionId: string): Promise<SessionData | null> => {
  let session: SessionData | null = null
  
  if (useRedis) {
    session = await sessionStore.get(sessionId)
  } else {
    session = fallbackSessionStore.get(sessionId) || null
  }
  
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
  
  if (useRedis) {
    await sessionStore.set(sessionId, session, SESSION_TIMEOUT / 1000)
  } else {
    fallbackSessionStore.set(sessionId, session)
  }
  
  return session
}

/**
 * Update session with new token data
 * @param sessionId - Session ID
 * @param tokenData - New token data
 * @returns Updated session data or null
 */
export const updateSession = async (
  sessionId: string,
  tokenData: any
): Promise<SessionData | null> => {
  let session: SessionData | null = null
  
  if (useRedis) {
    session = await sessionStore.get(sessionId)
  } else {
    session = fallbackSessionStore.get(sessionId) || null
  }
  
  if (!session) {
    return null
  }
  
  // Update token data
  session.accessToken = tokenData.accessToken
  session.refreshToken = tokenData.refreshToken || session.refreshToken
  session.tokenExpiry = tokenData.expiresOn?.getTime() || session.tokenExpiry
  session.lastActivity = Date.now()
  
  if (useRedis) {
    await sessionStore.set(sessionId, session, SESSION_TIMEOUT / 1000)
  } else {
    fallbackSessionStore.set(sessionId, session)
  }
  
  // Update session cookie
  await setSessionCookie(sessionId, session)
  
  return session
}

/**
 * Destroy a session
 * @param sessionId - Session ID
 */
export const destroySession = async (sessionId: string): Promise<void> => {
  if (useRedis) {
    await sessionStore.delete(sessionId)
  } else {
    const session = fallbackSessionStore.get(sessionId)
    
    if (session) {
      // Remove from user sessions
      const userSessionSet = fallbackUserSessions.get(session.userId)
      if (userSessionSet) {
        userSessionSet.delete(sessionId)
        if (userSessionSet.size === 0) {
          fallbackUserSessions.delete(session.userId)
        }
      }
      
      // Remove from session store
      fallbackSessionStore.delete(sessionId)
    }
  }
  
  // Clear session cookie
  await clearSessionCookie()
}

/**
 * Get session ID from request cookies
 * @returns Session ID or null
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
 * @param sessionId - Session ID
 * @param sessionData - Session data
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
 * @param session - Session data
 * @returns True if expired
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
 * Clean up old sessions for a user (keep only the latest 5)
 * @param userId - User ID
 */
const cleanupUserSessions = async (userId: string): Promise<void> => {
  if (useRedis) {
    const sessionIds = await sessionStore.getUserSessions(userId)
    
    if (sessionIds.length >= MAX_CONCURRENT_SESSIONS) {
      // Get sessions with creation time
      const sessionsWithTime = []
      
      for (const sessionId of sessionIds) {
        const session = await sessionStore.get(sessionId)
        if (session) {
          sessionsWithTime.push({ id: sessionId, session })
        }
      }
      
      // Sort by creation time (newest first)
      sessionsWithTime.sort((a, b) => b.session.createdAt - a.session.createdAt)
      
      // Keep only the latest MAX_CONCURRENT_SESSIONS - 1 sessions
      const sessionsToRemove = sessionsWithTime.slice(MAX_CONCURRENT_SESSIONS - 1)
      
      for (const item of sessionsToRemove) {
        await destroySession(item.id)
      }
    }
  } else {
    const userSessionSet = fallbackUserSessions.get(userId)
    
    if (!userSessionSet) {
      return
    }
    
    const sessionIds = Array.from(userSessionSet)
    
    if (sessionIds.length >= MAX_CONCURRENT_SESSIONS) {
      // Get sessions with creation time
      const sessionsWithTime = sessionIds
        .map(id => ({ id, session: fallbackSessionStore.get(id) }))
        .filter(item => item.session)
        .sort((a, b) => b.session!.createdAt - a.session!.createdAt)
      
      // Keep only the latest MAX_CONCURRENT_SESSIONS - 1 sessions
      const sessionsToRemove = sessionsWithTime.slice(MAX_CONCURRENT_SESSIONS - 1)
      
      for (const item of sessionsToRemove) {
        await destroySession(item.id)
      }
    }
  }
}

/**
 * Clean up expired sessions (should be called periodically)
 */
export const cleanupExpiredSessions = async (): Promise<void> => {
  if (useRedis) {
    // Redis handles TTL automatically, but we can clean up orphaned references
    await sessionStore.cleanup()
  } else {
    const now = Date.now()
    const expiredSessions: string[] = []
    
    for (const [sessionId, session] of fallbackSessionStore.entries()) {
      if (isSessionExpired(session)) {
        expiredSessions.push(sessionId)
      }
    }
    
    for (const sessionId of expiredSessions) {
      await destroySession(sessionId)
    }
  }
}

/**
 * Get all active sessions for a user
 * @param userId - User ID
 * @returns Array of session IDs
 */
export const getUserSessions = async (userId: string): Promise<string[]> => {
  if (useRedis) {
    return await sessionStore.getUserSessions(userId)
  } else {
    const userSessionSet = fallbackUserSessions.get(userId)
    return userSessionSet ? Array.from(userSessionSet) : []
  }
}

/**
 * Validate session and extend activity
 * @param sessionId - Session ID
 * @returns Valid session data or null
 */
export const validateAndExtendSession = async (sessionId: string): Promise<SessionData | null> => {
  const session = await getSession(sessionId)
  
  if (!session) {
    return null
  }
  
  // Session is valid and activity was already updated in getSession
  return session
}