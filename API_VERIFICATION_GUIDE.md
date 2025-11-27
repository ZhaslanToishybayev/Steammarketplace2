# API Verification Guide

This guide provides comprehensive manual testing instructions for all Steam Marketplace backend API endpoints.

## Prerequisites

Before testing the API endpoints, ensure the following:

- ✅ Backend is running on `http://localhost:3001`
- ✅ All Docker services are healthy (Postgres, MongoDB, Redis)
- ✅ Database has been seeded with market data (`npm run db:seed`)
- ✅ You have `curl` installed or Postman configured
- ✅ You have `jq` installed for JSON formatting (optional but recommended)

### Starting the Backend

```bash
# Navigate to backend directory
cd apps/backend

# Start backend in development mode
npm run start:dev

# Verify backend is running
curl -I http://localhost:3001/api/health
```

### Checking Docker Services

```bash
# Check all services are running
docker compose ps

# View logs for any service
docker compose logs postgres
docker compose logs mongodb
docker compose logs redis
```

## Testing Public Endpoints

### 1. Health Check

**Endpoint:** `GET /api/health`

```bash
curl -X GET http://localhost:3001/api/health | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "up"
    },
    "queues": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": "up",
    "redis": "up",
    "queues": "up"
  }
}
```

### 2. Readiness Check

**Endpoint:** `GET /api/health/ready`

```bash
curl -X GET http://localhost:3001/api/health/ready | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up",
      "responseTime": 15
    },
    "mongodb": {
      "status": "up",
      "responseTime": 8
    },
    "redis": {
      "status": "up",
      "responseTime": 2
    },
    "queues": {
      "status": "up"
    },
    "memory": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    }
  }
}
```

### 3. Liveness Check

**Endpoint:** `GET /api/health/live`

```bash
curl -X GET http://localhost:3001/api/health/live | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "status": "ok",
  "info": {
    "self": {
      "status": "up",
      "responseTime": 5
    },
    "database": {
      "status": "up",
      "responseTime": 12
    },
    "mongodb": {
      "status": "up",
      "responseTime": 6
    },
    "redis": {
      "status": "up",
      "responseTime": 3
    },
    "memory": {
      "status": "up"
    }
  }
}
```

### 4. Detailed Health Check

**Endpoint:** `GET /api/health/detailed`

```bash
curl -X GET http://localhost:3001/api/health/detailed | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "healthy",
      "details": {
        "postgres": {
          "status": "ok",
          "data": {
            "status": "up",
            "responseTime": 15
          }
        },
        "mongodb": {
          "status": "ok",
          "data": {
            "status": "up",
            "responseTime": 8
          }
        },
        "redis": {
          "status": "ok",
          "data": {
            "status": "up",
            "responseTime": 2
          }
        },
        "user_count": {
          "status": "ok",
          "data": {
            "count": 1
          }
        }
      }
    },
    "queues": {
      "status": "healthy",
      "details": {
        "price-updates": {
          "status": "ok",
          "data": {
            "status": "up"
          }
        },
        "inventory-sync": {
          "status": "ok",
          "data": {
            "status": "up"
          }
        },
        "trade-processing": {
          "status": "ok",
          "data": {
            "status": "up"
          }
        }
      }
    },
    "system": {
      "status": "healthy",
      "details": {
        "memory": {
          "status": "ok",
          "data": {
            "status": "up"
          }
        },
        "storage": {
          "status": "ok",
          "data": {
            "status": "up"
          }
        }
      }
    },
    "external": {
      "status": "healthy",
      "details": {
        "steam-api": {
          "status": "ok",
          "data": {
            "status": "up",
            "responseTime": 45
          }
        }
      }
    }
  }
}
```

### 5. API Documentation

**Endpoint:** `GET /api/docs`

```bash
curl -I http://localhost:3001/api/docs
```

**Expected Response:**
```
Status: 200 OK
Content-Type: text/html; charset=utf-8
```

**Verification:** Open http://localhost:3001/api/docs in your browser to view Swagger UI.

### 6. Metrics Endpoint

