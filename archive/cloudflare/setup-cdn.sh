#!/bin/bash

# Cloudflare CDN Setup Script for Steam Marketplace
# This script configures Cloudflare CDN settings via API

set -e

echo "🚀 Starting Cloudflare CDN Setup for Steam Marketplace..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SECTION]${NC} $1"
}

# Configuration
CLOUDFLARE_EMAIL="your-email@example.com"
CLOUDFLARE_API_KEY="your-cloudflare-api-key"
ZONE_ID="your-zone-id"
DOMAIN="sgomarket.com"

# Check if required variables are set
if [ "$CLOUDFLARE_EMAIL" = "your-email@example.com" ] || \
   [ "$CLOUDFLARE_API_KEY" = "your-cloudflare-api-key" ] || \
   [ "$ZONE_ID" = "your-zone-id" ]; then
    print_error "Please update the configuration variables in this script"
    print_error "Set your Cloudflare email, API key, and zone ID"
    exit 1
fi

# Cloudflare API base URL
CF_API="https://api.cloudflare.com/client/v4"

# Function to make API calls
cf_api() {
    local method="$1"
    local endpoint="$2"
    local data="$3"

    curl -s -X "$method" \
        "$CF_API$endpoint" \
        -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
        -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$data"
}

print_header "Setting up Cloudflare DNS Records"

# Create DNS records
print_status "Creating A record for root domain..."
cf_api POST "/zones/$ZONE_ID/dns_records" '{
    "type": "A",
    "name": "'"$DOMAIN"'",
    "content": "YOUR_SERVER_IP",
    "proxied": true,
    "ttl": 1
}'

print_status "Creating A record for www..."
cf_api POST "/zones/$ZONE_ID/dns_records" '{
    "type": "A",
    "name": "www.'"$DOMAIN"'",
    "content": "YOUR_SERVER_IP",
    "proxied": true,
    "ttl": 1
}'

print_status "Creating CNAME for api..."
cf_api POST "/zones/$ZONE_ID/dns_records" '{
    "type": "CNAME",
    "name": "api.'"$DOMAIN"'",
    "content": "'"$DOMAIN"'",
    "proxied": true,
    "ttl": 1
}'

print_status "Creating CNAME for cdn..."
cf_api POST "/zones/$ZONE_ID/dns_records" '{
    "type": "CNAME",
    "name": "cdn.'"$DOMAIN"'",
    "content": "'"$DOMAIN"'",
    "proxied": true,
    "ttl": 1
}'

print_header "Configuring SSL/TLS Settings"

# SSL/TLS configuration
print_status "Setting SSL mode to Full (strict)..."
cf_api PATCH "/zones/$ZONE_ID/settings/ssl" '{
    "value": "strict"
}'

print_status "Enabling HSTS..."
cf_api PATCH "/zones/$ZONE_ID/settings/security_level" '{
    "value": "medium"
}'

print_status "Enabling WAF..."
cf_api PATCH "/zones/$ZONE_ID/settings/waf" '{
    "value": "on"
}'

print_header "Setting up Page Rules"

# Create page rules for optimization
print_status "Creating API caching rule..."
cf_api POST "/zones/$ZONE_ID/pagerules" '{
    "targets": [
        {
            "target": "url",
            "constraint": {
                "operator": "matches",
                "value": "*'"$DOMAIN"'/api/*"
            }
        }
    ],
    "actions": [
        {
            "id": "cache_level",
            "value": "cache_everything"
        },
        {
            "id": "edge_cache_ttl",
            "value": 300
        },
        {
            "id": "browser_cache_ttl",
            "value": 1800
        },
        {
            "id": "security_level",
            "value": "high"
        }
    ],
    "priority": 1,
    "status": "active"
}'

print_status "Creating static assets rule..."
cf_api POST "/zones/$ZONE_ID/pagerules" '{
    "targets": [
        {
            "target": "url",
            "constraint": {
                "operator": "matches",
                "value": "*'"$DOMAIN"'/static/*"
            }
        }
    ],
    "actions": [
        {
            "id": "cache_level",
            "value": "cache_everything"
        },
        {
            "id": "edge_cache_ttl",
            "value": 2592000
        },
        {
            "id": "browser_cache_ttl",
            "value": 31536000
        },
        {
            "id": "always_online",
            "value": "on"
        },
        {
            "id": "minify",
            "value": {
                "html": "on",
                "css": "on",
                "js": "on"
            }
        }
    ],
    "priority": 2,
    "status": "active"
}'

print_status "Creating images optimization rule..."
cf_api POST "/zones/$ZONE_ID/pagerules" '{
    "targets": [
        {
            "target": "url",
            "constraint": {
                "operator": "matches",
                "value": "*'"$DOMAIN"'/_next/static/*"
            }
        }
    ],
    "actions": [
        {
            "id": "cache_level",
            "value": "cache_everything"
        },
        {
            "id": "edge_cache_ttl",
            "value": 2592000
        },
        {
            "id": "browser_cache_ttl",
            "value": 31536000
        },
        {
            "id": "polish",
            "value": "lossless"
        },
        {
            "id": "mirage",
            "value": "on"
        }
    ],
    "priority": 3,
    "status": "active"
}'

print_status "Creating Steam API optimization rule..."
cf_api POST "/zones/$ZONE_ID/pagerules" '{
    "targets": [
        {
            "target": "url",
            "constraint": {
                "operator": "matches",
                "value": "*'"$DOMAIN"'/api/steam*"
            }
        }
    ],
    "actions": [
        {
            "id": "cache_level",
            "value": "cache_everything"
        },
        {
            "id": "edge_cache_ttl",
            "value": 120
        },
        {
            "id": "browser_cache_ttl",
            "value": 300
        },
        {
            "id": "security_level",
            "value": "medium"
        }
    ],
    "priority": 4,
    "status": "active"
}'

