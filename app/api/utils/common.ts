import { type NextRequest } from 'next/server'
import { ChatClient } from 'dify-client'
import { API_KEY, API_URL, APP_ID } from '@/config'
import { getSessionIdFromCookies, getSession } from '@/lib/session-manager-simple'

const authUserPrefix = `auth_${APP_ID}:`
const anonUserPrefix = `anon_${APP_ID}:`


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

export const getInfo = async (request: NextRequest) => {
  // First try to get info from secure session
  try {
    const sessionId = await getSessionIdFromCookies()
    
    if (sessionId) {
      const session = await getSession(sessionId)
      
      if (session) {
        // Return authenticated user from secure session
        return {
          sessionId: session.sessionId,
          user: authUserPrefix + session.userId,
          isAuthenticated: true,
          token: session.accessToken,
          userInfo: {
            id: session.userId,
            email: session.email,
            name: session.name,
          },
        }
      }
    }
  } catch (error) {
    console.error('Error getting session info:', error)
  }

  // Check for Authorization header (legacy support - deprecated)
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (bearerToken) {
    console.warn('Direct JWT token usage is deprecated and insecure. Please use secure session management instead.')
    console.warn('Falling back to session-based authentication for security.')
    // Force fallback to session-based authentication for security
    return getSessionBasedInfo(request)
  }

  // Fall back to session-based authentication for backward compatibility
  return getSessionBasedInfo(request)
}

export const setSession = (sessionId: string) => {
  // Create secure cookie with proper flags
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieFlags = [
    'Path=/',
    'SameSite=strict',
    'HttpOnly=true',
    ...(isProduction ? ['Secure=true'] : []),
    'Max-Age=3600' // 1 hour
  ].join('; ')
  
  return { 'Set-Cookie': `session_id=${sessionId}; ${cookieFlags}` }
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

// Health check for session store
export const getSessionStoreHealth = async (): Promise<{ healthy: boolean; message: string }> => {
  try {
    // Check if Redis is available
    const useRedis = process.env.NODE_ENV === 'production' || process.env.REDIS_HOST
    
    if (useRedis) {
      try {
        const { getRedisSessionStore } = await import('../../../lib/redis-session-store')
        const store = getRedisSessionStore()
        const healthy = await (store as any).isHealthy?.()
        
        return {
          healthy: healthy || false,
          message: healthy ? 'Redis session store is healthy' : 'Redis session store is unhealthy'
        }
      } catch (error) {
        return {
          healthy: true,
          message: 'Redis not available, using fallback in-memory session store'
        }
      }
    } else {
      return {
        healthy: true,
        message: 'Using fallback in-memory session store'
      }
    }
  } catch (error) {
    return {
      healthy: true,
      message: `Session store health check failed, using fallback: ${error}`
    }
  }
}