**Endpoint:** `GET /api/metrics`

```bash
curl -X GET http://localhost:3001/api/metrics
```

**Expected Response:**
```
Status: 200 OK
Content-Type: text/plain; charset=utf-8
# Prometheus format metrics
# HELP http_requests_total Total number of HTTP requests
# HELP process_cpu_user_seconds_total Total user CPU time
...
```

### 7. Status Dashboard

**Endpoint:** `GET /api/status`

```bash
curl -X GET http://localhost:3001/api/status | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "endpoints": [
    {
      "path": "/api/health",
      "method": "GET",
      "isPublic": true,
      "isAdmin": false,
      "errorCount": 0
    },
    {
      "path": "/api/auth/steam",
      "method": "GET",
      "isPublic": true,
      "isAdmin": false,
      "errorCount": 0
    },
    {
      "path": "/api/inventory",
      "method": "GET",
      "isPublic": false,
      "isAdmin": false,
      "errorCount": 0
    }
  ],
  "databases": {
    "postgres": "up",
    "mongodb": "up",
    "redis": "up"
  },
  "configuration": {
    "nodeEnv": "development",
    "port": 3001,
    "corsOrigins": ["http://localhost:3000", "http://localhost:3001"]
  }
}
```

## Testing Authentication Flow

### 1. Initiate Steam OAuth

**Endpoint:** `GET /api/auth/steam`

```bash
curl -I http://localhost:3001/api/auth/steam
```

**Expected Response:**
```
Status: 302 Found
Location: https://steamcommunity.com/openid/login?...
```

**What happens:** This redirects to Steam's OAuth page where you can log in.

### 2. Obtain JWT Token

To test protected endpoints, you need a JWT token. Follow these steps:

1. **Open your browser** and navigate to your frontend application (usually http://localhost:3000)
2. **Click "Login with Steam"** to initiate the OAuth flow
3. **Complete Steam authentication** by logging in and authorizing the application
4. **Copy the JWT token** from browser DevTools:
   - Open Chrome DevTools (F12)
   - Go to Application > Local Storage
   - Find the `token` key and copy its value

### 3. Get Current User Information

**Endpoint:** `GET /api/auth/me`

**Requires:** JWT token from Steam OAuth

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "steamId": "76561198012345678",
    "username": "SteamUser123",
    "avatar": "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/xx/xx.jpg",
    "profileUrl": "https://steamcommunity.com/profiles/76561198012345678",
    "tradeUrl": "https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abc123def",
    "isTradeUrlValid": true,
    "lastLoginAt": "2025-01-01T00:00:00.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### 4. Update Trade URL

**Endpoint:** `PATCH /api/auth/trade-url`

**Requires:** JWT token

```bash
curl -X PATCH http://localhost:3001/api/auth/trade-url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tradeUrl": "https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abc123def"
  }' | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "user": {
    "tradeUrl": "https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abc123def",
    "isTradeUrlValid": true
  }
}
```

### 5. Refresh Token

**Endpoint:** `POST /api/auth/refresh`

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }' | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "accessToken": "NEW_JWT_ACCESS_TOKEN",
  "refreshToken": "NEW_REFRESH_TOKEN",
  "expiresIn": 604800
}
```

## Testing Inventory Endpoints

### 1. Get User Inventory

**Endpoint:** `GET /api/inventory`

**Requires:** JWT token

```bash
curl -X GET "http://localhost:3001/api/inventory?appId=730&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "data": [
    {
      "id": "item_123",
      "name": "AK-47 | Redline (Field-Tested)",
      "classId": "123456789",
      "instanceId": "987654321",
      "appId": 730,
      "contextId": 2,
      "description": {
        "marketName": "AK-47 | Redline (Field-Tested)",
        "marketHashName": "AK-47%20Redline%20Field-Tested",
        "iconUrl": "https://steamcommunity-a.akamaihd.net/economy/image/...",
        "descriptions": [...],
        "actions": [...]
      },
      "tradable": true,
      "marketable": true,
      "commodity": false,
      "quantity": 1,
      "tags": [...],
      "lastSyncedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 10,
  "totalPages": 15
}
```

### 2. Sync Inventory

**Endpoint:** `POST /api/inventory/sync`

**Requires:** JWT token

```bash
curl -X POST http://localhost:3001/api/inventory/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appId": 730,
    "contextId": 2
  }' | jq
