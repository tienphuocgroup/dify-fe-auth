import NodeCache from 'node-cache'
import * as crypto from 'crypto'

// Cache for Microsoft public keys (24 hours TTL)
const keysCache = new NodeCache({ stdTTL: 86400 })

// Microsoft's well-known configuration endpoints
const MICROSOFT_DISCOVERY_ENDPOINTS = [
  'https://login.microsoftonline.com/common/v2.0/.well-known/openid_configuration',
  'https://login.microsoftonline.com/organizations/v2.0/.well-known/openid_configuration'
]

export interface MicrosoftPublicKey {
  kty: string
  use: string
  kid: string
  x5t: string
  n: string
  e: string
  x5c: string[]
}

export interface MicrosoftJWKS {
  keys: MicrosoftPublicKey[]
}

export interface MicrosoftDiscoveryDocument {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri: string
  userinfo_endpoint: string
  end_session_endpoint: string
}

/**
 * Fetch Microsoft public keys for JWT signature verification
 */
export async function getMicrosoftPublicKeys(kid?: string): Promise<string | null> {
  try {
    // Check cache first
    const cacheKey = kid ? `key_${kid}` : 'all_keys'
    const cachedKey = keysCache.get<string>(cacheKey)
    if (cachedKey) {
      return cachedKey
    }

    // Fetch JWKS from Microsoft
    const jwks = await fetchMicrosoftJWKS()
    if (!jwks || !jwks.keys) {
      console.error('Failed to fetch Microsoft JWKS')
      return null
    }

    // Find the specific key if kid is provided
    if (kid) {
      const key = jwks.keys.find(k => k.kid === kid)
      if (!key) {
        console.warn(`Key with kid ${kid} not found in Microsoft JWKS`)
        return null
      }

      const publicKey = convertJWKToPEM(key)
      if (publicKey) {
        keysCache.set(cacheKey, publicKey)
        return publicKey
      }
    }

    // Cache all keys for future use
    for (const key of jwks.keys) {
      const publicKey = convertJWKToPEM(key)
      if (publicKey) {
        keysCache.set(`key_${key.kid}`, publicKey)
      }
    }

    // Return the first key if no specific kid was requested
    if (!kid && jwks.keys.length > 0) {
      return convertJWKToPEM(jwks.keys[0])
    }

    return null
  } catch (error) {
    console.error('Error fetching Microsoft public keys:', error)
    return null
  }
}

/**
 * Fetch Microsoft JWKS from discovery endpoint
 */
async function fetchMicrosoftJWKS(): Promise<MicrosoftJWKS | null> {
  try {
    // Try to get JWKS URI from discovery document
    const jwksUri = await getJWKSUriFromDiscovery()
    if (!jwksUri) {
      console.error('Failed to get JWKS URI from Microsoft discovery')
      return null
    }

    // Fetch JWKS from the discovered URI
    const response = await fetch(jwksUri, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'webapp-conversation/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })

    if (!response.ok) {
      console.error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`)
      return null
    }

    const jwks = await response.json()
    
    // Validate JWKS structure
    if (!jwks || !Array.isArray(jwks.keys)) {
      console.error('Invalid JWKS structure received from Microsoft')
      return null
    }

    console.info(`Fetched ${jwks.keys.length} keys from Microsoft JWKS`)
    return jwks
  } catch (error) {
    console.error('Error fetching Microsoft JWKS:', error)
    return null
  }
}

/**
 * Get JWKS URI from Microsoft discovery endpoint
 */
async function getJWKSUriFromDiscovery(): Promise<string | null> {
  for (const discoveryEndpoint of MICROSOFT_DISCOVERY_ENDPOINTS) {
    try {
      const response = await fetch(discoveryEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'webapp-conversation/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (response.ok) {
        const discovery: MicrosoftDiscoveryDocument = await response.json()
        if (discovery.jwks_uri) {
          console.info(`Found JWKS URI: ${discovery.jwks_uri}`)
          return discovery.jwks_uri
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch from ${discoveryEndpoint}:`, error)
      continue
    }
  }

  console.error('Failed to discover JWKS URI from all Microsoft endpoints')
  return null
}

/**
 * Convert JWK to PEM format for JWT verification
 */
function convertJWKToPEM(jwk: MicrosoftPublicKey): string | null {
  try {
    if (jwk.kty !== 'RSA') {
      console.warn(`Unsupported key type: ${jwk.kty}`)
      return null
    }

    // Use the x5c certificate if available (preferred method)
    if (jwk.x5c && jwk.x5c.length > 0) {
      const cert = jwk.x5c[0]
      const pem = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`
      return pem
    }

    // Fallback to constructing from n and e values
    if (jwk.n && jwk.e) {
      return constructPEMFromModulusAndExponent(jwk.n, jwk.e)
    }

    console.warn('JWK missing required fields for PEM conversion')
    return null
  } catch (error) {
    console.error('Error converting JWK to PEM:', error)
    return null
  }
}

/**
 * Construct PEM from RSA modulus and exponent
 */
function constructPEMFromModulusAndExponent(modulus: string, exponent: string): string {
  try {
    // Decode base64url values
    const modulusBuffer = Buffer.from(modulus, 'base64url')
    const exponentBuffer = Buffer.from(exponent, 'base64url')

    // Create RSA key object
    const key = crypto.createPublicKey({
      key: {
        kty: 'RSA',
        n: modulusBuffer,
        e: exponentBuffer
      },
      format: 'jwk'
    })

    // Export as PEM
    return key.export({
      format: 'pem',
      type: 'spki'
    }).toString()
  } catch (error) {
    console.error('Error constructing PEM from modulus and exponent:', error)
    throw error
  }
}

/**
 * Preload Microsoft public keys (can be called on startup)
 */
export async function preloadMicrosoftKeys(): Promise<void> {
  try {
    console.info('Preloading Microsoft public keys...')
    await getMicrosoftPublicKeys()
    console.info('Microsoft public keys preloaded successfully')
  } catch (error) {
    console.error('Error preloading Microsoft public keys:', error)
  }
}

/**
 * Clear the keys cache (for testing/debugging)
 */
export function clearKeysCache(): void {
  keysCache.flushAll()
  console.info('Microsoft keys cache cleared')
}

/**
 * Get cache statistics
 */
export function getKeysCacheStats(): { keys: number; hits: number; misses: number } {
  const stats = keysCache.getStats()
  return {
    keys: keysCache.keys().length,
    hits: stats.hits,
    misses: stats.misses
  }
}