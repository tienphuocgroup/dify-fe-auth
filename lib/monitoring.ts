/**
 * Production Monitoring for Security and Sessions
 * Provides comprehensive monitoring, logging, and health checks
 */

import { getRedisSessionStore } from './redis-session-store'
import { getRateLimiterService } from './rate-limiter'

export interface SecurityMetrics {
  timestamp: number
  totalSessions: number
  activeSessions: number
  rateLimitViolations: number
  cspViolations: number
  authenticationFailures: number
  suspiciousActivities: number
}

export interface SessionHealthCheck {
  healthy: boolean
  redisConnected: boolean
  sessionStoreOperational: boolean
  rateLimiterOperational: boolean
  lastCleanup: Date
  totalSessions: number
  activeSessions: number
  errors: string[]
}

export interface CSPViolationReport {
  timestamp: number
  userAgent: string
  clientIP: string
  violatedDirective: string
  blockedURI: string
  lineNumber?: number
  columnNumber?: number
  sourceFile?: string
  disposition: 'enforce' | 'report'
}

export interface SecurityAlert {
  id: string
  timestamp: number
  level: 'low' | 'medium' | 'high' | 'critical'
  type: 'rate_limit' | 'csp_violation' | 'auth_failure' | 'suspicious_activity'
  message: string
  details: Record<string, any>
  resolved: boolean
}

class SecurityMonitor {
  private metrics: SecurityMetrics[] = []
  private alerts: SecurityAlert[] = []
  private cspViolations: CSPViolationReport[] = []
  private lastCleanup: Date = new Date()
  private maxMetricsHistory = 1000 // Keep last 1000 metric snapshots
  private maxAlerts = 500 // Keep last 500 alerts

  constructor() {
    // Start periodic cleanup
    this.startPeriodicCleanup()
    
    // Start metrics collection
    this.startMetricsCollection()
  }

  /**
   * Record security metrics
   */
  async recordMetrics(): Promise<SecurityMetrics> {
    try {
      const sessionStore = getRedisSessionStore()
      const rateLimiter = getRateLimiterService()
      
      // Get session statistics
      const sessionStats = await sessionStore.getStats()
      
      const metrics: SecurityMetrics = {
        timestamp: Date.now(),
        totalSessions: sessionStats.totalSessions,
        activeSessions: sessionStats.activeSessions,
        rateLimitViolations: this.countRecentAlerts('rate_limit'),
        cspViolations: this.countRecentCSPViolations(),
        authenticationFailures: this.countRecentAlerts('auth_failure'),
        suspiciousActivities: this.countRecentAlerts('suspicious_activity'),
      }

      // Store metrics (keep only recent ones)
      this.metrics.push(metrics)
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics.shift()
      }

      return metrics
    } catch (error) {
      console.error('Failed to record security metrics:', error)
      throw error
    }
  }

  /**
   * Check overall system health
   */
  async checkHealth(): Promise<SessionHealthCheck> {
    const errors: string[] = []
    let redisConnected = false
    let sessionStoreOperational = false
    let rateLimiterOperational = false

    try {
      // Check Redis connection
      const sessionStore = getRedisSessionStore()
      redisConnected = await (sessionStore as any).isHealthy?.() || false
      
      if (!redisConnected) {
        errors.push('Redis connection failed')
      }

      // Test session store operations
      try {
        const stats = await sessionStore.getStats()
        sessionStoreOperational = true
      } catch (error) {
        errors.push(`Session store error: ${error}`)
      }

      // Test rate limiter
      try {
        const rateLimiter = getRateLimiterService()
        rateLimiterOperational = true
      } catch (error) {
        errors.push(`Rate limiter error: ${error}`)
      }

      // Get session stats
      const sessionStats = await sessionStore.getStats()

      return {
        healthy: errors.length === 0,
        redisConnected,
        sessionStoreOperational,
        rateLimiterOperational,
        lastCleanup: this.lastCleanup,
        totalSessions: sessionStats.totalSessions,
        activeSessions: sessionStats.activeSessions,
        errors,
      }
    } catch (error) {
      return {
        healthy: false,
        redisConnected: false,
        sessionStoreOperational: false,
        rateLimiterOperational: false,
        lastCleanup: this.lastCleanup,
        totalSessions: 0,
        activeSessions: 0,
        errors: [`Health check failed: ${error}`],
      }
    }
  }

  /**
   * Record a security alert
   */
  recordAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'resolved'>): string {
    const id = this.generateAlertId()
    const fullAlert: SecurityAlert = {
      id,
      timestamp: Date.now(),
      resolved: false,
      ...alert,
    }

    this.alerts.push(fullAlert)
    
    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift()
    }

    // Log critical alerts
    if (fullAlert.level === 'critical') {
      console.error('CRITICAL SECURITY ALERT:', fullAlert)
    } else if (fullAlert.level === 'high') {
      console.warn('HIGH SECURITY ALERT:', fullAlert)
    }

    return id
  }

  /**
   * Record CSP violation
   */
  recordCSPViolation(report: Omit<CSPViolationReport, 'timestamp'>): void {
    const violation: CSPViolationReport = {
      timestamp: Date.now(),
      ...report,
    }

    this.cspViolations.push(violation)
    
    // Keep only recent violations (last 1000)
    if (this.cspViolations.length > 1000) {
      this.cspViolations.shift()
    }

    // Create alert for repeated violations
    const recentViolations = this.countRecentCSPViolations()
    if (recentViolations > 10) {
      this.recordAlert({
        level: 'medium',
        type: 'csp_violation',
        message: `High number of CSP violations detected: ${recentViolations}`,
        details: { count: recentViolations, latestViolation: violation },
      })
    }
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(hours: number = 24): SecurityAlert[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    return this.alerts.filter(alert => alert.timestamp > cutoff)
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(hours: number = 24): SecurityMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    return this.metrics.filter(metric => metric.timestamp > cutoff)
  }

  /**
   * Get recent CSP violations
   */
  getRecentCSPViolations(hours: number = 24): CSPViolationReport[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    return this.cspViolations.filter(violation => violation.timestamp > cutoff)
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      return true
    }
    return false
  }

  /**
   * Get security summary
   */
  getSecuritySummary(): {
    totalAlerts: number
    unresolvedAlerts: number
    criticalAlerts: number
    recentCSPViolations: number
    lastHealthCheck: SessionHealthCheck | null
  } {
    const recentAlerts = this.getRecentAlerts()
    const criticalAlerts = recentAlerts.filter(a => a.level === 'critical' && !a.resolved)
    const unresolvedAlerts = recentAlerts.filter(a => !a.resolved)
    
    return {
      totalAlerts: recentAlerts.length,
      unresolvedAlerts: unresolvedAlerts.length,
      criticalAlerts: criticalAlerts.length,
      recentCSPViolations: this.countRecentCSPViolations(),
      lastHealthCheck: null, // Will be populated by caller
    }
  }

  private countRecentAlerts(type: SecurityAlert['type'], hours: number = 24): number {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    return this.alerts.filter(alert => 
      alert.type === type && alert.timestamp > cutoff
    ).length
  }

  private countRecentCSPViolations(hours: number = 24): number {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    return this.cspViolations.filter(violation => 
      violation.timestamp > cutoff
    ).length
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async startPeriodicCleanup(): Promise<void> {
    const cleanupInterval = 60 * 60 * 1000 // 1 hour
    
    setInterval(async () => {
      try {
        // Cleanup expired sessions
        const { cleanupExpiredSessions } = await import('./session-manager')
        await cleanupExpiredSessions()
        
        // Cleanup Redis session store
        const sessionStore = getRedisSessionStore()
        await sessionStore.cleanup()
        
        this.lastCleanup = new Date()
        
        console.log('Periodic security cleanup completed')
      } catch (error) {
        console.error('Periodic cleanup failed:', error)
        
        this.recordAlert({
          level: 'medium',
          type: 'suspicious_activity',
          message: 'Periodic cleanup failed',
          details: { error: error.toString() },
        })
      }
    }, cleanupInterval)
  }

  private startMetricsCollection(): void {
    const metricsInterval = 5 * 60 * 1000 // 5 minutes
    
    setInterval(async () => {
      try {
        await this.recordMetrics()
      } catch (error) {
        console.error('Metrics collection failed:', error)
      }
    }, metricsInterval)
  }
}