```

**Expected Response:**
```
Status: 202 Accepted
{
  "message": "Inventory sync queued",
  "jobId": "sync_123456",
  "appId": 730,
  "contextId": 2,
  "userId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### 3. Get Inventory Statistics

**Endpoint:** `GET /api/inventory/stats`

**Requires:** JWT token

```bash
curl -X GET http://localhost:3001/api/inventory/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "totalItems": 150,
  "totalValue": 1250.50,
  "games": {
    "730": {
      "totalItems": 85,
      "totalValue": 890.25,
      "appName": "Counter-Strike: Global Offensive"
    },
    "570": {
      "totalItems": 45,
      "totalValue": 280.75,
      "appName": "Dota 2"
    }
  },
  "lastSync": "2025-01-01T00:00:00.000Z"
}
```

## Testing Pricing Endpoints

### 1. Get Item Price

**Endpoint:** `GET /api/pricing/item/:itemId`

**Requires:** JWT token

```bash
curl -X GET http://localhost:3001/api/pricing/item/123456789 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "itemId": "123456789",
  "price": 12.50,
  "currency": "USD",
  "sources": [
    {
      "name": "Steam Market",
      "price": 12.75,
      "volume": 50,
      "lastUpdated": "2025-01-01T00:00:00.000Z"
    },
    {
      "name": "Internal Analytics",
      "price": 12.25,
      "confidence": 0.85,
      "lastUpdated": "2025-01-01T00:00:00.000Z"
    }
  ],
  "lastUpdated": "2025-01-01T00:00:00.000Z"
}
```

### 2. Get Price History

**Endpoint:** `GET /api/pricing/history/:itemId`

**Requires:** JWT token

```bash
curl -X GET "http://localhost:3001/api/pricing/history/123456789?interval=day&limit=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

**Expected Response:**
```
Status: 200 OK
[
  {
    "date": "2025-01-01",
    "price": 12.50,
    "volume": 25,
    "trades": 8
  },
  {
    "date": "2025-01-02",
    "price": 12.75,
    "volume": 30,
    "trades": 12
  }
]
```

### 3. Get Market Analytics

**Endpoint:** `GET /api/pricing/analytics`

**Requires:** JWT token

```bash
curl -X GET "http://localhost:3001/api/pricing/analytics?appId=730&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "topMovers": [
    {
      "itemId": "item_123",
      "name": "AK-47 | Redline",
      "changePercent": 15.5,
      "currentPrice": 12.50,
      "previousPrice": 10.82
    }
  ],
  "marketOverview": {
    "totalItems": 15000,
    "averagePrice": 8.25,
    "volume": 1250,
    "trend": "bullish"
  }
}
```

## Testing Trading Endpoints

### 1. Get Trade History

**Endpoint:** `GET /api/trading/history`

**Requires:** JWT token

```bash
curl -X GET "http://localhost:3001/api/trading/history?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "data": [
    {
      "id": "trade_123",
      "type": "buy",
      "status": "completed",
      "totalValue": 25.50,
      "fee": 0.75,
      "items": [
        {
          "itemId": "item_123",
          "name": "AK-47 | Redline",
          "quantity": 1,
          "price": 12.50
        }
      ],
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 10
}
```

### 2. Create Trade Offer

**Endpoint:** `POST /api/trading/offers`

**Requires:** JWT token

```bash
curl -X POST http://localhost:3001/api/trading/offers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "buy",
    "items": [
      {
        "itemId": "item_123",
        "price": 12.50,
        "quantity": 1
      }
    ],
    "counterPartySteamId": "76561198012345678"
  }' | jq
