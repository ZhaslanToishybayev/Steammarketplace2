import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ListingService } from './listing.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { User } from '../user/user.entity';

interface SearchListingsDto {
  appId?: number;
  type?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
  condition?: string;
  featured?: boolean;
  verified?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'price' | 'createdAt' | 'bidCount';
  sortOrder?: 'ASC' | 'DESC';
}

@Controller('listings')
@UseGuards(AuthGuard('steam'))
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Post()
  async createListing(
    @Body() createListingDto: CreateListingDto,
    @Query('user') user: User
  ) {
    try {
      const listing = await this.listingService.createListing({
        ...createListingDto,
        sellerSteamId: user.steamId
      });

      return {
        success: true,
        data: {
          id: listing.id,
          listingId: listing.listingId,
          sellerSteamId: listing.sellerSteamId,
          inventoryItemId: listing.inventoryItemId,
          type: listing.type,
          status: listing.status,
          price: listing.price,
          startingPrice: listing.startingPrice,
          reservePrice: listing.reservePrice,
          buyoutPrice: listing.buyoutPrice,
          currentBid: listing.currentBid,
          serviceFeePercent: listing.serviceFeePercent,
          serviceFeeAmount: listing.serviceFeeAmount,
          description: listing.description,
          condition: listing.condition,
          images: listing.images ? JSON.parse(listing.images) : null,
          expiresAt: listing.expiresAt,
          soldAt: listing.soldAt,
          cancelledAt: listing.cancelledAt,
          viewCount: listing.viewCount,
          bidCount: listing.bidCount,
          featured: listing.featured,
          verified: listing.verified,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
          seller: {
            steamId: listing.seller.steamId,
            username: listing.seller.username,
            avatar: listing.seller.avatar
          },
          inventoryItem: {
            id: listing.inventoryItem.id,
            marketName: listing.inventoryItem.marketName,
            marketHashName: listing.inventoryItem.marketHashName,
            iconUrl: listing.inventoryItem.iconUrl,
            steamPrice: listing.inventoryItem.steamPrice,
            tradable: listing.inventoryItem.tradable,
            marketable: listing.inventoryItem.marketable
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get(':listingId')
  async getListing(
    @Param('listingId') listingId: string,
    @Query('user') user: User
  ) {
    try {
      const listing = await this.listingService.getListingById(listingId);

      if (!listing) {
        return {
          success: false,
          error: 'Listing not found'
        };
      }

      // Increment view count
      await this.listingService.incrementViewCount(listingId);

      return {
        success: true,
        data: {
          id: listing.id,
          listingId: listing.listingId,
          sellerSteamId: listing.sellerSteamId,
          inventoryItemId: listing.inventoryItemId,
          type: listing.type,
          status: listing.status,
          price: listing.price,
          startingPrice: listing.startingPrice,
          reservePrice: listing.reservePrice,
          buyoutPrice: listing.buyoutPrice,
          currentBid: listing.currentBid,
          highestBidderSteamId: listing.highestBidderSteamId,
          serviceFeePercent: listing.serviceFeePercent,
          serviceFeeAmount: listing.serviceFeeAmount,
          description: listing.description,
          condition: listing.condition,
          images: listing.images ? JSON.parse(listing.images) : null,
          expiresAt: listing.expiresAt,
          soldAt: listing.soldAt,
          cancelledAt: listing.cancelledAt,
          cancelledBy: listing.cancelledBy,
          viewCount: listing.viewCount,
          bidCount: listing.bidCount,
          featured: listing.featured,
          verified: listing.verified,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
          seller: {
            steamId: listing.seller.steamId,
            username: listing.seller.username,
            avatar: listing.seller.avatar
          },
          inventoryItem: {
            id: listing.inventoryItem.id,
            marketName: listing.inventoryItem.marketName,
            marketHashName: listing.inventoryItem.marketHashName,
            iconUrl: listing.inventoryItem.iconUrl,
            steamPrice: listing.inventoryItem.steamPrice,
            tradable: listing.inventoryItem.tradable,
            marketable: listing.inventoryItem.marketable
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get()
  async searchListings(
    @Query() searchDto: SearchListingsDto,
    @Query('user') user: User
  ) {
    try {
      const { listings, total } = await this.listingService.searchListings({
        ...searchDto,
        appId: searchDto.appId,
        type: searchDto.type as any,
        status: searchDto.status as any,
        minPrice: searchDto.minPrice,
        maxPrice: searchDto.maxPrice,
        query: searchDto.query,
        condition: searchDto.condition,
        featured: searchDto.featured,
        verified: searchDto.verified,
        limit: Number(searchDto.limit) || 20,
        offset: Number(searchDto.offset) || 0,
        sortBy: searchDto.sortBy,
        sortOrder: searchDto.sortOrder
      });

      return {
        success: true,
        data: {
          listings: listings.map(listing => ({
            id: listing.id,
            listingId: listing.listingId,
            sellerSteamId: listing.sellerSteamId,
            inventoryItemId: listing.inventoryItemId,
            type: listing.type,
            status: listing.status,
            price: listing.price,
            startingPrice: listing.startingPrice,
            reservePrice: listing.reservePrice,
            buyoutPrice: listing.buyoutPrice,
            currentBid: listing.currentBid,
            highestBidderSteamId: listing.highestBidderSteamId,
            serviceFeePercent: listing.serviceFeePercent,
            serviceFeeAmount: listing.serviceFeeAmount,
            description: listing.description,
            condition: listing.condition,
            images: listing.images ? JSON.parse(listing.images) : null,
            expiresAt: listing.expiresAt,
            soldAt: listing.soldAt,
            cancelledAt: listing.cancelledAt,
            viewCount: listing.viewCount,
            bidCount: listing.bidCount,
            featured: listing.featured,
            verified: listing.verified,
            createdAt: listing.createdAt,
            updatedAt: listing.updatedAt,
            seller: {
              steamId: listing.seller.steamId,
              username: listing.seller.username,
              avatar: listing.seller.avatar
            },
            inventoryItem: {
              id: listing.inventoryItem.id,
              marketName: listing.inventoryItem.marketName,
              marketHashName: listing.inventoryItem.marketHashName,
              iconUrl: listing.inventoryItem.iconUrl,
              steamPrice: listing.inventoryItem.steamPrice,
              tradable: listing.inventoryItem.tradable,
              marketable: listing.inventoryItem.marketable,
              appId: listing.inventoryItem.appId
            }
          })),
          total,
          hasMore: (searchDto.offset || 0) + (searchDto.limit || 20) < total
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('user/:steamId')
  async getUserListings(
    @Param('steamId') steamId: string,
    @Query('status') status?: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
    @Query('user') user: User
  ) {
    try {
      const { listings, total } = await this.listingService.getUserListings(
        steamId,
        status as any,
        limit,
        offset
      );

      return {
        success: true,
        data: {
          listings: listings.map(listing => ({
            id: listing.id,
            listingId: listing.listingId,
            sellerSteamId: listing.sellerSteamId,
            inventoryItemId: listing.inventoryItemId,
            type: listing.type,
            status: listing.status,
            price: listing.price,
            startingPrice: listing.startingPrice,
            reservePrice: listing.reservePrice,
            buyoutPrice: listing.buyoutPrice,
            currentBid: listing.currentBid,
            highestBidderSteamId: listing.highestBidderSteamId,
            serviceFeePercent: listing.serviceFeePercent,
            serviceFeeAmount: listing.serviceFeeAmount,
            description: listing.description,
            condition: listing.condition,
            images: listing.images ? JSON.parse(listing.images) : null,
            expiresAt: listing.expiresAt,
            soldAt: listing.soldAt,
            cancelledAt: listing.cancelledAt,
            cancelledBy: listing.cancelledBy,
            viewCount: listing.viewCount,
            bidCount: listing.bidCount,
            featured: listing.featured,
            verified: listing.verified,
            createdAt: listing.createdAt,
            updatedAt: listing.updatedAt,
            seller: {
              steamId: listing.seller.steamId,
              username: listing.seller.username,
              avatar: listing.seller.avatar
            },
            inventoryItem: {
              id: listing.inventoryItem.id,
              marketName: listing.inventoryItem.marketName,
              marketHashName: listing.inventoryItem.marketHashName,
              iconUrl: listing.inventoryItem.iconUrl,
              steamPrice: listing.inventoryItem.steamPrice,
              tradable: listing.inventoryItem.tradable,
              marketable: listing.inventoryItem.marketable
            }
          })),
          total,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post(':listingId/purchase')
  async purchaseListing(
    @Param('listingId') listingId: string,
    @Query('user') user: User
  ) {
    try {
      const listing = await this.listingService.purchaseListing(listingId, user.steamId);

      return {
        success: true,
        data: {
          id: listing.id,
          listingId: listing.listingId,
          status: listing.status,
          soldAt: listing.soldAt,
          updatedAt: listing.updatedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post(':listingId/cancel')
  async cancelListing(
    @Param('listingId') listingId: string,
    @Query('user') user: User
  ) {
    try {
      const listing = await this.listingService.cancelListing(listingId, user.steamId);

      return {
        success: true,
        data: {
          id: listing.id,
          listingId: listing.listingId,
          status: listing.status,
          cancelledAt: listing.cancelledAt,
          cancelledBy: listing.cancelledBy,
          updatedAt: listing.updatedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post(':listingId/bid')
  async placeBid(
    @Param('listingId') listingId: string,
    @Body('amount') amount: number,
    @Query('user') user: User
  ) {
    try {
      const listing = await this.listingService.placeBid(listingId, user.steamId, amount);

      return {
        success: true,
        data: {
          id: listing.id,
          listingId: listing.listingId,
          currentBid: listing.currentBid,
          highestBidderSteamId: listing.highestBidderSteamId,
          bidCount: listing.bidCount,
          updatedAt: listing.updatedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('stats')
  async getListingStatistics(
    @Query('user') user: User
  ) {
    try {
      const stats = await this.listingService.getListingStatistics(user.steamId);

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('featured')
  async getFeaturedListings(
    @Query('limit') limit: number = 10,
    @Query('user') user: User
  ) {
    try {
      const listings = await this.listingService.getFeaturedListings(limit);

      return {
        success: true,
        data: {
          listings: listings.map(listing => ({
            id: listing.id,
            listingId: listing.listingId,
            price: listing.price,
            currentBid: listing.currentBid,
            viewCount: listing.viewCount,
            bidCount: listing.bidCount,
            createdAt: listing.createdAt,
            inventoryItem: {
              marketName: listing.inventoryItem.marketName,
              marketHashName: listing.inventoryItem.marketHashName,
              iconUrl: listing.inventoryItem.iconUrl,
              steamPrice: listing.inventoryItem.steamPrice
            },
            seller: {
              username: listing.seller.username,
              avatar: listing.seller.avatar
            }
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('top-selling')
  async getTopSellingItems(
    @Query('appId') appId?: number,
    @Query('limit') limit: number = 10,
    @Query('user') user: User
  ) {
    try {
      const listings = await this.listingService.getTopSellingItems(appId, limit);

      return {
        success: true,
        data: {
          listings: listings.map(listing => ({
            id: listing.id,
            listingId: listing.listingId,
            price: listing.price,
            soldAt: listing.soldAt,
            createdAt: listing.createdAt,
            inventoryItem: {
              marketName: listing.inventoryItem.marketName,
              marketHashName: listing.inventoryItem.marketHashName,
              iconUrl: listing.inventoryItem.iconUrl,
              steamPrice: listing.inventoryItem.steamPrice,
              appId: listing.inventoryItem.appId
            },
            seller: {
              username: listing.seller.username,
              avatar: listing.seller.avatar
            }
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}