// Singleton instance
const securityMonitor = new SecurityMonitor()

/**
 * Get security monitor instance
 */
export function getSecurityMonitor(): SecurityMonitor {
  return securityMonitor
}

/**
 * Helper functions for common monitoring tasks
 */
export const SecurityMonitorHelpers = {
  /**
   * Record rate limit violation
   */
  recordRateLimitViolation(clientIP: string, endpoint: string): void {
    securityMonitor.recordAlert({
      level: 'medium',
      type: 'rate_limit',
      message: 'Rate limit exceeded',
      details: { clientIP, endpoint },
    })
  },

  /**
   * Record authentication failure
   */
  recordAuthFailure(clientIP: string, reason: string): void {
    securityMonitor.recordAlert({
      level: 'high',
      type: 'auth_failure',
      message: 'Authentication failed',
      details: { clientIP, reason },
    })
  },

  /**
   * Record suspicious activity
   */
  recordSuspiciousActivity(clientIP: string, activity: string, details: Record<string, any>): void {
    securityMonitor.recordAlert({
      level: 'high',
      type: 'suspicious_activity',
      message: activity,
      details: { clientIP, ...details },
    })
  },

  /**
   * Get health check for API
   */
  async getHealthCheck(): Promise<SessionHealthCheck> {
    return await securityMonitor.checkHealth()
  },

  /**
   * Get security dashboard data
   */
  async getSecurityDashboard(): Promise<{
    health: SessionHealthCheck
    summary: ReturnType<SecurityMonitor['getSecuritySummary']>
    recentMetrics: SecurityMetrics[]
    recentAlerts: SecurityAlert[]
  }> {
    const health = await securityMonitor.checkHealth()
    const summary = securityMonitor.getSecuritySummary()
    const recentMetrics = securityMonitor.getRecentMetrics(6) // Last 6 hours
    const recentAlerts = securityMonitor.getRecentAlerts(6) // Last 6 hours

    return {
      health,
      summary,
      recentMetrics,
      recentAlerts,
    }
  },
}

export default securityMonitor