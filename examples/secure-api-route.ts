/**
 * Example: Secure API Route
 * Demonstrates how to apply security headers to existing API routes
 */

import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { applyApiSecurityHeaders } from '@/lib/api-security'

// Example of enhancing an existing API route with security headers
export async function GET(request: NextRequest) {
  try {
    // Your existing API logic here
    const data = { message: 'Hello, secure world!' }
    
    // Create response
    const response = NextResponse.json(data)
    
    // Apply security headers
    return applyApiSecurityHeaders(response, {
      cspReportUri: process.env.CSP_REPORT_URI,
      isDevelopment: process.env.NODE_ENV === 'development',
      enableCors: false, // Set to true if you need CORS
    })
  } catch (error: any) {
    console.error('API error:', error)
    
    // Create error response with security headers
    const errorResponse = NextResponse.json({
      error: error.message,
    }, { status: 500 })
    
    return applyApiSecurityHeaders(errorResponse, {
      isDevelopment: process.env.NODE_ENV === 'development',
    })
  }
}

// Alternative: Using the convenience function
export async function POST(request: NextRequest) {
  try {
    // Your API logic here
    const data = { success: true }
    
    // Use the convenience function that creates and secures the response
    const { createSecuredApiResponse } = await import('@/lib/api-security')
    return createSecuredApiResponse(data, {
      cspReportUri: process.env.CSP_REPORT_URI,
      isDevelopment: process.env.NODE_ENV === 'development',
    })
  } catch (error: any) {
    console.error('API error:', error)
    
    // Use the convenience function for errors
    const { createSecuredApiError } = await import('@/lib/api-security')
    return createSecuredApiError(error.message, 500, {
      isDevelopment: process.env.NODE_ENV === 'development',
    })
  }
}

// Example with rate limiting
export async function PUT(request: NextRequest) {
  try {
    // Import rate limiter
    const { RateLimiter, applyRateLimit } = await import('@/lib/api-security')
    
    // Create rate limiter (you might want to store this globally)
    const rateLimiter = new RateLimiter(100, 60000) // 100 requests per minute
    
    // Get client identifier (IP address or user ID)
    const clientId = request.headers.get('x-forwarded-for') || 'anonymous'
    
    // Your API logic here
    const data = { message: 'Rate limited API' }
    const response = NextResponse.json(data)
    
    // Apply rate limiting and security headers
    const { applyApiSecurityHeaders } = await import('@/lib/api-security')
    const securedResponse = applyApiSecurityHeaders(response, {
      isDevelopment: process.env.NODE_ENV === 'development',
    })
    
    return applyRateLimit(securedResponse, clientId, rateLimiter)
  } catch (error: any) {
    console.error('API error:', error)
    
    const { createSecuredApiError } = await import('@/lib/api-security')
    return createSecuredApiError(error.message, 500)
  }
}