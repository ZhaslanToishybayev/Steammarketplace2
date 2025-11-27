import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SteamAuthGuard } from '../../auth/guards/steam-auth.guard';
import { MarketplaceService } from '../services/marketplace.service';
import { CreateListingDto, UpdateListingDto, BuyListingDto, PlaceBidDto, CancelListingDto, GetListingsDto, GetPriceAnalyticsDto } from '../dto/create-listing.dto';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService) {}

  @ApiOperation({ summary: 'Create a new marketplace listing' })
  @ApiResponse({ status: 201, description: 'Listing created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiBearerAuth()
  @Post('listings')
  @UseGuards(SteamAuthGuard)
  async createListing(@Body() createListingDto: CreateListingDto, @Request() req) {
    try {
      const sellerId = req.user.id;
      const listing = await this.marketplaceService.createListing(sellerId, createListingDto);

      return {
        success: true,
        message: 'Listing created successfully',
        data: listing,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Get marketplace listings with filters' })
  @ApiResponse({ status: 200, description: 'Listings retrieved successfully' })
  @ApiQuery({ name: 'type', required: false, description: 'Listing type (fixed_price, auction, offer)' })
  @ApiQuery({ name: 'status', required: false, description: 'Listing status' })
  @ApiQuery({ name: 'itemType', required: false, description: 'Item type filter' })
  @ApiQuery({ name: 'minPrice', required: false, description: 'Minimum price' })
  @ApiQuery({ name: 'maxPrice', required: false, description: 'Maximum price' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset' })
  @Get('listings')
  async getListings(@Query() query: GetListingsDto) {
    try {
      const filters = {
        type: query.type as any,
        status: query.status as any,
        itemType: query.itemType,
        itemRarity: query.itemRarity,
        currency: query.currency as any,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        sellerId: query.sellerId,
        featured: query.featured,
        allowOffers: query.allowOffers,
        sortBy: query.sortBy,
        sortOrder: (query.sortOrder as any) || 'DESC',
        limit: parseInt(query.limit as any, 10) || 50,
        offset: parseInt(query.offset as any, 10) || 0,
      };

      const result = await this.marketplaceService.getListings(filters);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Get listing by ID' })
  @ApiResponse({ status: 200, description: 'Listing retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  @Get('listings/{listingId}')
  async getListing(@Param('listingId') listingId: string) {
    try {
      const listing = await this.marketplaceService.getListing(listingId);
      return {
        success: true,
        data: listing,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Update a marketplace listing' })
  @ApiResponse({ status: 200, description: 'Listing updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  @ApiBearerAuth()
  @Put('listings/{listingId}')
  @UseGuards(SteamAuthGuard)
  async updateListing(
    @Param('listingId') listingId: string,
    @Body() updateDto: UpdateListingDto,
    @Request() req,
  ) {
    try {
      const sellerId = req.user.id;
      const listing = await this.marketplaceService.updateListing(listingId, sellerId, updateDto);

      return {
        success: true,
        message: 'Listing updated successfully',
        data: listing,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Buy a fixed-price listing' })
  @ApiResponse({ status: 200, description: 'Item purchased successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  @ApiBearerAuth()
  @Post('listings/{listingId}/buy')
  @UseGuards(SteamAuthGuard)
  async buyListing(
    @Param('listingId') listingId: string,
    @Body() buyDto: BuyListingDto,
    @Request() req,
  ) {
    try {
      const buyerId = req.user.id;
      const listing = await this.marketplaceService.buyListing(listingId, buyerId);

      return {
        success: true,
        message: 'Item purchased successfully',
        data: listing,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Place a bid on an auction listing' })
  @ApiResponse({ status: 200, description: 'Bid placed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid bid' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  @ApiBearerAuth()
  @Post('listings/{listingId}/bid')
  @UseGuards(SteamAuthGuard)
  async placeBid(
    @Param('listingId') listingId: string,
    @Body() bidDto: PlaceBidDto,
    @Request() req,
  ) {
    try {
      const userId = req.user.id;
      const listing = await this.marketplaceService.placeBid(listingId, userId, bidDto.bidAmount);

      return {
        success: true,
        message: 'Bid placed successfully',
        data: listing,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Cancel a marketplace listing' })
  @ApiResponse({ status: 200, description: 'Listing cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  @ApiBearerAuth()
  @Delete('listings/{listingId}')
  @UseGuards(SteamAuthGuard)
  async cancelListing(
    @Param('listingId') listingId: string,
    @Body() cancelDto: CancelListingDto,
    @Request() req,
  ) {
    try {
      const userId = req.user.id;
      const listing = await this.marketplaceService.cancelListing(listingId, userId, cancelDto.reason);

      return {
        success: true,
        message: 'Listing cancelled successfully',
        data: listing,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Get user marketplace listings' })
  @ApiResponse({ status: 200, description: 'User listings retrieved successfully' })
  @ApiBearerAuth()
  @Get('my-listings')
  @UseGuards(SteamAuthGuard)
  async getUserListings(
    @Query('status') status?: string,
    @Request() req,
  ) {
    try {
      const userId = req.user.id;
      const listings = await this.marketplaceService.getUserListings(userId, status as any);

      return {
        success: true,
        data: listings,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Get price analytics for an item' })
  @ApiResponse({ status: 200, description: 'Price analytics retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days for analysis (default: 30)' })
  @Get('analytics/price/{itemClassId}')
  async getPriceAnalytics(
    @Param('itemClassId') itemClassId: string,
    @Query('days') days?: number,
  ) {
    try {
      const analytics = await this.marketplaceService.getPriceAnalytics(itemClassId, days);

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Get marketplace statistics' })
  @ApiResponse({ status: 200, description: 'Marketplace statistics retrieved successfully' })
  @Get('stats')
  async getMarketplaceStats() {
    try {
      const result = await this.marketplaceService.getListings({});
      const { analytics } = result;

      return {
        success: true,
        data: {
          listings: {
            total: result.total,
            ...analytics,
          },
          volume: analytics.totalValue,
          trends: {
            // Would calculate trends from price history
            priceTrend: 'stable',
            volumeTrend: 'up',
            activeUsers: 1000,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Search marketplace listings' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by listing type' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by (price, createdAt, relevance)' })
  @Get('search')
  async searchListings(
    @Query('q') query: string,
    @Query('type') type?: string,
    @Query('sortBy') sortBy?: string,
    @Query('limit') limit: number = 20,
  ) {
    try {
      if (!query || query.trim().length === 0) {
        throw new Error('Search query is required');
      }

      const filters = {
        type: type as any,
        sortBy: sortBy || 'relevance',
        limit: parseInt(limit as any, 10) || 20,
        offset: 0,
      };

      // Add search-specific filters
      if (sortBy === 'relevance') {
        filters.sortBy = 'relevance';
      }

      const result = await this.marketplaceService.getListings(filters);

      // Filter by search query in name/description/tags
      const searchResults = result.listings.filter(listing =>
        listing.itemName.toLowerCase().includes(query.toLowerCase()) ||
        (listing.itemDescription && listing.itemDescription.toLowerCase().includes(query.toLowerCase())) ||
        (listing.tags && listing.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
      );

      return {
        success: true,
        data: {
          query,
          results: searchResults,
          total: searchResults.length,
          filters: result.analytics,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Get featured listings' })
  @ApiResponse({ status: 200, description: 'Featured listings retrieved successfully' })
  @Get('featured')
  async getFeaturedListings(
    @Query('limit') limit: number = 10,
  ) {
    try {
      const result = await this.marketplaceService.getListings({
        featured: true,
        status: 'active' as any,
        limit: parseInt(limit as any, 10) || 10,
        offset: 0,
      });

      return {
        success: true,
        data: result.listings,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }

  @ApiOperation({ summary: 'Get trending items' })
  @ApiResponse({ status: 200, description: 'Trending items retrieved successfully' })
  @Get('trending')
  async getTrendingItems(
    @Query('limit') limit: number = 20,
  ) {
    try {
      // Get items with highest view count, bid count, or recent sales
      const result = await this.marketplaceService.getListings({
        status: 'active' as any,
        limit: parseInt(limit as any, 10) || 20,
        offset: 0,
        sortBy: 'viewCount',
        sortOrder: 'DESC',
      });

      return {
        success: true,
        data: result.listings.slice(0, 10), // Top 10 trending
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.constructor.name,
      };
    }
  }
}