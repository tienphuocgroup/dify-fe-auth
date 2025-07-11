import Redis from 'ioredis'
import { SessionData } from './session-manager'

/**
 * Redis-based session store for production scalability
 * Provides persistent session storage with automatic cleanup
 */

export interface RedisConfig {
  host?: string
  port?: number
  password?: string
  db?: number
  connectTimeout?: number
  lazyConnect?: boolean
  retryDelayOnFailover?: number
  enableOfflineQueue?: boolean
  maxRetriesPerRequest?: number
}

export interface RedisSessionStore {
  set(sessionId: string, data: SessionData, ttl?: number): Promise<void>
  get(sessionId: string): Promise<SessionData | null>
  delete(sessionId: string): Promise<void>
  exists(sessionId: string): Promise<boolean>
  updateTTL(sessionId: string, ttl: number): Promise<void>
  getUserSessions(userId: string): Promise<string[]>
  deleteUserSessions(userId: string): Promise<void>
  cleanup(): Promise<number>
  getStats(): Promise<{ totalSessions: number; activeSessions: number }>
}

class RedisSessionStoreImpl implements RedisSessionStore {
  private redis: Redis
  private connected: boolean = false
  private readonly keyPrefix = 'session:'
  private readonly userKeyPrefix = 'user_sessions:'
  private readonly defaultTTL = 3600 // 1 hour

  constructor(config: RedisConfig = {}) {
    const redisConfig = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || parseInt(process.env.REDIS_DB || '0'),
      connectTimeout: config.connectTimeout || 10000,
      lazyConnect: config.lazyConnect || true,
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      enableOfflineQueue: config.enableOfflineQueue || false,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
    }

