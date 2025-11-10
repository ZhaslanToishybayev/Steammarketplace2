# ADR-0003: Implement JWT Authentication with Refresh Tokens

## Status
**Accepted** - 2024-01-01

## Context
The Steam Marketplace needs a secure authentication system for users. Users authenticate with Steam, and we issue our own tokens for API access. Requirements:
- Secure API access for authenticated users
- Session management without server-side state
- Steam OpenID integration
- Token rotation for security
- Support for multiple concurrent sessions
- Easy integration with React frontend
- Mobile app compatibility (future)

## Decision
We will implement **JWT (JSON Web Token)** based authentication with **refresh token rotation**.

### Authentication Flow

```
1. User clicks "Login with Steam"
2. Redirect to Steam OpenID
3. Steam redirects back with openid.identity
4. Verify Steam ticket server-side
5. Issue JWT access token (15 min) + refresh token (7 days)
6. Store refresh token hash in database
7. Client stores both tokens
8. Client uses access token for API calls
9. When access token expires, use refresh token to get new pair
10. Refresh token is rotated (invalidated after use)
```

### Token Structure

**Access Token** (JWT):
```json
{
  "sub": "user_id",
  "username": "SteamUser",
  "steamId": "76561198000000000",
  "iat": 1234567890,
  "exp": 1234568790,
  "type": "access"
}
```

**Refresh Token** (Random UUID):
```
refresh_token_id: "uuid-v4"
user_id: "user_id"
token_hash: "bcrypt_hash"
expires_at: "2024-01-08T00:00:00Z"
revoked: false
```

## Implementation

### Token Service

```javascript
// services/tokenService.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class TokenService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = '15m';
    this.refreshTokenExpiry = '7d';
  }

  generateAccessToken(user) {
    return jwt.sign(
      {
        sub: user._id,
        username: user.username,
        steamId: user.steamId,
        type: 'access'
      },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry }
    );
  }

  generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  async hashRefreshToken(token) {
    return await bcrypt.hash(token, 12);
  }

  async verifyRefreshToken(token, hashedToken) {
    return await bcrypt.compare(token, hashedToken);
  }

  async createTokenPair(user) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken();
    const tokenHash = await this.hashRefreshToken(refreshToken);

    return { accessToken, refreshToken, tokenHash };
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.accessTokenSecret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}

module.exports = new TokenService();
```

### Auth Controller

```javascript
// controllers/authController.js
const tokenService = require('../services/tokenService');
const userRepository = require('../repositories/userRepository');

class AuthController {
  async login(req, res) {
    const { steamId, ticket } = req.body;

    // Verify Steam ticket
    const isValid = await steamService.verifyTicket(ticket, steamId);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Steam ticket' });
    }

    // Get or create user
    let user = await userRepository.findBySteamId(steamId);
    if (!user) {
      user = await userRepository.create({ steamId });
    }

    // Generate tokens
    const { accessToken, refreshToken, tokenHash } =
      await tokenService.createTokenPair(user);

    // Store refresh token
    await refreshTokenRepository.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    logger.logAuth('login', user._id, 'success', { steamId });

    res.json({
      token: accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
      user: sanitizeUser(user)
    });
  }

  async refreshToken(req, res) {
    const { refreshToken } = req.body;

    // Find stored token
    const stored = await refreshTokenRepository.findValidToken(refreshToken);
    if (!stored) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Verify token
    const isValid = await tokenService.verifyRefreshToken(
      refreshToken,
      stored.tokenHash
    );
    if (!isValid) {
      await refreshTokenRepository.revoke(stored._id);
      return res.status(401).json({ error: 'Token revoked' });
    }

    // Get user
    const user = await userRepository.findById(stored.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Rotate refresh token
    await refreshTokenRepository.revoke(stored._id);
    const { accessToken, refreshToken: newRefreshToken, tokenHash } =
      await tokenService.createTokenPair(user);

    await refreshTokenRepository.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    res.json({
      token: accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900
    });
  }

  async logout(req, res) {
    const { refreshToken } = req.body;

    await refreshTokenRepository.revokeByToken(refreshToken);

    logger.logAuth('logout', req.user.id, 'success');

    res.json({ message: 'Logged out successfully' });
  }

  async logoutAll(req, res) {
    await refreshTokenRepository.revokeAllUserTokens(req.user.id);

    logger.logAuth('logout_all', req.user.id, 'success');

    res.json({ message: 'Logged out from all devices' });
  }
}

module.exports = new AuthController();
```