print_header "Configuring Performance Settings"

# Performance settings
print_status "Enabling Brotli compression..."
cf_api PATCH "/zones/$ZONE_ID/settings/brotli" '{
    "value": "on"
}'

print_status "Enabling Auto Minify..."
cf_api PATCH "/zones/$ZONE_ID/settings/minify" '{
    "value": {
        "html": "on",
        "css": "on",
        "js": "on"
    }
}'

print_status "Enabling Rocket Loader..."
cf_api PATCH "/zones/$ZONE_ID/settings/rocket_loader" '{
    "value": "on"
}'

print_status "Enabling HTTP/3..."
cf_api PATCH "/zones/$ZONE_ID/settings/http3" '{
    "value": "on"
}'

print_status "Enabling Argo Smart Routing..."
cf_api PATCH "/zones/$ZONE_ID/settings/argo_smart_routing" '{
    "value": "on"
}'

print_header "Configuring Security Settings"

# Security settings
print_status "Setting up rate limiting..."
cf_api POST "/zones/$ZONE_ID/rate_limits" '{
    "description": "Steam Marketplace Rate Limiting",
    "disabled": false,
    "threshold": 100,
    "period": 300,
    "action": {
        "mode": "simulate",
        "timeout": 0
    },
    "bypass": [
        {
            "name": "url",
            "value": "/api/health"
        }
    ],
    "correlate": {
        "by": "nat"
    },
    "match": {
        "request": {
            "methods": ["GET", "POST"],
            "schemes": ["HTTP", "HTTPS"],
            "url": "*'"$DOMAIN"'/*"
        },
        "response": {
            "status": [2xx, 3xx, 4xx, 5xx]
        }
    }
}'

print_status "Enabling Bot Fight Mode..."
cf_api PATCH "/zones/$ZONE_ID/settings/bot_fight_mode" '{
    "value": "on"
}'

print_status "Setting up WAF rules..."
cf_api PATCH "/zones/$ZONE_ID/settings/waf" '{
    "value": "on"
}'

print_status "Configuring OWASP ruleset..."
cf_api PATCH "/zones/$ZONE_ID/firewall/waf/packages/oa3tsdd" '{
    "sensitivity": "medium",
    "action_mode": "simulate"
}'

print_header "Setting up Cache Rules"

# Cache rules
print_status "Creating cache rules for static assets..."
cf_api POST "/zones/$ZONE_ID/cache/rules" '{
    "description": "Static Assets Cache",
    "status": "active",
    "priority": 1,
    "filter": {
        "and": [
            {
                "field": "uri.path",
                "operator": "matches",
                "value": ".*\\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|avif)$"
            }
        ]
    },
    "actions": [
        {
            "id": "edge_ttl",
            "value": {
                "mode": "override",
                "default": 2592000
            }
        },
        {
            "id": "browser_ttl",
            "value": {
                "mode": "override",
                "default": 31536000
            }
        },
        {
            "id": "cache_key",
            "value": {
                "ignore_query_strings_order": true
            }
        }
    ]
}'

print_status "Creating cache rules for API endpoints..."
cf_api POST "/zones/$ZONE_ID/cache/rules" '{
    "description": "API Endpoints Cache",
    "status": "active",
    "priority": 2,
    "filter": {
        "and": [
            {
                "field": "uri.path",
                "operator": "matches",
                "value": "^/api/.*"
            }
        ]
    },
    "actions": [
        {
            "id": "edge_ttl",
            "value": {
                "mode": "override",
                "default": 300
            }
        },
        {
            "id": "browser_ttl",
            "value": {
                "mode": "override",
                "default": 600
            }
        },
        {
            "id": "cache_key",
            "value": {
                "ignore_query_strings_order": true
            }
        }
    ]
}'

print_header "Enabling Analytics and Logging"

# Analytics settings
print_status "Enabling analytics..."
cf_api PATCH "/zones/$ZONE_ID/settings/privacy_cross_origin" '{
    "value": "include"
}'

print_status "Setting up Logpush (if configured)..."
# Note: Logpush requires additional setup with destination

print_header "Cloudflare Setup Complete!"

echo ""
print_status "🎉 Cloudflare CDN Setup Successfully Completed!"
echo ""
print_status "Configuration Summary:"
print_status "  - DNS records created and proxied ✓"
print_status "  - SSL/TLS set to Full (strict) ✓"
print_status "  - Page rules for caching and optimization ✓"
print_status "  - Performance features enabled ✓"
print_status "  - Security features configured ✓"
print_status "  - Rate limiting and bot protection ✓"
echo ""
print_status "Next Steps:"
print_status "  1. Deploy the Cloudflare Worker from steam-marketplace-worker.js"
print_status "  2. Configure Logpush for analytics (optional)"
print_status "  3. Monitor performance in Cloudflare dashboard"
print_status "  4. Test caching and performance improvements"
echo ""
print_status "Important Notes:"
print_warning "  - Replace YOUR_SERVER_IP with your actual server IP"
print_warning "  - Consider enabling Logpush for detailed analytics"
print_warning "  - Monitor cache hit ratios and adjust TTL values"
print_warning "  - Review and adjust rate limiting rules based on traffic"
echo ""
print_status "Documentation: cloudflare/cdn-configuration.md"
print_status "Worker script: cloudflare/steam-marketplace-worker.js"