    this.redis = new Redis(redisConfig)
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('Redis session store connected')
      this.connected = true
    })

    this.redis.on('error', (error) => {
      console.error('Redis session store error:', error)
      this.connected = false
    })

    this.redis.on('close', () => {
      console.log('Redis session store disconnected')
      this.connected = false
    })

    this.redis.on('reconnecting', () => {
      console.log('Redis session store reconnecting...')
    })
  }

  private getSessionKey(sessionId: string): string {
    return `${this.keyPrefix}${sessionId}`
  }

  private getUserSessionsKey(userId: string): string {
    return `${this.userKeyPrefix}${userId}`
  }

  async set(sessionId: string, data: SessionData, ttl?: number): Promise<void> {
    try {
      const key = this.getSessionKey(sessionId)
      const userKey = this.getUserSessionsKey(data.userId)
      const sessionTTL = ttl || this.defaultTTL

      // Serialize session data
      const serializedData = JSON.stringify(data)

      // Use pipeline for atomic operations
      const pipeline = this.redis.pipeline()
      
      // Set session data with TTL
      pipeline.setex(key, sessionTTL, serializedData)
      
      // Add session to user's session set
      pipeline.sadd(userKey, sessionId)
      pipeline.expire(userKey, sessionTTL)
      
      await pipeline.exec()
      
    } catch (error) {
      console.error('Failed to set session in Redis:', error)
      throw new Error('Failed to store session')
    }
  }

  async get(sessionId: string): Promise<SessionData | null> {
    try {
      const key = this.getSessionKey(sessionId)
      const data = await this.redis.get(key)
      
      if (!data) {
        return null
      }

      return JSON.parse(data) as SessionData
    } catch (error) {
      console.error('Failed to get session from Redis:', error)
      return null
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      const key = this.getSessionKey(sessionId)
      
      // Get session data to remove from user sessions
      const sessionData = await this.get(sessionId)
      
      if (sessionData) {
        const userKey = this.getUserSessionsKey(sessionData.userId)
        
        // Use pipeline for atomic operations
        const pipeline = this.redis.pipeline()
        pipeline.del(key)
        pipeline.srem(userKey, sessionId)
        
        await pipeline.exec()
      } else {
        // Just delete the session key if we can't get the data
        await this.redis.del(key)
      }
    } catch (error) {
      console.error('Failed to delete session from Redis:', error)
      throw new Error('Failed to delete session')
    }
  }

  async exists(sessionId: string): Promise<boolean> {
    try {
      const key = this.getSessionKey(sessionId)
      const exists = await this.redis.exists(key)
      return exists === 1
    } catch (error) {
      console.error('Failed to check session existence in Redis:', error)
      return false
    }
  }

  async updateTTL(sessionId: string, ttl: number): Promise<void> {
    try {
      const key = this.getSessionKey(sessionId)
      await this.redis.expire(key, ttl)
    } catch (error) {
      console.error('Failed to update session TTL in Redis:', error)
      throw new Error('Failed to update session TTL')
    }
  }

  async getUserSessions(userId: string): Promise<string[]> {
    try {
      const userKey = this.getUserSessionsKey(userId)
      const sessions = await this.redis.smembers(userKey)
      
      // Filter out expired sessions
      const validSessions: string[] = []
      
      for (const sessionId of sessions) {
        const exists = await this.exists(sessionId)
        if (exists) {
          validSessions.push(sessionId)
        } else {
          // Remove expired session from user's set
          await this.redis.srem(userKey, sessionId)
        }
      }
      
      return validSessions
    } catch (error) {
      console.error('Failed to get user sessions from Redis:', error)
      return []
    }
  }

  async deleteUserSessions(userId: string): Promise<void> {
    try {
      const userKey = this.getUserSessionsKey(userId)
      const sessions = await this.redis.smembers(userKey)
      
      if (sessions.length > 0) {
        const pipeline = this.redis.pipeline()
        
        // Delete all session keys
        for (const sessionId of sessions) {
          pipeline.del(this.getSessionKey(sessionId))
        }
        
        // Delete user sessions set
        pipeline.del(userKey)
        
        await pipeline.exec()
      }
    } catch (error) {
      console.error('Failed to delete user sessions from Redis:', error)
      throw new Error('Failed to delete user sessions')
    }
  }

  async cleanup(): Promise<number> {
    try {
      // Redis automatically handles TTL cleanup, but we can clean up orphaned user session sets
      const userKeys = await this.redis.keys(`${this.userKeyPrefix}*`)
      let cleanedCount = 0
      
      for (const userKey of userKeys) {
        const sessions = await this.redis.smembers(userKey)
        const validSessions = []
        
        for (const sessionId of sessions) {
          const exists = await this.exists(sessionId)
          if (exists) {
            validSessions.push(sessionId)
          } else {
            cleanedCount++
          }
        }
        
        if (validSessions.length === 0) {
          // Remove empty user session set
          await this.redis.del(userKey)
        } else if (validSessions.length !== sessions.length) {
          // Update user session set with only valid sessions
          await this.redis.del(userKey)
          if (validSessions.length > 0) {
            await this.redis.sadd(userKey, ...validSessions)
          }
        }
      }
      
      return cleanedCount
    } catch (error) {
      console.error('Failed to cleanup Redis sessions:', error)
      return 0
    }
  }

  async getStats(): Promise<{ totalSessions: number; activeSessions: number }> {
    try {
      const sessionKeys = await this.redis.keys(`${this.keyPrefix}*`)
      const totalSessions = sessionKeys.length
      
      // Count active sessions (those with TTL > 0)
      let activeSessions = 0
      for (const key of sessionKeys) {
        const ttl = await this.redis.ttl(key)
        if (ttl > 0) {
          activeSessions++
        }
      }
      
      return { totalSessions, activeSessions }
    } catch (error) {
      console.error('Failed to get Redis session stats:', error)
      return { totalSessions: 0, activeSessions: 0 }
    }
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping()
      return result === 'PONG'
    } catch (error) {
      console.error('Redis health check failed:', error)
      return false
    }
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit()
    } catch (error) {
      console.error('Error during Redis disconnect:', error)
    }
  }
}

// Singleton instance
let redisSessionStore: RedisSessionStore | null = null

export function getRedisSessionStore(): RedisSessionStore {
  if (!redisSessionStore) {
    redisSessionStore = new RedisSessionStoreImpl()
  }
  return redisSessionStore
}

// Factory function for testing
export function createRedisSessionStore(config: RedisConfig = {}): RedisSessionStore {
  return new RedisSessionStoreImpl(config)
}

export default RedisSessionStoreImpl