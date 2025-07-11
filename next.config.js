/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  experimental: {
    optimizePackageImports: ['@azure/msal-react'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Add retry logic for chunk loading
      config.output.chunkLoadTimeout = 30000 // 30 seconds
      config.output.crossOriginLoading = 'anonymous'
    }
    return config
  },
  async headers() {
    // Inline security headers configuration to avoid require() issues
    const securityHeaders = [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), encrypted-media=(), fullscreen=(self), picture-in-picture=()',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Cross-Origin-Embedder-Policy',
        value: 'require-corp',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
      },
      {
        key: 'Cross-Origin-Resource-Policy',
        value: 'same-origin',
      },
    ]
    
    // Remove some headers in development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/(.*)',
          headers: securityHeaders.filter(header => 
            !['Cross-Origin-Embedder-Policy', 'Cross-Origin-Opener-Policy'].includes(header.key)
          ),
        },
      ]
    }
    
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
}

module.exports = nextConfig
