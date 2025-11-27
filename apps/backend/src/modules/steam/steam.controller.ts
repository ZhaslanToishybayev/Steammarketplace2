import { Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { SteamInventoryService } from './steam-inventory.service';

@Controller('steam')
export class SteamController {
  constructor(private readonly steamInventoryService: SteamInventoryService) {}

  // Steam login endpoint
  @Get('auth')
  async steamAuth(@Res() res: Response) {
    try {
      const steamAuthUrl = await this.steamInventoryService.getSteamAuthUrl();
      res.redirect(steamAuthUrl);
    } catch (error) {
      console.error('Steam auth error:', error);
      res.status(500).json({ error: 'Steam login failed' });
    }
  }

  // Steam callback endpoint
  @Get('auth/return')
  async steamAuthReturn(@Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.steamInventoryService.handleSteamCallback(req.query);
      if (result.success) {
        // Return success HTML with user data
        const responseHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Steam Authentication Successful</title>
            <script>
              console.log('🎯 Sending auth success message');
              window.opener.postMessage({
                type: 'STEAM_AUTH_SUCCESS',
                data: ${JSON.stringify(result.data)}
              }, '${process.env.STEAM_REALM || 'http://localhost:3000'}');
              window.close();
            </script>
          </head>
          <body>
            <p>✅ Authentication successful! This window will close automatically.</p>
          </body>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(responseHtml);
      } else {
        // Return error HTML
        const responseHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Steam Authentication Failed</title>
            <script>
              console.log('Sending auth error to:', '${process.env.STEAM_REALM || 'http://localhost:3000'}');
              window.opener.postMessage({
                type: 'STEAM_AUTH_ERROR',
                data: { error: '${result.error}' }
              }, '${process.env.STEAM_REALM || 'http://localhost:3000'}');
              window.close();
            </script>
          </head>
          <body>
            <p>❌ ${result.error}. This window will close automatically.</p>
          </body>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html');
        res.status(401).send(responseHtml);
      }
    } catch (error) {
      console.error('❌ Steam callback error:', error);
      const responseHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Steam Authentication Failed</title>
          <script>
            window.opener.postMessage({
              type: 'STEAM_AUTH_ERROR',
              data: { error: 'Server error during authentication' }
            }, '${process.env.STEAM_REALM || 'http://localhost:3000'}');
            window.close();
          </script>
        </head>
        <body>
          <p>❌ Server error during authentication. This window will close automatically.</p>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      res.status(401).send(responseHtml);
    }
  }

  // Get current user
  @Get('auth/me')
  async getCurrentUser(@Res() res: Response) {
    try {
      const user = await this.steamInventoryService.getCurrentUser();
      res.status(200).json({ data: user || null });
    } catch (error) {
      console.error('❌ Get current user error:', error);
      res.status(500).json({ data: null });
    }
  }

  // Get user's Steam inventory
  @Get('inventory/:steamId')
  async getUserInventory(
    @Query('appId') appId = '730',
    @Res() res: Response
  ) {
    try {
      const steamId = res.req.params.steamId;
      const result = await this.steamInventoryService.getUserInventory(steamId, appId);
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          message: result.error.includes('private') || result.error.includes('empty')
            ? 'Inventory is private or empty. Please check your Steam privacy settings.'
            : 'Failed to retrieve inventory'
        });
      }
    } catch (error) {
      console.error('❌ Steam inventory error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  }

  // Get current user's inventory
  @Get('inventory/me')
  async getCurrentUserInventory(
    @Query('appId') appId = '730',
    @Res() res: Response
  ) {
    try {
      const result = await this.steamInventoryService.getCurrentUserInventory(appId);
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result
        });
      } else {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }
    } catch (error) {
      console.error('❌ My inventory error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  }

  // Logout
  @Post('auth/logout')
  async logout(@Res() res: Response) {
    try {
      await this.steamInventoryService.logout();
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  // Health check
  @Get('health')
  async healthCheck(@Res() res: Response) {
    res.status(200).json({
      status: 'healthy',
      service: 'steam-inventory-integrated',
      timestamp: new Date().toISOString(),
      usersCount: await this.steamInventoryService.getUsersCount(),
      currentUserId: await this.steamInventoryService.getCurrentUserId()
    });
  }
}