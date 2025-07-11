import { NextRequest, NextResponse } from 'next/server'
import { tokenValidator } from '@/lib/token-validator'

// Simple admin key check (in production, this should be more sophisticated)
function isAuthorizedAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const apiKey = process.env.ADMIN_API_KEY
  
  if (!apiKey) {
    console.warn('ADMIN_API_KEY not configured - blacklist management disabled')
    return false
  }
  
  return authHeader === `Bearer ${apiKey}`
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { token, reason } = body

    // Validate required fields
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      )
    }

    // Validate token format
    if (token.length < 100 || token.length > 8192) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      )
    }

    // Check if token looks like a JWT
    const tokenParts = token.split('.')
    if (tokenParts.length !== 3) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      )
    }

    // Add token to blacklist
    await tokenValidator.blacklistToken(token, reason)

    // Log the blacklist action
    console.info('Token blacklisted:', {
      reason,
      timestamp: new Date().toISOString(),
      adminAction: true
    })

    return NextResponse.json({
      success: true,
      message: 'Token blacklisted successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('Token blacklist endpoint error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check admin authorization
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { token } = body

    // Validate required fields
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Validate token format
    if (token.length < 100 || token.length > 8192) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      )
    }

    // Check if token looks like a JWT
    const tokenParts = token.split('.')
    if (tokenParts.length !== 3) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      )
    }

    // Remove token from blacklist
    await tokenValidator.removeFromBlacklist(token)

    // Log the removal action
    console.info('Token removed from blacklist:', {
      timestamp: new Date().toISOString(),
      adminAction: true
    })

    return NextResponse.json({
      success: true,
      message: 'Token removed from blacklist successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('Token blacklist removal endpoint error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    if (!isAuthorizedAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get blacklist statistics
    const stats = tokenValidator.getBlacklistStats()

    return NextResponse.json({
      blacklist: {
        count: stats.count,
        entries: stats.keys.length
      },
      timestamp: new Date().toISOString()
    }, { status: 200 })

  } catch (error) {
    console.error('Token blacklist stats endpoint error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Check if a specific token is blacklisted
export async function HEAD(request: NextRequest) {
  try {
    // Check admin authorization
    if (!isAuthorizedAdmin(request)) {
      return new NextResponse(null, { status: 401 })
    }

    // Get token from query parameters
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return new NextResponse(null, { status: 400 })
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenValidator.isTokenBlacklisted(token)

    // Return status based on blacklist status
    return new NextResponse(null, { 
      status: isBlacklisted ? 200 : 404 
    })

  } catch (error) {
    console.error('Token blacklist check endpoint error:', error)
    return new NextResponse(null, { status: 500 })
  }
}