# ============================================
# CDN Configuration for Steam Marketplace
# Cloudflare + Nginx Optimization
# ============================================

# ============================================
# 1. CLOUDFLARE SETTINGS
# ============================================

# Page Rules (in Cloudflare Dashboard):
# 1. URL Pattern: sgomarket.com/*
#    Settings:
#    - Cache Level: Standard
#    - Browser Cache TTL: 4 hours
#    - Always Online: On
#    - Brotli: On
#    - Auto Minify: HTML, CSS, JS

# 2. URL Pattern: sgomarket.com/_next/static/*
#    Settings:
#    - Cache Level: Cache Everything
#    - Browser Cache TTL: 1 month
#    - Edge Cache TTL: 1 month

# 3. URL Pattern: sgomarket.com/api/*
#    Settings:
#    - Cache Level: Bypass
#    - Security Level: High

# ============================================
# 2. NGINX OPTIMIZATION
# ============================================

# Add to nginx.conf in http block:
http {
    # Enable Brotli compression
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Enable Gzip as fallback
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1M;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }

    # Next.js static files
    location /_next/static/ {
        alias /app/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # HTML files
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }
}

# ============================================
# 3. NEXT.JS OPTIMIZATION
# ============================================

# In next.config.js:
module.exports = {
    // Image optimization
    images: {
        domains: ['steamcdn-a.akamaihd.net', 'community.cloudflare.steamstatic.com'],
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },

    // Compression
    compress: true,

    // Output static HTML for better SEO and performance
    output: 'standalone',

    // Bundle optimization
    experimental: {
        optimizeCss: true,
        gzipSize: true,
    },

    // Webpack optimization
    webpack: (config, { isServer }) => {
        // Optimize bundles
        if (!isServer) {
            config.optimization.splitChunks = {
                chunks: 'all',
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                    },
                },
            };
        }
        return config;
    },
};

# ============================================
# 4. PERFORMANCE HEADERS
# ============================================

# Add these headers to improve performance:
# - Preload critical resources
# - Enable HTTP/2 Push
# - Optimize fonts loading

# In nginx location block:
add_header Link "</_next/static/css/app.css>; rel=preload; as=style; type=text/css; nopush" always;
add_header Link "</_next/static/chunks/main.js>; rel=preload; as=script; type=text/javascript; nopush" always;
add_header Link "</_next/static/chunks/webpack.js>; rel=preload; as=script; type=text/javascript; nopush" always;

# ============================================
# 5. MONITORING
# ============================================

# Performance monitoring endpoints:
# - /api/performance/metrics - Page load times
# - /api/performance/cdn - CDN status
# - /api/performance/cache - Cache hit rates