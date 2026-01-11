# Cloudflare CDN Configuration for Steam Marketplace

## Overview
This configuration optimizes Steam Marketplace performance using Cloudflare's global CDN network with advanced caching, security, and performance features.

## DNS Configuration

### Domain Setup
```
Domain: sgomarket.com
Nameservers: Use Cloudflare nameservers
SSL/TLS: Full (strict)
```

### DNS Records
```
A Record:
- Name: @ (root domain)
- Value: [Your server IP]
- Proxy status: Proxied (orange cloud)

A Record:
- Name: www
- Value: [Your server IP]
- Proxy status: Proxied (orange cloud)

CNAME Record:
- Name: api
- Value: sgomarket.com
- Proxy status: Proxied

CNAME Record:
- Name: cdn
- Value: sgomarket.com
- Proxy status: Proxied
```

## Page Rules Configuration

### Rule 1: API Caching Optimization
```
URL Pattern: sgomarket.com/api/*
Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 5 minutes
- Browser Cache TTL: 30 minutes
- Always Online: Off
- Security Level: High
```

### Rule 2: Static Assets Caching
```
URL Pattern: sgomarket.com/static/*
Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 year
- Always Online: On
- Auto Minify: HTML, CSS, JS
```

### Rule 3: Images and Media Caching
```
URL Pattern: sgomarket.com/_next/static/*
Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 year
- Polish: Lossless
- Mirage: On
```

### Rule 4: Steam API Optimization
```
URL Pattern: sgomarket.com/api/steam*
Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 2 minutes
- Browser Cache TTL: 5 minutes
- Always Online: Off
```

## Advanced Settings

### Caching Configuration
```
Development Mode: Off

Cache Rules:
1. Pattern: *.js, *.css
   - Cache TTL: 1 hour
   - Respect Origin Cache Control: Off

2. Pattern: *.png, *.jpg, *.jpeg, *.gif, *.webp, *.avif
   - Cache TTL: 1 month
   - Respect Origin Cache Control: Off

3. Pattern: *.ico, *.svg
   - Cache TTL: 1 year
   - Respect Origin Cache Control: Off
```

### Performance Settings
```
Brotli Compression: On
Auto Minify: HTML, CSS, JavaScript
Rocket Loader: On
HTTP/2: On
HTTP/3: On
```

### Security Configuration
```
WAF Rules:
- OWASP Core Ruleset: Medium
- Rate Limiting: 100 requests per 5 minutes per IP
- Bot Fight Mode: On
- Challenge Passage: 4 hours

SSL/TLS:
- Mode: Full (strict)
- Minimum TLS Version: 1.2
- Always Use HTTPS: On
- HSTS: Max-Age 31536000, Include Subdomains, No Sniff
```

### Network Settings
```
Argo Smart Routing: On
IP Geolocation: On
Origin Error Page Pass-Thru: On
```

## Custom Headers

### Security Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: *.steam-api.com *.cloudflare.com; connect-src 'self' *.steam-api.com *.cloudflare.com; font-src 'self' *.cloudflare.com;
```

### Performance Headers
```
Cache-Control: public, max-age=31536000, immutable
Vary: Accept-Encoding
```

## Bot Management

### Bot Score Rules
```
Score < 3.0: Block
Score 3.0-5.0: Challenge
Score > 5.0: Allow
```

### Custom Bot Rules
```
User-Agent: *bot*
Action: Block

User-Agent: *crawler*
Action: Challenge
```

## Analytics and Monitoring

### Cloudflare Analytics
```
Enable: All metrics
Logpush: On (to your preferred destination)
```

### Custom Metrics
```
Track:
- API response times
- Cache hit ratios
- Bot traffic patterns
- Security events
```

## Troubleshooting

### Common Issues

1. **High Origin Requests**
   - Check cache rules configuration
   - Verify cache headers from origin
   - Review cache purge settings

2. **SSL/TLS Issues**
   - Ensure proper certificate configuration
   - Check certificate expiration
   - Verify strict mode compatibility

3. **Performance Issues**
   - Enable Argo Smart Routing
   - Verify compression settings
   - Check rate limiting rules

### Optimization Tips

1. **Cache Optimization**
   - Use longer TTL for static assets
   - Implement cache warming
   - Monitor cache hit ratios

2. **Security Optimization**
   - Regularly review WAF rules
   - Monitor bot traffic patterns
   - Update security headers

3. **Performance Optimization**
   - Enable all performance features
   - Monitor Argo performance
   - Use Cloudflare Workers for edge computing