### Refresh Token Model

```javascript
// models/RefreshToken.js
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tokenHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Auto-delete when expired
  },
  revoked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'refresh_tokens'
});

refreshTokenSchema.index({ userId: 1, revoked: 1 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
```

### Auth Middleware

```javascript
// middleware/auth.js
const tokenService = require('../services/tokenService');
const userRepository = require('../repositories/userRepository');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const payload = tokenService.verifyAccessToken(token);
    const user = await userRepository.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const payload = tokenService.verifyAccessToken(token);
      const user = await userRepository.findById(payload.sub);
      req.user = user;
    } catch (error) {
      // Ignore invalid token for optional auth
    }
  }

  next();
};

module.exports = { authenticateToken, optionalAuth };
```

## Security Considerations

### Token Security
- **Short-lived access tokens**: 15 minutes to limit exposure
- **Refresh token rotation**: Each use generates new token
- **Token revocation**: Compromised tokens can be revoked
- **Secure storage**: Tokens in httpOnly cookies or secure storage
- **HTTPS only**: Transmit over TLS only

### Database Security
- **Token hashing**: Bcrypt with salt rounds 12
- **Indexing**: Efficient queries for token validation
- **Auto-expiration**: TTL indexes for old tokens
- **Audit logging**: Log all authentication events

### Steam Integration
- **Ticket verification**: Always verify on server
- **Rate limiting**: Prevent brute force on Steam auth
- **Error handling**: Don't leak Steam API details

## Frontend Integration

### React Implementation

```javascript
// hooks/useAuth.js
import { useState, useEffect, useContext, createContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));

  const api = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 && refreshToken) {
      // Try to refresh
      const newTokens = await refreshAccessToken(refreshToken);
      if (newTokens) {
        setToken(newTokens.token);
        setRefreshToken(newTokens.refreshToken);
        headers['Authorization'] = `Bearer ${newTokens.token}`;
        return fetch(url, { ...options, headers });
      }
    }

    return response;
  };

  const login = async (steamData) => {
    const response = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(steamData)
    });
    const data = await response.json();
    if (response.ok) {
      setToken(data.token);
      setRefreshToken(data.refreshToken);
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    return data;
  };

  const logout = async () => {
    if (refreshToken) {
      await api('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });
    }
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

## Alternatives Considered

### Option 1: Session-Based Auth (Express Session)
- **Pros**: Simple, built-in middleware
- **Cons**: Requires server-side state, doesn't scale horizontally
- **Rejected because**: Need horizontal scaling, not suitable for microservices

### Option 2: OAuth 2.0 with Passport
- **Pros**: Standard protocol, good ecosystem
- **Cons**: Complex for our use case, Steam integration requires custom strategy
- **Rejected because**: JWT is simpler and sufficient for our needs

### Option 3: Stateless JWT without Refresh Tokens
- **Pros**: Simpler implementation
- **Cons**: Token theft = permanent access, no revocation
- **Rejected because**: Security risk, can't revoke compromised tokens

### Option 4: API Keys
- **Pros**: Simple, no token refresh
- **Cons**: Not suitable for user auth, hard to revoke
- **Rejected because**: Need user identity and Steam integration

## Performance Considerations

### Token Validation
- **Fast verification**: JWT is stateless, O(1) lookup
- **No DB call**: Access token validation doesn't hit database
- **Refresh needed**: Only when access token expires

### Database Impact
- **Refresh token queries**: One query per token refresh
- **Index optimization**: `{ userId: 1, revoked: 1, expiresAt: 1 }`
- **Cleanup**: TTL index auto-removes expired tokens

### Rate Limiting
- **Login attempts**: 5 per minute per IP
- **Refresh attempts**: 10 per minute per user
- **Steam API calls**: 60 per minute per IP

## Related Decisions
- [ADR-0001: Use Clean Architecture](0001-use-clean-architecture.md)
- [ADR-0004: Implement Repository Pattern](0004-repository-pattern.md)
- [ADR-0006: Add Circuit Breaker](0006-circuit-breaker.md)

## References
- RFC 7519: JSON Web Token (JWT)
- RFC 6749: OAuth 2.0 Authorization Framework
- Steam OpenID Documentation
- OWASP Authentication Cheat Sheet
