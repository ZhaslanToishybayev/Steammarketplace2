# 🚀 Steam Authentication Integration

## 📋 Overview

This document provides comprehensive implementation details for Steam OAuth authentication in the CS.Money-level marketplace platform.

## 🔧 Implementation Status

### ✅ Phase 1.1: Steam OpenID Integration - COMPLETED

**Current Implementation:**
- ✅ Steam OpenID authentication controller
- ✅ Steam service with full API integration
- ✅ User validation and creation
- ✅ JWT token generation
- ✅ Session management
- ✅ Error handling and validation

### 🚨 Phase 1.2: User Profile Sync - IN PROGRESS

**Implementation Status:**
- ✅ User entity with Steam fields
- ✅ Profile synchronization service
- ⚠️ Steam API key required for full functionality
- ⚠️ Trade ban validation pending

### 🚨 Phase 1.3: JWT Authentication - IN PROGRESS

**Implementation Status:**
- ✅ JWT service implementation
- ✅ Refresh token management
- ✅ Token validation guards
- ⚠️ Session persistence optimization needed

## 🏗️ Architecture

### Backend Structure

```
apps/backend/src/modules/auth/
├── auth.controller.ts          # Steam OAuth endpoints
├── services/
│   ├── steam.service.ts        # Steam API integration
│   ├── auth.service.ts         # User management
│   └── jwt.service.ts          # Token management
├── entities/
│   ├── user.entity.ts          # User database schema
│   └── refresh-token.entity.ts # Token storage
├── strategies/
│   ├── steam.strategy.ts       # Passport Steam strategy
│   ├── jwt.strategy.ts         # JWT validation
│   └── jwt-refresh.strategy.ts # Refresh token validation
└── guards/
    ├── steam-auth.guard.ts     # Steam authentication guard
    ├── jwt-auth.guard.ts       # JWT authentication guard
    └── jwt-refresh-auth.guard.ts # Refresh token guard
```

### Frontend Integration

```
apps/frontend/src/
├── app/api/auth/steam/route.ts # Next.js API proxy
├── hooks/useSteamAuth.ts         # React authentication hook
└── components/auth/SteamLogin.ts # Login component
```

## 🔑 Configuration

### Environment Variables

```bash
# Required for Steam Integration
STEAM_API_KEY=your_actual_steam_api_key_here
STEAM_RETURN_URL=http://localhost:3002/auth/steam/return
STEAM_REALM=http://localhost:3000

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_min_256_bits
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
```

### Getting Steam API Key

