import { NextRequest, NextResponse } from 'next/server'
import { createSession, getSession, updateSession, destroySession, getSessionIdFromCookies, validateAndExtendSession } from '@/lib/session-manager-simple'

/**
 * Session API endpoints for secure token management
 * POST /api/auth/session - Create a new session
 * GET /api/auth/session - Get current session
 * PUT /api/auth/session - Update session with new token
 * DELETE /api/auth/session - Destroy session
 */

/**
 * Create a new session
 * POST /api/auth/session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenData, userInfo } = body
    
    if (!tokenData || !userInfo) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenData and userInfo' },
        { status: 400 }
      )
    }
    
    // Validate required user info fields
    if (!userInfo.id || !userInfo.email || !userInfo.name) {
      return NextResponse.json(
        { error: 'Missing required user fields: id, email, name' },
        { status: 400 }
      )
    }
    
    // Validate token data
    if (!tokenData.accessToken) {
      return NextResponse.json(
        { error: 'Missing access token in token data' },
        { status: 400 }
      )
    }
    
    const sessionId = await createSession(tokenData, userInfo)
    
    return NextResponse.json(
      { 
        success: true, 
        sessionId,
        message: 'Session created successfully' 
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Session creation failed:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

/**
 * Get current session
 * GET /api/auth/session
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = await getSessionIdFromCookies()
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      )
    }
    
    const session = await validateAndExtendSession(sessionId)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }
    
    // Return session info without sensitive data
    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        userId: session.userId,
        email: session.email,
        name: session.name,
        tokenExpiry: session.tokenExpiry,
        lastActivity: session.lastActivity,
        createdAt: session.createdAt
      }
    })
    
  } catch (error) {
    console.error('Session retrieval failed:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    )
  }
}

/**
 * Update session with new token
 * PUT /api/auth/session
 */
export async function PUT(request: NextRequest) {
  try {
    const sessionId = await getSessionIdFromCookies()
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { tokenData } = body
    
    if (!tokenData || !tokenData.accessToken) {
      return NextResponse.json(
        { error: 'Missing required field: tokenData with accessToken' },
        { status: 400 }
      )
    }
    
    const updatedSession = await updateSession(sessionId, tokenData)
    
    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Session updated successfully',
      session: {
        sessionId: updatedSession.sessionId,
        userId: updatedSession.userId,
        email: updatedSession.email,
        name: updatedSession.name,
        tokenExpiry: updatedSession.tokenExpiry,
        lastActivity: updatedSession.lastActivity
      }
    })
    
  } catch (error) {
    console.error('Session update failed:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}

/**
 * Destroy session (logout)
 * DELETE /api/auth/session
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = await getSessionIdFromCookies()
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      )
    }
    
    await destroySession(sessionId)
    
    return NextResponse.json({
      success: true,
      message: 'Session destroyed successfully'
    })
    
  } catch (error) {
    console.error('Session destruction failed:', error)
    return NextResponse.json(
      { error: 'Failed to destroy session' },
      { status: 500 }
    )
  }
}

/**
 * Get session access token (internal API)
 * This endpoint is used by other API routes to get the access token
 */
export async function getSessionAccessToken(): Promise<string | null> {
  try {
    const sessionId = await getSessionIdFromCookies()
    
    if (!sessionId) {
      return null
    }
    
    const session = await getSession(sessionId)
    
    if (!session) {
      return null
    }
    
    return session.accessToken
  } catch (error) {
    console.error('Failed to get session access token:', error)
    return null
  }
}

/**
 * Get session user info (internal API)
 * This endpoint is used by other API routes to get user information
 */
export async function getSessionUserInfo(): Promise<{ id: string; email: string; name: string } | null> {
  try {
    const sessionId = await getSessionIdFromCookies()
    
    if (!sessionId) {
      return null
    }
    
    const session = await getSession(sessionId)
    
    if (!session) {
      return null
    }
    
    return {
      id: session.userId,
      email: session.email,
      name: session.name
    }
  } catch (error) {
    console.error('Failed to get session user info:', error)
    return null
  }
}