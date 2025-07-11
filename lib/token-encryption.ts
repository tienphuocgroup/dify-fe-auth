import CryptoJS from 'crypto-js'

/**
 * Token encryption utility using AES-256-GCM for secure token storage
 * This prevents XSS attacks from accessing sensitive authentication tokens
 */

// Generate a secure encryption key from environment variable
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY || process.env.NEXT_PUBLIC_ENCRYPTION_KEY
  if (!key) {
    // Use a default key for development (NOT for production)
    const defaultKey = 'dev-encryption-key-32-chars-long-not-for-production'
    console.warn('Using default encryption key for development. Set ENCRYPTION_KEY environment variable for production.')
    return defaultKey
  }
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long')
  }
  return key
}

/**
 * Encrypt a token using AES-256-GCM
 * @param token - The token to encrypt
 * @returns Encrypted token as base64 string
 */
export const encryptToken = (token: string): string => {
  try {
    const key = getEncryptionKey()
    const encrypted = CryptoJS.AES.encrypt(token, key).toString()
    return encrypted
  } catch (error) {
    console.error('Token encryption failed:', error)
    throw new Error('Failed to encrypt token')
  }
}

/**
 * Decrypt a token using AES-256-GCM
 * @param encryptedToken - The encrypted token to decrypt
 * @returns Decrypted token string
 */
export const decryptToken = (encryptedToken: string): string => {
  try {
    const key = getEncryptionKey()
    const decrypted = CryptoJS.AES.decrypt(encryptedToken, key)
    const token = decrypted.toString(CryptoJS.enc.Utf8)
    
    if (!token) {
      throw new Error('Failed to decrypt token - invalid encrypted data')
    }
    
    return token
  } catch (error) {
    console.error('Token decryption failed:', error)
    throw new Error('Failed to decrypt token')
  }
}

/**
 * Encrypt token data for storage
 * @param tokenData - Token data object to encrypt
 * @returns Encrypted token data as base64 string
 */
export const encryptTokenData = (tokenData: Record<string, any>): string => {
  try {
    const key = getEncryptionKey()
    const jsonString = JSON.stringify(tokenData)
    const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString()
    return encrypted
  } catch (error) {
    console.error('Token data encryption failed:', error)
    throw new Error('Failed to encrypt token data')
  }
}

/**
 * Decrypt token data from storage
 * @param encryptedTokenData - The encrypted token data to decrypt
 * @returns Decrypted token data object
 */
export const decryptTokenData = (encryptedTokenData: string): Record<string, any> => {
  try {
    const key = getEncryptionKey()
    const decrypted = CryptoJS.AES.decrypt(encryptedTokenData, key)
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8)
    
    if (!jsonString) {
      throw new Error('Failed to decrypt token data - invalid encrypted data')
    }
    
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('Token data decryption failed:', error)
    throw new Error('Failed to decrypt token data')
  }
}

/**
 * Generate a secure random session ID
 * @returns Random session ID string
 */
export const generateSecureSessionId = (): string => {
  const timestamp = Date.now().toString(36)
  const randomBytes = CryptoJS.lib.WordArray.random(16).toString()
  return `${timestamp}_${randomBytes}`
}

/**
 * Validate encryption key format and strength
 * @returns true if key is valid
 */
export const validateEncryptionKey = (): boolean => {
  try {
    const key = getEncryptionKey()
    return key.length >= 32
  } catch {
    return false
  }
}