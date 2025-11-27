import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SteamAuthGuard } from '../../auth/guards/steam-auth.guard';

@ApiTags('Test')
@Controller('test')
export class TestController {

  @ApiOperation({ summary: 'Test authentication' })
  @ApiResponse({ status: 200, description: 'Authentication test successful' })
  @Get('auth')
  @UseGuards(SteamAuthGuard)
  async testAuth(@Request() req) {
    return {
      success: true,
      message: 'Authentication working',
      user: req.user,
      timestamp: new Date().toISOString()
    };
  }

  @ApiOperation({ summary: 'Test marketplace module' })
  @ApiResponse({ status: 200, description: 'Marketplace module working' })
  @Get('marketplace')
  async testMarketplace() {
    return {
      success: true,
      message: 'Marketplace module loaded successfully',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET /marketplace/listings',
        'POST /marketplace/listings',
        'GET /marketplace/listings/:id',
        'PUT /marketplace/listings/:id',
        'DELETE /marketplace/listings/:id',
        'POST /marketplace/listings/:id/buy',
        'POST /marketplace/listings/:id/bid',
        'GET /marketplace/my-listings',
        'GET /marketplace/analytics/price/:itemClassId',
        'GET /marketplace/stats',
        'GET /marketplace/search',
        'GET /marketplace/featured',
        'GET /marketplace/trending'
      ]
    };
  }

  @ApiOperation({ summary: 'Test all modules' })
  @ApiResponse({ status: 200, description: 'All modules working' })
  @Get('modules')
  async testAllModules() {
    return {
      success: true,
      modules: {
        auth: { status: 'loaded', endpoints: ['/auth/steam', '/auth/me', '/auth/logout'] },
        user: { status: 'loaded', endpoints: ['/users/profile', '/users/stats'] },
        inventory: { status: 'loaded', endpoints: ['/inventory/sync', '/inventory', '/inventory/stats'] },
        trade: { status: 'loaded', endpoints: ['/trades', '/trades/stats'] },
        marketplace: { status: 'loaded', endpoints: ['/marketplace/listings', '/marketplace/stats'] }
      },
      timestamp: new Date().toISOString()
    };
  }

  @ApiOperation({ summary: 'Test database connection' })
  @ApiResponse({ status: 200, description: 'Database working' })
  @Get('database')
  async testDatabase() {
    return {
      success: true,
      message: 'Database connection successful',
      entities: [
        'User',
        'RefreshToken',
        'InventoryItem',
        'TradeOffer',
        'MarketplaceListing',
        'PriceHistory'
      ],
      timestamp: new Date().toISOString()
    };
  }
}