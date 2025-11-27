# Authentication Strategies Documentation

## Overview

This directory contains three Passport.js authentication strategies for the Steam Marketplace Backend:

1. **JWT Strategy** - Standard JWT authentication for API endpoints
2. **JWT Refresh Strategy** - JWT refresh token handling for token renewal
3. **Steam Strategy** - Steam OpenID authentication for user login

## Strategy Configuration

All strategies are configured using NestJS's `@nestjs/passport` integration and follow Passport.js patterns. **Important**: None of these strategies use RxJS Observables - they return Promises or use callback patterns as appropriate for Passport.js.

## Individual Strategy Documentation

### 1. JWT Strategy

**Purpose**: Handles standard JWT authentication for API endpoints using Bearer tokens.

**File**: `jwt.strategy.ts`

**Key Features**:
- Extracts JWT from Authorization header as Bearer token
- Validates token expiration and signature
- Loads complete user entity with ban/status checks
- Returns fully populated User entity

**Configuration**:
```typescript
super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false,
  secretOrKey: configService.get<string>('JWT_SECRET'),
});
```

**Return Type**: `Promise<User>`
- **Why Promise**: Asynchronous user lookup from database
- **Why User**: Complete user entity needed for authorization checks
- **No Observable usage**: Passport strategies don't use RxJS

**Key Points**:
- Loads full user entity to check `isBanned` and `isActive` status
- Throws `UnauthorizedException` if user not found
- Integrates with TypeORM for database queries

**Usage Example**:
```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req: RequestWithUser) {
  return req.user; // Fully populated User entity
}
```

### 2. JWT Refresh Strategy

**Purpose**: Handles JWT refresh token validation for token renewal endpoints.

**File**: `jwt-refresh.strategy.ts`

**Key Features**:
- Extracts refresh token from request body
- Validates refresh token signature and expiration
- Returns user ID and refresh token for further processing
- Uses `passReqToCallback: true` to access request body

**Configuration**:
```typescript
super({
  jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
  ignoreExpiration: false,
  secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
  passReqToCallback: true,
});
```

**Return Type**: `Promise<{ userId: string; refreshToken: string }>`
- **Why Promise**: Asynchronous token validation
- **Why Object**: Returns minimal data needed for refresh logic
- **No Observable usage**: Passport strategies don't use RxJS

**Key Points**:
- Extracts refresh token from request body field
- Returns structured data for AuthService processing
- Enables refresh token rotation and validation

**Usage Example**:
```typescript
@UseGuards(JwtRefreshAuthGuard)
@Post('refresh')
async refreshToken(@Body() body: RefreshTokenDto) {
  // Strategy validates token and returns { userId, refreshToken }
  return this.authService.refreshAccessToken(body.refreshToken);
}
```

### 3. Steam Strategy

**Purpose**: Handles Steam OpenID authentication for user login via Steam.

**File**: `steam.strategy.ts`

**Key Features**:
- Uses Steam OpenID for authentication
- Extracts Steam ID from OpenID identifier URL
- Processes Steam profile data (username, avatar, profile URL)
- Uses callback pattern (not async/await) as required by Passport.js

**Configuration**:
```typescript
super({
  returnURL: configService.get<string>('STEAM_RETURN_URL'),
  realm: configService.get<string>('STEAM_REALM'),
  apiKey: configService.get<string>('STEAM_API_KEY'),
  passReqToCallback: true,
});
```

**Return Type**: `Promise<void>` with callback
- **Why callback**: Passport.js Steam strategy requires callback pattern
- **Why void**: Callback handles success/error, no direct return
- **No Observable usage**: Passport strategies don't use RxJS

**Key Points**:
- Uses callback pattern: `done(error, userData)` or `done(error, null)`
- Extracts Steam ID from OpenID identifier URL using regex
- Processes Steam profile photos for avatar URLs
- Handles Steam profile data normalization

**Steam ID Extraction**:
```typescript
// Example: https://steamcommunity.com/profiles/76561198012345678/
// Extracts: 76561198012345678
const steamIdMatch = identifier.match(/\/(\d{17})\/?$/);
const steamId = steamIdMatch ? steamIdMatch[1] : null;
```

**Usage Example**:
```typescript
@UseGuards(SteamAuthGuard)
@Get('auth/steam/return')
async steamCallback(@Request() req: RequestWithUser) {
  // Strategy processes Steam profile and returns userData
  return this.authService.processSteamLogin(req.user);
}
```

## Common Patterns

### Strategy Registration

All strategies are registered in the AuthModule:

```typescript
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // ... other imports
  ],
  providers: [
    JwtStrategy,
    JwtRefreshStrategy,
    SteamStrategy,
    // ... other providers
  ],
})
export class AuthModule {}
```

### Guard Usage

Strategies are typically used with custom guards:

```typescript
// JWT Strategy with JwtAuthGuard
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req: RequestWithUser) { ... }

// Steam Strategy with SteamAuthGuard
@UseGuards(SteamAuthGuard)
@Get('auth/steam/return')
async steamCallback(@Request() req: RequestWithUser) { ... }

// JWT Refresh Strategy with JwtRefreshAuthGuard
@UseGuards(JwtRefreshAuthGuard)
@Post('refresh')
async refreshToken(@Body() body: RefreshTokenDto) { ... }
```

### Environment Variables

All strategies use environment variables for configuration:

```bash
# JWT Configuration
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Steam Configuration
STEAM_API_KEY=your-steam-api-key
STEAM_RETURN_URL=http://localhost:3001/api/auth/steam/return
STEAM_REALM=http://localhost:3001/
```

## TypeScript Considerations

### No Observable Usage

**Important**: Passport strategies do NOT use RxJS Observables. This is by design:

1. **Passport.js Architecture**: Uses callback patterns, not reactive streams
2. **Authentication Flow**: Synchronous validation fits better with callback pattern
3. **Error Handling**: Passport expects specific error patterns via callbacks

### Return Type Alignment

All strategy return types are properly aligned:

```typescript
// JWT Strategy - Async user lookup
async validate(payload: any): Promise<User> { ... }

// JWT Refresh Strategy - Async token validation
async validate(req: any, payload: any): Promise<{ userId: string; refreshToken: string }> { ... }

// Steam Strategy - Callback pattern (no return)
async validate(req: any, identifier: string, profile: any, done: VerifyCallback): Promise<void> { ... }
```

### Type Safety

**Express Request Augmentation**: All strategies leverage the globally augmented Express Request type:

```typescript
// From src/types/express.d.ts
interface Request {
  user?: User;        // Populated by auth guards
  userId?: string;    // Shorthand for user.id
  sessionID?: string; // Session identifier
}
```

## Testing Patterns

### Unit Test Examples

```typescript
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockAuthService: Partial<AuthService>;

  beforeEach(() => {
    mockAuthService = {
      getUserById: jest.fn(),
    };

    strategy = new JwtStrategy(mockConfigService as ConfigService, mockAuthService as AuthService);
  });

  it('should validate JWT and return user', async () => {
    const payload = { sub: 'user-id-123' };
    const mockUser = { id: 'user-id-123', username: 'testuser' };

    mockAuthService.getUserById = jest.fn().mockResolvedValue(mockUser);

    const result = await strategy.validate(payload);
    expect(result).toEqual(mockUser);
    expect(mockAuthService.getUserById).toHaveBeenCalledWith('user-id-123');
  });

  it('should throw UnauthorizedException for non-existent user', async () => {
    const payload = { sub: 'non-existent-user' };

    mockAuthService.getUserById = jest.fn().mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
```

### Steam Strategy Testing

```typescript
describe('SteamStrategy', () => {
  it('should validate Steam profile and call done with user data', (done) => {
    const mockReq = {};
    const mockIdentifier = 'https://steamcommunity.com/profiles/76561198012345678/';
    const mockProfile = {
      displayName: 'TestUser',
      photos: [
        { value: 'https://steamcdn.com/steamheader.jpg' },
        { value: 'https://steamcdn.com/steamavatar.jpg' },
      ],
      profileUrl: 'https://steamcommunity.com/id/testuser/'
    };

    strategy.validate(mockReq, mockIdentifier, mockProfile, (error, userData) => {
      expect(error).toBeNull();
      expect(userData).toEqual({
        steamId: '76561198012345678',
        username: 'TestUser',
        avatar: 'https://steamcdn.com/steamavatar.jpg',
        // ... other fields
      });
      done();
    });
  });
});
```

## Common Troubleshooting

### JWT Strategy Issues

**Issue**: "User not found" errors
**Solution**: Ensure user exists in database and ID matches JWT payload

**Issue**: Token expiration errors
**Solution**: Check `JWT_SECRET` configuration and token expiration settings

### JWT Refresh Strategy Issues

**Issue**: Refresh token not found in request body
**Solution**: Ensure `refreshToken` field is present in request body

**Issue**: Invalid refresh token
**Solution**: Verify `JWT_REFRESH_SECRET` and token format

### Steam Strategy Issues

**Issue**: Steam ID extraction fails
**Solution**: Check Steam OpenID identifier format and regex pattern

**Issue**: Steam API key invalid
**Solution**: Verify `STEAM_API_KEY` is valid and set in environment

**Issue**: Callback not called
**Solution**: Ensure `done()` callback is always called with success or error

### Strategy Registration Issues

**Issue**: "Strategy not found" errors
**Solution**: Ensure strategy is registered in AuthModule providers array

**Issue**: Strategy not being called
**Solution**: Verify guard is properly configured and strategy name matches

## Best Practices

### Security Considerations

1. **JWT Secrets**: Use strong, unique secrets for access and refresh tokens
2. **Token Expiration**: Set appropriate expiration times for security
3. **User Validation**: Always validate user existence and status
4. **Error Handling**: Provide appropriate error messages without exposing sensitive data

### Performance Considerations

1. **Database Queries**: Minimize database queries in validate methods
2. **Caching**: Consider caching user data for frequently accessed fields
3. **Async Operations**: Use async/await appropriately for database operations

### Code Organization

1. **Separation of Concerns**: Keep authentication logic separate from business logic
2. **Strategy Reusability**: Design strategies to be reusable across different endpoints
3. **Error Handling**: Use consistent error patterns across all strategies

## References

- [Passport.js Documentation](http://www.passportjs.org/)
- [NestJS Authentication Guide](https://docs.nestjs.com/security/authentication)
- [passport-jwt Documentation](https://github.com/mikenicholson/passport-jwt)
- [passport-steam Documentation](https://github.com/liamcurry/passport-steam)
- [Express Request Type Augmentation](./../../../../types/express.d.ts)