1. Visit [Steam Partner API Key](https://steamcommunity.com/dev/apikey)
2. Sign in with your Steam account
3. Enter your domain (for development: localhost)
4. Copy the API key to your `.env` file

## 📡 API Endpoints

### Steam Authentication

```typescript
// Frontend: Initiate Steam Login
GET /api/auth/steam
// Proxies to: http://localhost:3002/auth/steam

// Backend: Steam OAuth Callback
GET /auth/steam/return?openid_*...
// Handles Steam OpenID response and creates user session
```

### Authentication Status

```typescript
// Check authentication status
GET /auth/me
Authorization: Bearer <access_token>

// Refresh tokens
POST /auth/refresh
{
  "refreshToken": "your_refresh_token"
}

// Logout
POST /auth/logout
Authorization: Bearer <access_token>
```

## 🔄 Authentication Flow

### Step 1: Initiate Login

```typescript
// Frontend hook
const loginWithSteam = () => {
  const authWindow = window.open(
    '/api/auth/steam',
    'steam_auth',
    'width=500,height=600,toolbar=no,menubar=no'
  );

  // Listen for authentication response
  const handleAuthMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;

    if (event.data.type === 'STEAM_AUTH_SUCCESS') {
      const { user, accessToken, expiresIn } = event.data.data;
      // Store tokens and update state
      localStorage.setItem('accessToken', accessToken);
      setUser(user);
    }
  };

  window.addEventListener('message', handleAuthMessage);
};
```

### Step 2: Steam OAuth Flow

1. **Redirect to Steam**: User is redirected to `steamcommunity.com/openid/login`
2. **User Authentication**: User logs in and authorizes your application
3. **Callback Handling**: Steam redirects back with OpenID parameters
4. **Validation**: Backend validates the OpenID response with Steam
5. **Profile Fetch**: Get user profile using Steam Web API
6. **User Creation**: Create or update user in database
7. **Token Generation**: Generate JWT access and refresh tokens
8. **Response**: Return tokens to frontend via popup message

### Step 3: Session Management

```typescript
// JWT Structure
{
  "userId": "uuid",
  "steamId": "76561198012345678",
  "username": "SteamUser",
  "iat": 1234567890,
  "exp": 1234568790
}

// Refresh Token Flow
1. Access token expires (15 minutes)
2. Use refresh token to get new access token
3. Refresh token is rotated for security
4. Old refresh token is revoked
```

## 🔐 Security Features

### 1. Steam Profile Validation

```typescript
// Validate Steam profile is public
if (player.communityvisibilitystate !== 3) {
  throw new Error('Steam profile is not public');
}

// Check trade eligibility
const bans = await this.getPlayerBans(steamId);
if (bans.tradeBanned) {
  throw new Error('User is trade banned');
}
```

### 2. Rate Limiting

```typescript
// Prevent brute force attacks
@RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})
```

### 3. CORS Protection

```typescript
// Configure CORS for Steam integration
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

### 4. Input Validation

```typescript
// Validate trade URL format
validateTradeUrl(tradeUrl: string): { isValid: boolean; token?: string } {
  const url = new URL(tradeUrl);
  const token = url.searchParams.get('token');

  if (!token || !/^[a-zA-Z0-9_-]+$/.test(token)) {
    return { isValid: false };
  }

  return { isValid: true, token };
}
```

## 🐛 Error Handling

### Common Steam Authentication Errors

```typescript
// Steam API Errors
STEAM_API_KEY_NOT_CONFIGURED: 'STEAM_API_KEY not configured'
STEAM_PROFILE_NOT_PUBLIC: 'Steam profile is not public'
STEAM_AUTH_FAILED: 'Steam authentication failed'
STEAM_OPENID_VALIDATION_FAILED: 'Steam OpenID validation failed'

// User Validation Errors
USER_TRADE_BANNED: 'User is trade banned'
USER_COMMUNITY_BANNED: 'User is community banned'
USER_LIMITED_ACCOUNT: 'User has limited account'
ACCOUNT_TOO_NEW: 'Account is less than 7 days old'
```

### Error Response Format

```typescript
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Steam authentication failed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/auth/steam/return"
}
```

## 🧪 Testing

### Unit Tests

```bash
# Test Steam service
npm run test:auth

# Test authentication endpoints
npm run test:e2e auth
```

### Integration Tests

```typescript
describe('Steam Authentication', () => {
  it('should redirect to Steam login', async () => {
    const response = await request(app)
      .get('/auth/steam')
      .expect(302);

    expect(response.headers.location).toContain('steamcommunity.com/openid/login');
  });

  it('should validate Steam OpenID response', async () => {
    const mockOpenIdParams = {
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'id_res',
      'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
      // ... other OpenID parameters
    };

    const profile = await steamService.validateOpenIdResponse(mockOpenIdParams);
    expect(profile.steamId).toBeDefined();
    expect(profile.username).toBeDefined();
  });
});
```

### Manual Testing

1. **Start Development Servers**:
   ```bash
   npm run dev:frontend  # http://localhost:3000
   npm run dev:backend   # http://localhost:3002
   ```

2. **Test Steam Login**:
   - Navigate to frontend
   - Click "Login with Steam"
   - Complete Steam authentication
   - Verify user is logged in

3. **Test Token Refresh**:
   - Wait for access token to expire
   - Verify automatic refresh
   - Check new tokens are issued

## 📊 Monitoring

### Key Metrics

```typescript
// Authentication Success Rate
steam_auth_success_rate = successful_auths / total_auth_attempts