```

**Expected Response:**
```
Status: 201 Created
{
  "id": "offer_123",
  "status": "pending",
  "type": "buy",
  "totalValue": 12.50,
  "items": [...],
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### 3. Get Active Bots

**Endpoint:** `GET /api/trading/bots`

**Requires:** JWT token

```bash
curl -X GET http://localhost:3001/api/trading/bots \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

**Expected Response:**
```
Status: 200 OK
[
  {
    "id": "bot_1",
    "accountName": "Sgovt1",
    "status": "active",
    "isOnline": true,
    "inventoryCount": 1500,
    "lastActivity": "2025-01-01T00:00:00.000Z"
  }
]
```

## Testing Bot Management (Admin Only)

### 1. Get All Bots

**Endpoint:** `GET /api/bots`

**Requires:** JWT token with admin role

```bash
curl -X GET http://localhost:3001/api/bots \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" | jq
```

**Expected Response:**
```
Status: 200 OK
[
  {
    "id": "bot_1",
    "accountName": "Sgovt1",
    "status": "active",
    "isOnline": true,
    "inventoryCount": 1500,
    "lastActivity": "2025-01-01T00:00:00.000Z",
    "apiKey": "REDACTED"
  }
]
```

### 2. Create New Bot

**Endpoint:** `POST /api/bots`

**Requires:** JWT token with admin role

```bash
curl -X POST http://localhost:3001/api/bots \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountName": "Sgovt2",
    "password": "YourBotPassword123!",
    "sharedSecret": "LVke3WPKHWzT8pCNSemh2FMuJ90=",
    "identitySecret": "fzCjA+NZa0b3yOeEMhln81qgNM4=",
    "apiKey": "E1FC69B3707FF57C6267322B0271A86B",
    "tradeToken": "abc123def",
    "steamId": "76561198012345679"
  }' | jq
```

**Expected Response:**
```
Status: 201 Created
{
  "id": "bot_2",
  "accountName": "Sgovt2",
  "status": "active",
  "isOnline": true,
  "inventoryCount": 0,
  "lastActivity": "2025-01-01T00:00:00.000Z",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### 3. Bot Actions

**Endpoint:** `POST /api/bots/:id/action`

**Requires:** JWT token with admin role

```bash
curl -X POST http://localhost:3001/api/bots/bot_1/action \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "restart"
  }' | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "message": "Bot action queued",
  "action": "restart",
  "botId": "bot_1",
  "jobId": "action_123"
}
```

## Testing Wallet Endpoints

### 1. Get Wallet Balance

**Endpoint:** `GET /api/wallet`

**Requires:** JWT token

```bash
curl -X GET http://localhost:3001/api/wallet \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "balance": 1250.50,
  "currency": "USD",
  "pending": 25.75,
  "available": 1224.75,
  "transactions": [
    {
      "id": "txn_123",
      "type": "credit",
      "amount": 50.00,
      "description": "Item sale",
      "status": "completed",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. Withdraw Funds

**Endpoint:** `POST /api/wallet/withdraw`

**Requires:** JWT token

```bash
curl -X POST http://localhost:3001/api/wallet/withdraw \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "method": "stripe",
    "destination": "acct_123456789"
  }' | jq
```

**Expected Response:**
```
Status: 200 OK
{
  "transactionId": "txn_456",
  "status": "pending",
  "amount": 100.00,
  "fee": 2.50,
  "total": 102.50,
  "expectedAt": "2025-01-03T00:00:00.000Z"
}
```

## Testing CORS

### 1. Verify CORS Headers

**Test:** Preflight OPTIONS request

```bash
curl -X OPTIONS http://localhost:3001/api/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v
```

**Expected Headers:**
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With, X-User-Agent, X-Client-Version
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

### 2. Test Actual Request from Frontend Origin

```bash
curl -X GET http://localhost:3001/api/health \
  -H "Origin: http://localhost:3000" \
  -v
```

**Expected:** Should include CORS headers and return 200 OK.

### 3. Test Blocked Origin

```bash
curl -X GET http://localhost:3001/api/health \
  -H "Origin: https://malicious-site.com" \
  -v
