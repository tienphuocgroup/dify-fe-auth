import { NextRequest, NextResponse } from 'next/server'
import { tokenValidator } from '@/lib/token-validator'

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = request.ip || 
                    request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    'unknown'

    // Parse request body
    const body = await request.json()
    const { token } = body

    // Validate required fields
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Token is required' 
        },
        { status: 400 }
      )
    }

    // Validate token length (basic sanity check)
    if (token.length < 100 || token.length > 8192) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Invalid token format' 
        },
        { status: 400 }
      )
    }

    // Check if token looks like a JWT (three parts separated by dots)
    const tokenParts = token.split('.')
    if (tokenParts.length !== 3) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Invalid token format' 
        },
        { status: 400 }
      )
    }

    // Validate the token
    const validationResult = await tokenValidator.validateAccessToken(token, clientIp)

    // Return appropriate response based on validation result
    if (validationResult.valid) {
      return NextResponse.json({
        valid: true,
        userInfo: validationResult.userInfo,
        // Don't return the full payload for security reasons
        claims: validationResult.payload ? {
          iss: validationResult.payload.iss,
          aud: validationResult.payload.aud,
          exp: validationResult.payload.exp,
          iat: validationResult.payload.iat,
          sub: validationResult.payload.sub,
          oid: validationResult.payload.oid
        } : undefined
      }, { status: 200 })
    } else {
      // Log validation failures for security monitoring
      console.warn('Token validation failed:', {
        clientIp,
        error: validationResult.error,
        timestamp: new Date().toISOString()
      })

      // Return error response
      const statusCode = validationResult.error === 'Rate limit exceeded' ? 429 : 401
      return NextResponse.json(
        { 
          valid: false, 
          error: validationResult.error || 'Token validation failed' 
        },
        { status: statusCode }
      )
    }

  } catch (error) {
    console.error('Token validation endpoint error:', error)
    
    return NextResponse.json(
      { 
        valid: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (!token) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Authorization header missing or invalid' 
        },
        { status: 401 }
      )
    }

    // Get client IP for rate limiting
    const clientIp = request.ip || 
                    request.headers.get('x-forwarded-for')?.split(',')[0] || 
                    request.headers.get('x-real-ip') || 
                    'unknown'

    // Validate the token
    const validationResult = await tokenValidator.validateAccessToken(token, clientIp)

    // Return appropriate response
    if (validationResult.valid) {
      return NextResponse.json({
        valid: true,
        userInfo: validationResult.userInfo,
        claims: validationResult.payload ? {
          iss: validationResult.payload.iss,
          aud: validationResult.payload.aud,
          exp: validationResult.payload.exp,
          iat: validationResult.payload.iat,
          sub: validationResult.payload.sub,
          oid: validationResult.payload.oid
        } : undefined
      }, { status: 200 })
    } else {
      // Log validation failures for security monitoring
      console.warn('Token validation failed:', {
        clientIp,
        error: validationResult.error,
        timestamp: new Date().toISOString()
      })

      const statusCode = validationResult.error === 'Rate limit exceeded' ? 429 : 401
      return NextResponse.json(
        { 
          valid: false, 
          error: validationResult.error || 'Token validation failed' 
        },
        { status: statusCode }
      )
    }

  } catch (error) {
    console.error('Token validation endpoint error:', error)
    
    return NextResponse.json(
      { 
        valid: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}