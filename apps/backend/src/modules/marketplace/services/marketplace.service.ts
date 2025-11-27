import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThan, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SteamService } from '../../auth/services/steam.service';
import { InventoryService } from '../../inventory/services/inventory.service';
import { TradeService } from '../../trade/services/trade.service';
import { User } from '../../auth/entities/user.entity';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';
import { MarketplaceListing, ListingStatus, ListingType, Currency } from '../entities/marketplace-listing.entity';
import { PriceHistory, PriceSource, PriceType } from '../entities/price-history.entity';
import { CreateListingDto } from '../dto/create-listing.dto';
import { UpdateListingDto } from '../dto/update-listing.dto';
import { MarketplaceAnalytics } from '../interfaces/marketplace-analytics.interface';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);
  private readonly STEAM_MARKET_API_BASE = 'https://steamcommunity.com/market';

  constructor(
    @InjectRepository(MarketplaceListing)
    private listingRepository: Repository<MarketplaceListing>,
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepository: Repository<InventoryItem>,
    private steamService: SteamService,
    private inventoryService: InventoryService,
    private tradeService: TradeService,
    private configService: ConfigService,
  ) {}

  /**
   * Create a new marketplace listing
   */
  async createListing(sellerId: string, createListingDto: CreateListingDto): Promise<MarketplaceListing> {
    try {
      this.logger.log(`Creating listing for seller ${sellerId}`);

      // Validate seller
      const seller = await this.userRepository.findOne({ where: { id: sellerId } });
      if (!seller) {
        throw new NotFoundException('Seller not found');
      }

      // Validate item ownership and tradability
      if (createListingDto.itemId) {
        const item = await this.inventoryItemRepository.findOne({
          where: { id: createListingDto.itemId, userId: sellerId }
        });

        if (!item) {
          throw new BadRequestException('Item not found or not owned by seller');
        }

        if (!item.tradable) {
          throw new BadRequestException('Item is not tradable');
        }
      }

      // Calculate fees
      const { platformFee, sellerReceive } = this.calculateListingFees(createListingDto.price, createListingDto.type);

      // Create listing
      const listing = this.listingRepository.create({
        itemId: createListingDto.itemId,
        itemName: createListingDto.itemName || 'Unknown Item',
        itemDescription: createListingDto.itemDescription,
        itemClassId: createListingDto.itemClassId,
        itemInstanceId: createListingDto.itemInstanceId,
        itemImage: createListingDto.itemImage,
        itemType: createListingDto.itemType || 'Unknown',
        itemRarity: createListingDto.itemRarity || 'Common',
        itemQuality: createListingDto.itemQuality || 'Normal',
        quantity: createListingDto.quantity || 1,
        price: createListingDto.price,
        currency: createListingDto.currency || Currency.USD,
        type: createListingDto.type || ListingType.FIXED_PRICE,
        status: ListingStatus.ACTIVE,
        startingPrice: createListingDto.startingPrice,
        reservePrice: createListingDto.reservePrice,
        buyoutPrice: createListingDto.buyoutPrice || createListingDto.price,
        platformFee,
        sellerReceive,
        description: createListingDto.description,
        tags: createListingDto.tags || [],
        attributes: createListingDto.attributes || {},
        media: createListingDto.media || [],
        sellerId,
        condition: createListingDto.condition,
        wearRating: createListingDto.wearRating,
        autoRenew: createListingDto.autoRenew || false,
        instantSale: createListingDto.instantSale || false,
        allowOffers: createListingDto.allowOffers || false,
        minOffer: createListingDto.minOffer,
        maxOffer: createListingDto.maxOffer,
      });

      const savedListing = await this.listingRepository.save(listing);

      // Mark item as listed in inventory
      if (createListingDto.itemId) {
        await this.inventoryItemRepository.update(createListingDto.itemId, { listed: true });
      }

      // Track price history
      await this.trackPriceHistory(
        savedListing.itemClassId || 'unknown',
        savedListing.price,
        PriceSource.INTERNAL_SALE,
        PriceType.LISTED,
        { listingId: savedListing.id, sellerId }
      );

      this.logger.log(`Listing created: ${savedListing.id}`);
      return savedListing;

    } catch (error) {
      this.logger.error(`Failed to create listing: ${error.message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Failed to create listing');
    }
  }

  /**
   * Get marketplace listings with filters
   */
  async getListings(filters: {
    type?: ListingType;
    status?: ListingStatus;
    itemType?: string;
    itemRarity?: string;
    currency?: Currency;
    minPrice?: number;
    maxPrice?: number;
    sellerId?: string;
    buyerId?: string;
    featured?: boolean;
    allowOffers?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<{
    listings: MarketplaceListing[];
    total: number;
    analytics: {
      totalListings: number;
      totalValue: number;
      byType: Record<ListingType, number>;
      byStatus: Record<ListingStatus, number>;
      byRarity: Record<string, number>;
    };
  }> {
    try {
      const {
        type,
        status = ListingStatus.ACTIVE,
        itemType,
        itemRarity,
        currency,
        minPrice,
        maxPrice,
        sellerId,
        featured,
        allowOffers,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        limit = 50,
        offset = 0,
      } = filters;

      // Build query
      const query = this.listingRepository
        .createQueryBuilder('listing')
        .leftJoinAndSelect('listing.winner', 'winner')
        .where('listing.status = :status', { status });

      // Apply filters
      if (type) query.andWhere('listing.type = :type', { type });
      if (itemType) query.andWhere('listing.itemType = :itemType', { itemType });
      if (itemRarity) query.andWhere('listing.itemRarity = :itemRarity', { itemRarity });
      if (currency) query.andWhere('listing.currency = :currency', { currency });
      if (sellerId) query.andWhere('listing.sellerId = :sellerId', { sellerId });
      if (featured !== undefined) query.andWhere('listing.featured = :featured', { featured });
      if (allowOffers !== undefined) query.andWhere('listing.allowOffers = :allowOffers', { allowOffers });

      if (minPrice) query.andWhere('listing.price >= :minPrice', { minPrice });
      if (maxPrice) query.andWhere('listing.price <= :maxPrice', { maxPrice });

      // Apply sorting
      const allowedSortFields = ['price', 'createdAt', 'updatedAt', 'itemType', 'itemRarity'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      query.orderBy(`listing.${sortField}`, sortOrder);

      // Get total count
      const total = await query.getCount();

      // Get listings with pagination
      const listings = await query
        .skip(offset)
        .take(limit)
        .getMany();

      // Get analytics
      const analytics = await this.getMarketplaceAnalytics();

      return {
        listings,
        total,
        analytics,
      };

    } catch (error) {
      this.logger.error(`Failed to get listings: ${error.message}`);
      throw new BadRequestException('Failed to get listings');
    }
  }

  /**
   * Get listing by ID
   */
  async getListing(listingId: string): Promise<MarketplaceListing> {
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
      relations: ['winner'],
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return listing;
  }

  /**
   * Update listing
   */
  async updateListing(listingId: string, sellerId: string, updateDto: UpdateListingDto): Promise<MarketplaceListing> {
    const listing = await this.listingRepository.findOne({ where: { id: listingId } });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Cannot update non-active listings');
    }

    // Update listing
    Object.assign(listing, updateDto);

    if (updateDto.price) {
      const { platformFee, sellerReceive } = this.calculateListingFees(updateDto.price, listing.type);
      listing.platformFee = platformFee;
      listing.sellerReceive = sellerReceive;
    }

    return await this.listingRepository.save(listing);
  }

  /**
   * Buy listing (fixed price)
   */
  async buyListing(listingId: string, buyerId: string): Promise<MarketplaceListing> {
    const listing = await this.listingRepository.findOne({ where: { id: listingId } });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Listing is not available');
    }

    if (listing.sellerId === buyerId) {
      throw new BadRequestException('You cannot buy your own listing');
    }

    if (!listing.isFixedPrice) {
      throw new BadRequestException('This listing is not available for instant purchase');
    }

    if (!listing.canBeBought) {
      throw new BadRequestException('This listing cannot be bought');
    }

    try {
      // Process payment (would integrate with payment service)
      // For now, simulate successful payment
      const paymentSuccessful = true; // await this.paymentService.processPayment(...)

      if (paymentSuccessful) {
        // Mark listing as sold
        listing.markAsSold(buyerId);

        // Create trade offer for item transfer
        const tradeData = {
          targetSteamId: listing.sellerId,
          offeredAssetIds: [listing.itemId],
          receivedItems: [{
            classId: listing.itemClassId,
            instanceId: listing.itemInstanceId,
            amount: listing.quantity,
            name: listing.itemName,
            steamValue: listing.price,
          }],
          message: `Payment for ${listing.itemName}`,
        };

        // Create trade offer
        await this.tradeService.createTradeOffer(buyerId, tradeData as any);

        // Update seller's inventory
        if (listing.itemId) {
          await this.inventoryItemRepository.update(listing.itemId, { listed: false });
        }

        await this.listingRepository.save(listing);

        // Track sale price history
        await this.trackPriceHistory(
          listing.itemClassId || 'unknown',
          listing.price,
          PriceSource.INTERNAL_SALE,
          PriceType.SOLD,
          { listingId: listing.id, buyerId, sellerId }
        );

        return listing;
      }

    } catch (error) {
      this.logger.error(`Failed to buy listing: ${error.message}`);
      throw new BadRequestException('Failed to process purchase');
    }
  }

  /**
   * Place bid on auction
   */
  async placeBid(listingId: string, userId: string, bidAmount: number): Promise<MarketplaceListing> {
    const listing = await this.listingRepository.findOne({ where: { id: listingId } });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Listing is not active');
    }

    if (listing.sellerId === userId) {
      throw new BadRequestException('You cannot bid on your own listing');
    }

    if (!listing.isAuction) {
      throw new BadRequestException('This is not an auction listing');
    }

    if (listing.isExpired) {
      throw new BadRequestException('Auction has expired');
    }

    if (bidAmount <= (listing.currentBid || listing.startingPrice || 0)) {
      throw new BadRequestException('Bid must be higher than current bid');
    }

    // Update bid
    listing.currentBid = bidAmount;
    listing.bidCount = (listing.bidCount || 0) + 1;

    // Add bid to history
    listing.history.push({
      action: 'updated',
      timestamp: new Date(),
      price: bidAmount,
      details: { bidBy: userId }
    });

    return await this.listingRepository.save(listing);
  }

  /**
   * Cancel listing
   */
  async cancelListing(listingId: string, userId: string, reason: string): Promise<MarketplaceListing> {
    const listing = await this.listingRepository.findOne({ where: { id: listingId } });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You can only cancel your own listings');
    }

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Cannot cancel non-active listings');
    }

    listing.cancel(reason, 'seller');

    // Update inventory
    if (listing.itemId) {
      await this.inventoryItemRepository.update(listing.itemId, { listed: false });
    }

    return await this.listingRepository.save(listing);
  }

  /**
   * Get user's listings
   */
  async getUserListings(userId: string, status?: ListingStatus): Promise<MarketplaceListing[]> {
    const where: any = { sellerId: userId };
    if (status) {
      where.status = status;
    }

    return await this.listingRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update price history from Steam Market
   */
  async updateSteamPrices(): Promise<void> {
    try {
      this.logger.log('Updating Steam market prices...');

      // Get all unique item class IDs from active listings
      const activeListings = await this.listingRepository.find({
        where: { status: ListingStatus.ACTIVE },
        select: ['itemClassId'],
      });

      const uniqueClassIds = [...new Set(activeListings.map(l => l.itemClassId).filter(Boolean))];

      for (const classId of uniqueClassIds) {
        try {
          const steamPrices = await this.fetchSteamMarketPrices(classId);
          await this.processSteamPrices(classId, steamPrices);
        } catch (error) {
          this.logger.warn(`Failed to update prices for class ${classId}: ${error.message}`);
        }
      }

      this.logger.log('Steam market prices updated successfully');

    } catch (error) {
      this.logger.error(`Failed to update Steam prices: ${error.message}`);
    }
  }

  /**
   * Get price analytics for an item
   */
  async getPriceAnalytics(itemClassId: string, days: number = 30): Promise<{
    current: PriceHistory | null;
    history: PriceHistory[];
    analytics: {
      average: number;
      median: number;
      min: number;
      max: number;
      volume: number;
      trend: 'up' | 'down' | 'stable';
      volatility: number;
    };
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const history = await this.priceHistoryRepository.find({
      where: {
        itemClassId,
        timestamp: MoreThan(since),
      },
      order: { timestamp: 'DESC' },
    });

    if (history.length === 0) {
      return {
        current: null,
        history: [],
        analytics: {
          average: 0,
          median: 0,
          min: 0,
          max: 0,
          volume: 0,
          trend: 'stable',
          volatility: 0,
        },
      };
    }

    const prices = history.map(h => h.price);
    const volumes = history.map(h => h.volume || 0);

    const analytics = {
      average: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      median: this.calculateMedian(prices),
      min: Math.min(...prices),
      max: Math.max(...prices),
      volume: volumes.reduce((sum, volume) => sum + volume, 0),
      trend: this.calculateTrend(prices),
      volatility: this.calculateVolatility(prices),
    };

    return {
      current: history[0],
      history,
      analytics,
    };
  }

  // Private helper methods

  private calculateListingFees(price: number, type: ListingType): { platformFee: number; sellerReceive: number } {
    const commissionRate = type === ListingType.AUCTION ? 0.10 : 0.05; // 10% for auctions, 5% for fixed price
    const fee = price * commissionRate;
    const sellerReceive = price - fee;

    return {
      platformFee: Math.round(fee * 100) / 100,
      sellerReceive: Math.round(sellerReceive * 100) / 100,
    };
  }

  private async trackPriceHistory(
    itemClassId: string,
    price: number,
    source: PriceSource,
    type: PriceType,
    metadata?: Record<string, any>
  ): Promise<void> {
    const priceHistory = PriceHistory.createPriceHistory(itemClassId, price, source, type, {
      metadata,
      currency: 'USD',
    });

    priceHistory.updateCalculatedFields();
    await this.priceHistoryRepository.save(priceHistory);
  }

  private async fetchSteamMarketPrices(classId: string): Promise<any> {
    // This would integrate with Steam Market API
    // For now, return mock data
    return {
      average: 250.50,
      median: 240.00,
      min: 200.00,
      max: 300.00,
      volume: 50,
      trend: 'up',
    };
  }

  private async processSteamPrices(classId: string, steamPrices: any): Promise<void> {
    const priceHistory = PriceHistory.createPriceHistory(
      classId,
      steamPrices.average,
      PriceSource.STEAM_MARKET,
      PriceType.AVERAGE,
      {
        steamData: steamPrices,
        volume: steamPrices.volume,
        trend: steamPrices.trend,
      }
    );

    priceHistory.updateCalculatedFields();
    await this.priceHistoryRepository.save(priceHistory);
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private calculateTrend(prices: number[]): 'up' | 'down' | 'stable' {
    if (prices.length < 2) return 'stable';

    const recent = prices.slice(-5);
    const older = prices.slice(-10, -5);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, price) => sum + price, 0) / recent.length;
    const olderAvg = older.reduce((sum, price) => sum + price, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.02) return 'up';
    if (change < -0.02) return 'down';
    return 'stable';
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  private async getMarketplaceAnalytics(): Promise<{
    totalListings: number;
    totalValue: number;
    byType: Record<ListingType, number>;
    byStatus: Record<ListingStatus, number>;
    byRarity: Record<string, number>;
  }> {
    const totalListings = await this.listingRepository.count();
    const totalValueResult = await this.listingRepository
      .createQueryBuilder('listing')
      .select('SUM(listing.price)', 'totalValue')
      .getRawOne();

    const byType = await this.listingRepository
      .createQueryBuilder('listing')
      .select('listing.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('listing.type')
      .getRawMany();

    const byStatus = await this.listingRepository
      .createQueryBuilder('listing')
      .select('listing.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('listing.status')
      .getRawMany();

    const byRarity = await this.listingRepository
      .createQueryBuilder('listing')
      .select('listing.itemRarity', 'rarity')
      .addSelect('COUNT(*)', 'count')
      .groupBy('listing.itemRarity')
      .getRawMany();

    return {
      totalListings,
      totalValue: parseFloat(totalValueResult.totalvalue) || 0,
      byType: byType.reduce((acc, item) => ({ ...acc, [item.type]: parseInt(item.count) }), {} as any),
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.status]: parseInt(item.count) }), {} as any),
      byRarity: byRarity.reduce((acc, item) => ({ ...acc, [item.rarity]: parseInt(item.count) }), {} as any),
    };
  }
}