```

**Expected:** Should return 200 OK but without CORS headers, preventing browser access.

## Common Test Scenarios

### Scenario 1: Complete User Flow

1. **Get health status** - Verify backend is healthy
2. **Initiate Steam OAuth** - Start authentication
3. **Complete OAuth** - Log in via Steam
4. **Get user profile** - Verify JWT works
5. **Sync inventory** - Test inventory functionality
6. **Get item prices** - Test pricing system
7. **Create trade offer** - Test trading system
8. **Check wallet** - Test wallet system

### Scenario 2: Admin Workflow

1. **Login as admin** - Use admin account
2. **Check bot status** - Verify all bots are online
3. **Create new bot** - Test bot management
4. **Monitor trade queue** - Check trading system
5. **Review analytics** - Check pricing system

### Scenario 3: Error Handling

1. **Test invalid JWT** - Use expired/invalid token
2. **Test missing authentication** - Call protected endpoints without token
3. **Test rate limiting** - Make rapid requests
4. **Test invalid parameters** - Use invalid query parameters
5. **Test database errors** - Simulate database issues

## Using Postman

### Importing from Swagger

1. **Open Postman**
2. **Click "Import"**
3. **Enter URL:** `http://localhost:3001/api-json` (OpenAPI JSON)
4. **Click "Import"**

### Setting up Environment

1. **Create new environment** called "Steam Marketplace"
2. **Add variables:**
   - `baseUrl`: `http://localhost:3001`
   - `authToken`: (leave empty, will be set after OAuth)
   - `adminToken`: (leave empty, will be set after admin login)

### Collections

The imported collection will include:
- Health endpoints
- Authentication endpoints
- Inventory endpoints
- Pricing endpoints
- Trading endpoints
- Bot management endpoints
- Wallet endpoints

### Authentication Setup

1. **For each request that requires auth:**
2. **Go to "Authorization" tab**
3. **Select "Bearer Token"**
4. **Enter `{{authToken}}` or `{{adminToken}}`**

## Troubleshooting Common Issues

### Issue: 401 Unauthorized

**Causes:**
- Missing JWT token
- Invalid JWT token
- Expired JWT token

**Solutions:**
1. Complete Steam OAuth flow again
2. Check token format: `Bearer <token>`
3. Verify JWT_SECRET in .env matches token generation

### Issue: 403 Forbidden

**Causes:**
- User lacks admin permissions
- Insufficient role for endpoint

**Solutions:**
1. Use admin account
2. Check user role in database
3. Promote user to admin if needed

### Issue: 500 Internal Server Error

**Causes:**
- Database connection issues
- Missing environment variables
- Code errors

**Solutions:**
1. Check backend logs
2. Verify database connections
3. Check .env configuration

### Issue: CORS Errors

**Causes:**
- Origin not in CORS allowed list
- Missing CORS headers

**Solutions:**
1. Verify CORS_ORIGIN in .env
2. Restart backend after .env changes
3. Check main.ts CORS configuration

### Issue: Database Connection Errors

**Causes:**
- Database services not running
- Incorrect connection strings

**Solutions:**
1. Check `docker compose ps`
2. Verify database credentials
3. Check database logs

## Next Steps

After completing API verification:

1. **Proceed to Steam OAuth integration testing**
2. **Configure trading bot via admin panel**
3. **Test full E2E trading flow**
4. **Run automated E2E tests**
5. **Performance and load testing**
6. **Security testing**

## Verification Checklist

- [ ] Health endpoints return 200 OK
- [ ] Swagger documentation is accessible
- [ ] Steam OAuth redirects correctly
- [ ] JWT authentication works for protected endpoints
- [ ] Inventory sync functions properly
- [ ] Pricing system returns valid data
- [ ] Trading system processes offers
- [ ] Bot management works for admins
- [ ] CORS headers are present and correct
- [ ] Error handling works as expected
- [ ] Rate limiting functions properly
- [ ] Database connections are stable
- [ ] Queue systems are processing jobs

For automated testing, use the verification scripts:
```bash
# Test all endpoints
npm run verify:api

# Test CORS configuration
npm run verify:cors

# Run all verifications
npm run verify:all
```