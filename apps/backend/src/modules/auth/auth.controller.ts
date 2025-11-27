import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('steam')
  steamLogin(@Req() req: Request, @Res() res: Response) {
    try {
      const returnUrl = `${req.protocol}://${req.get('host')}/auth/steam/return`;
      const realm = process.env.STEAM_REALM || `${req.protocol}://${req.get('host')}`;

      // For testing, just redirect to a mock Steam auth page
      const mockAuthUrl = `http://localhost:3000/mock-steam-login?returnUrl=${encodeURIComponent(returnUrl)}`;
      res.redirect(mockAuthUrl);
    } catch (error) {
      console.error('Steam login error:', error);
      res.status(500).json({ error: 'Steam login failed' });
    }
  }

  @Get('steam/return')
  async steamCallback(@Req() req: Request, @Res() res: Response) {
    try {
      // Mock Steam callback - in real implementation, this would validate OpenID response
      const mockSteamId = '76561198012345678';
      const mockUserProfile = {
        steamid: mockSteamId,
        personaname: 'TestUser',
        avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fake.jpg',
        profileurl: `https://steamcommunity.com/profiles/${mockSteamId}`
      };

      // Create or update user in database
      const user = await this.authService.validateSteamUser(mockUserProfile);

      // Generate mock authentication tokens
      const authResponse = {
        user: {
          id: user.id,
          steamId: user.steamId,
          nickname: user.nickname,
          avatar: user.avatar,
          profileUrl: user.profileUrl,
          tradeUrl: user.tradeUrl,
          apiKey: user.apiKey,
          apiKeyLastVerified: user.apiKeyLastVerified,
          apiKeyStatus: user.apiKeyStatus,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          stats: user.stats
        },
        accessToken: 'mock-access-token',
        expiresIn: 900
      };

      // Return success HTML with user data
      const responseHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Steam Authentication Successful</title>
          <script>
            // Send user data to frontend
            window.opener.postMessage({
              type: 'STEAM_AUTH_SUCCESS',
              data: ${JSON.stringify(authResponse)}
            }, '${process.env.STEAM_REALM || 'http://localhost:3000'}');

            // Close the popup
            window.close();
          </script>
        </head>
        <body>
          <p>Authentication successful! This window will close automatically.</p>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(responseHtml);
    } catch (error) {
      console.error('Steam callback error:', error);
      const responseHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Steam Authentication Failed</title>
          <script>
            window.opener.postMessage({
              type: 'STEAM_AUTH_ERROR',
              data: { error: 'Authentication failed' }
            }, '${process.env.STEAM_REALM || 'http://localhost:3000'}');
            window.close();
          </script>
        </head>
        <body>
          <p>Authentication failed! This window will close automatically.</p>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      res.status(500).send(responseHtml);
    }
  }

  @Get('me')
  async getCurrentUser(@Req() req: Request) {
    try {
      // For testing, return mock user data
      const mockUser = {
        id: '1',
        steamId: '76561198012345678',
        nickname: 'TestUser',
        avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fake.jpg',
        profileUrl: 'https://steamcommunity.com/profiles/76561198012345678',
        tradeUrl: 'https://steamcommunity.com/trade/123456789/tradeoffers/',
        apiKey: 'mock_api_key_12345',
        apiKeyLastVerified: new Date().toISOString(),
        apiKeyStatus: 'active',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: {
          totalTrades: 15,
          successfulTrades: 12,
          cancelledTrades: 3,
          totalSpent: 250.50,
          totalEarned: 320.00,
          itemsListed: 8,
          itemsSold: 5
        }
      };

      return { data: mockUser };
    } catch (error) {
      console.error('Get current user error:', error);
      return { data: null };
    }
  }
}