// Steam API Response Time
steam_api_response_time = time_to_validate_steam_response

// Token Refresh Rate
token_refresh_rate = refresh_requests / total_sessions

// Error Rates
steam_api_error_rate = steam_api_errors / total_requests
```

### Health Checks

```typescript
// Steam API Health Check
GET /health/steam
{
  "status": "healthy",
  "steamApiKeyConfigured": true,
  "lastSteamApiCall": "2024-01-01T00:00:00.000Z",
  "responseTime": 250
}
```

## 🚀 Production Deployment

### Environment Setup

1. **Production Environment Variables**:
   ```bash
   STEAM_API_KEY=production_steam_api_key
   STEAM_RETURN_URL=https://yoursite.com/auth/steam/return
   STEAM_REALM=https://yoursite.com
   JWT_SECRET=production_jwt_secret_256_bits
   ```

2. **SSL Configuration**:
   ```typescript
   // Force HTTPS in production
   app.enable('trust proxy');
   app.use((req, res, next) => {
     if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
       res.redirect(`https://${req.header('host')}${req.url}`);
     } else {
       next();
     }
   });
   ```

3. **Session Storage**:
   ```typescript
   // Use Redis for session storage in production
   RedisStore = require('connect-redis')(session);
   app.use(session({
     store: new RedisStore({ host: 'localhost', port: 6379 }),
     secret: process.env.SESSION_SECRET,
     resave: false,
     saveUninitialized: false
   }));
   ```

### Security Hardening

1. **Content Security Policy**:
   ```typescript
   app.use(csp({
     directives: {
       defaultSrc: ["'self'"],
       connectSrc: ["'self'", "https://steamcommunity.com", "https://api.steampowered.com"],
       frameSrc: ["'self'", "https://steamcommunity.com"]
     }
   }));
   ```

2. **Helmet Security Headers**:
   ```typescript
   app.use(helmet({
     hsts: {
       maxAge: 31536000,
       includeSubDomains: true,
       preload: true
     }
   }));
   ```

## 📈 Performance Optimization

### Caching Strategy

```typescript
// Cache Steam profile data
@Cacheable({
  ttl: 300000, // 5 minutes
  key: (steamId) => `steam:profile:${steamId}`
})
async getPlayerSummaries(steamId: string) {
  // Steam API call
}

// Cache user trade eligibility
@Cacheable({
  ttl: 600000, // 10 minutes
  key: (steamId) => `steam:trade_eligibility:${steamId}`
})
async canUserTrade(steamId: string) {
  // Trade ban check
}
```

### Database Optimization

```typescript
// Index Steam ID for fast lookups
@Entity('users')
export class User {
  @Index('idx_steam_id')
  @Column({ unique: true })
  steamId: string;
}

// Optimize user queries
async findBySteamId(steamId: string): Promise<User> {
  return this.userRepository.findOne({
    where: { steamId },
    select: ['id', 'steamId', 'username', 'avatar', 'tradeUrl', 'isTradeUrlValid']
  });
}
```

## 🔮 Next Steps

### Immediate Tasks (Phase 1 Complete)

1. ✅ **Steam OAuth Integration** - Full OpenID implementation
2. ✅ **User Management** - Complete user entity and service
3. ✅ **JWT Authentication** - Token generation and validation
4. ⚠️ **Environment Configuration** - Add production Steam API key

### Upcoming Tasks (Phase 2)

1. 🚨 **Steam Inventory Sync** - Real-time inventory synchronization
2. 🚨 **Trade URL Validation** - Verify user trade URLs
3. 🚨 **Profile Completeness** - Enhanced user profile management

### Future Enhancements

1. **Steam Guard Integration** - Two-factor authentication
2. **Friend List Integration** - Social features
3. **Achievement Tracking** - Gamification
4. **Real-time Updates** - WebSocket integration

---

**🎯 Target Completion**: Phase 1 (Steam Authentication) - 90% Complete
**📊 Progress**: 6/7 tasks completed
**⏰ Estimated Time**: 2-3 hours for full completion