/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.steamstatic.com',
        port: '',
        pathname: '/community/images/items/**',
      },
      {
        protocol: 'https',
        hostname: '**.steamcdn-a.akamaihd.net',
        port: '',
        pathname: '/steam/apps/**',
      },
      {
        protocol: 'https',
        hostname: '**.akamaihd.net',
        port: '',
        pathname: '/steamcommunity/public/images/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000',
    CDN_URL: process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.example.com',
    CDN_ENABLED: process.env.NEXT_PUBLIC_CDN_ENABLED || 'false',
    STEAM_CDN: process.env.NEXT_PUBLIC_STEAM_CDN || 'https://steamcdn-a.akamaihd.net',
  },
  compress: true,
  headers() {
    const apiOrigins = process.env.NEXT_PUBLIC_API_URL
      ? [process.env.NEXT_PUBLIC_API_URL]
      : process.env.NODE_ENV === 'production'
      ? [] // Production requires explicit API URLs
      : ['http://localhost:3000', 'https://localhost:3000'];

    return [
      {
        source: '/api/:path*',
        headers: [
          // CORS headers for API routes
          {
            key: 'Access-Control-Allow-Origin',
            value: apiOrigins.join(' ')
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, Accept, X-Requested-With, X-User-Agent, X-Client-Version'
          },
          {
            key: 'Access-Control-Expose-Headers',
            value: 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset'
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400'
          },
          // Security headers
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          // Consistent CSP with backend for static assets
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https://steamcdn-a.akamaihd.net https://community.cloudflare.steamstatic.com https://steamcommunity-a.akamaihd.net https://*.akamaihd.net",
              "media-src 'self' https://*.akamaihd.net",
              "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "script-src 'self'",
              "connect-src 'self' " + (process.env.NEXT_PUBLIC_WS_URL || '') + " ws://localhost:* wss://localhost:*",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'"
            ].join('; ')
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          // Main page CSP that aligns with backend
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://stackpath.bootstrapcdn.com",
              "img-src 'self' data: https: https://steamcdn-a.akamaihd.net https://community.cloudflare.steamstatic.com https://steamcommunity-a.akamaihd.net https://*.akamaihd.net blob:",
              "connect-src 'self' " + apiOrigins.join(' ') + " " + (process.env.NEXT_PUBLIC_WS_URL || '') + " ws://localhost:* wss://localhost:* https://steamcommunity.com https://api.steampowered.com",
              "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
              "frame-src 'self' https://steamcommunity.com https://www.youtube.com",
              "media-src 'self' https://*.akamaihd.net",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              process.env.NODE_ENV === 'production' ? "upgrade-insecure-requests" : ""
            ].filter(Boolean).join('; ')
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  async rewrites() {
    // When running on the same port, don't proxy API calls
    // Let them be handled by the unified server directly
    return [
      // Only proxy external services if needed
      // For now, with unified server, we don't need any rewrites
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname + '/src'),
    };

    // Optimize bundle size
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true,
        },
      },
    };

    return config;
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  productionBrowserSourceMaps: false,
  generateBuildId: async () => {
    return process.env.BUILD_ID || new Date().getTime().toString();
  },
  // Add turbopack root for monorepo
  experimental: {
    turbopack: {
      root: __dirname,
    },
  },
};