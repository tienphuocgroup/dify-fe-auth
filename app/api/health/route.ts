import { NextRequest, NextResponse } from 'next/server'
// import { SecurityMonitorHelpers } from '@/lib/monitoring' // Temporarily disabled
import { getSessionStoreHealth } from '@/app/api/utils/common'

/**
 * Health check endpoint for monitoring system status
 * GET /api/health - Basic health check
 * GET /api/health?detailed=true - Detailed health information
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'
    
    // Basic health check
    const sessionHealth = await getSessionStoreHealth()
    const monitorHealth = { healthy: true, errors: [] } // Simplified for now
    
    const basicHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      sessionStore: sessionHealth.healthy,
      monitoring: monitorHealth.healthy,
    }
    
    // If not detailed, return basic health
    if (!detailed) {
      return NextResponse.json(basicHealth, { status: 200 })
    }
    
    // Detailed health information
    const securityDashboard = {
      summary: { totalAlerts: 0, unresolvedAlerts: 0, criticalAlerts: 0, recentCSPViolations: 0 },
      recentMetrics: [],
      recentAlerts: []
    } // Simplified for now
    
    const detailedHealth = {
      ...basicHealth,
      details: {
        sessionStore: sessionHealth,
        monitoring: monitorHealth,
        security: {
          summary: securityDashboard.summary,
          recentMetrics: securityDashboard.recentMetrics.slice(-5), // Last 5 metrics
          recentAlerts: securityDashboard.recentAlerts.slice(-10), // Last 10 alerts
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          architecture: process.arch,
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          },
          environment: process.env.NODE_ENV,
        },
      },
    }
    
    // Determine overall health status
    const overallHealthy = sessionHealth.healthy && monitorHealth.healthy
    const hasUnresolvedCriticalAlerts = securityDashboard.summary.criticalAlerts > 0
    
    if (!overallHealthy) {
      detailedHealth.status = 'unhealthy'
      return NextResponse.json(detailedHealth, { status: 503 })
    } else if (hasUnresolvedCriticalAlerts) {
      detailedHealth.status = 'degraded'
      return NextResponse.json(detailedHealth, { status: 200 })
    }
    
    return NextResponse.json(detailedHealth, { status: 200 })
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

/**
 * CSP violation reporting endpoint
 * POST /api/health/csp-report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Parse CSP violation report
    const report = body['csp-report']
    if (!report) {
      return NextResponse.json({ error: 'Invalid CSP report format' }, { status: 400 })
    }
    
    // Get client information
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.ip || 
                     'unknown'
    
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Record CSP violation (simplified logging for now)
    console.log('CSP Violation:', {
      clientIP,
      userAgent,
      violatedDirective: report['violated-directive'] || 'unknown',
      blockedURI: report['blocked-uri'] || 'unknown',
      lineNumber: report['line-number'],
      columnNumber: report['column-number'],
      sourceFile: report['source-file'],
      disposition: report['disposition'] || 'enforce',
    })
    
    return NextResponse.json({ received: true }, { status: 200 })
    
  } catch (error) {
    console.error('CSP violation report failed:', error)
    return NextResponse.json({ error: 'Failed to process CSP report' }, { status: 500 })
  }
}