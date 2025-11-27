import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { Listing, ListingStatus, ListingType } from './listing.entity';
import { User } from '../user/user.entity';
import { Inventory } from '../inventory/inventory.entity';
import { CreateListingDto } from './dto/create-listing.dto';

interface CreateListingDto {
  sellerSteamId: string;
  inventoryItemId: number;
  type: ListingType;
  price: number;
  startingPrice?: number;
  reservePrice?: number;
  buyoutPrice?: number;
  description?: string;
  condition?: string;
  images?: string[];
  expiresAt?: Date;
}

interface SearchListingsDto {
  appId?: number;
  type?: ListingType;
  status?: ListingStatus;
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

@Injectable()
export class ListingService {
  constructor(
    @InjectRepository(Listing)
    private listingRepository: Repository<Listing>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>
  ) {}

  async createListing(createListingDto: CreateListingDto): Promise<Listing> {
    try {
      const { sellerSteamId, inventoryItemId, type, price, startingPrice, reservePrice, buyoutPrice } = createListingDto;

      // Validate seller exists
      const seller = await this.userRepository.findOne({ where: { steamId: sellerSteamId } });
      if (!seller) {
        throw new Error('Seller not found');
      }

      // Validate inventory item exists and is owned by seller
      const inventoryItem = await this.inventoryRepository.findOne({
        where: { id: inventoryItemId, steamId: sellerSteamId, active: true }
      });

      if (!inventoryItem) {
        throw new Error('Inventory item not found or not owned by seller');
      }

      // Check if item is already listed
      const existingListing = await this.listingRepository.findOne({
        where: { inventoryItemId, status: ListingStatus.ACTIVE }
      });

      if (existingListing) {
        throw new Error('Item is already listed');
      }

      // Create listing
      const listing = this.listingRepository.create({
        listingId: this.generateListingId(),
        sellerSteamId,
        inventoryItemId,
        type,
        status: ListingStatus.ACTIVE,
        price,
        startingPrice: type === ListingType.AUCTION ? startingPrice || price : null,
        reservePrice: type === ListingType.AUCTION ? reservePrice : null,
        buyoutPrice: buyoutPrice || null,
        serviceFeePercent: 5.0, // 5% platform fee
        serviceFeeAmount: this.calculateServiceFee(price),
        description: createListingDto.description || '',
        condition: createListingDto.condition,
        images: createListingDto.images ? JSON.stringify(createListingDto.images) : null,
        expiresAt: createListingDto.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
        featured: false,
        verified: false,
        viewCount: 0,
        bidCount: 0
      });

      const savedListing = await this.listingRepository.save(listing);

      // Mark inventory item as listed
      inventoryItem.active = false; // Deactivate until listing is sold/cancelled
      await this.inventoryRepository.save(inventoryItem);

      return savedListing;
    } catch (error) {
      console.error('Error creating listing:', error);
      throw new Error('Failed to create listing');
    }
  }

  async getListingById(listingId: string): Promise<Listing | null> {
    try {
      return await this.listingRepository.findOne({
        where: { listingId },
        relations: ['seller', 'inventoryItem']
      });
    } catch (error) {
      console.error('Error getting listing by ID:', error);
      return null;
    }
  }

  async getUserListings(steamId: string, status?: ListingStatus, limit = 20, offset = 0): Promise<{ listings: Listing[]; total: number }> {
    try {
      const query = this.listingRepository.createQueryBuilder('listing')
        .leftJoinAndSelect('listing.seller', 'seller')
        .leftJoinAndSelect('listing.inventoryItem', 'inventoryItem')
        .where('listing.sellerSteamId = :steamId', { steamId });

      if (status) {
        query.andWhere('listing.status = :status', { status });
      }

      query.orderBy('listing.createdAt', 'DESC');

      const [listings, total] = await query.skip(offset).take(limit).getManyAndCount();

      return { listings, total };
    } catch (error) {
      console.error('Error getting user listings:', error);
      return { listings: [], total: 0 };
    }
  }

  async searchListings(searchDto: SearchListingsDto): Promise<{ listings: Listing[]; total: number }> {
    try {
      const {
        appId,
        type,
        status = ListingStatus.ACTIVE,
        minPrice,
        maxPrice,
        query,
        condition,
        featured,
        verified,
        limit = 20,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = searchDto;

      const queryBuilder = this.listingRepository.createQueryBuilder('listing')
        .leftJoinAndSelect('listing.seller', 'seller')
        .leftJoinAndSelect('listing.inventoryItem', 'inventoryItem')
        .where('listing.status = :status', { status });

      // Filter by app ID
      if (appId) {
        queryBuilder.andWhere('inventoryItem.appId = :appId', { appId });
      }

      // Filter by listing type
      if (type) {
        queryBuilder.andWhere('listing.type = :type', { type });
      }

      // Filter by price range
      if (minPrice !== undefined) {
        queryBuilder.andWhere('listing.price >= :minPrice', { minPrice });
      }
      if (maxPrice !== undefined) {
        queryBuilder.andWhere('listing.price <= :maxPrice', { maxPrice });
      }

      // Filter by text search
      if (query) {
        queryBuilder.andWhere(
          '(inventoryItem.marketName LIKE :query OR inventoryItem.marketHashName LIKE :query OR listing.description LIKE :query)',
          { query: `%${query}%` }
        );
      }

      // Filter by condition
      if (condition) {
        queryBuilder.andWhere('listing.condition = :condition', { condition });
      }

      // Filter by featured/verified
      if (featured !== undefined) {
        queryBuilder.andWhere('listing.featured = :featured', { featured });
      }
      if (verified !== undefined) {
        queryBuilder.andWhere('listing.verified = :verified', { verified });
      }

      // Order and paginate
      queryBuilder.orderBy(`listing.${sortBy}`, sortOrder);

      const [listings, total] = await queryBuilder.skip(offset).take(limit).getManyAndCount();

      return { listings, total };
    } catch (error) {
      console.error('Error searching listings:', error);
      return { listings: [], total: 0 };
    }
  }

  async purchaseListing(listingId: string, buyerSteamId: string): Promise<Listing> {
    try {
      const listing = await this.listingRepository.findOne({
        where: { listingId, status: ListingStatus.ACTIVE },
        relations: ['seller', 'inventoryItem']
      });

      if (!listing) {
        throw new Error('Listing not found or not available');
      }

      // Validate buyer exists
      const buyer = await this.userRepository.findOne({ where: { steamId: buyerSteamId } });
      if (!buyer) {
        throw new Error('Buyer not found');
      }

      // Check if buyer is not the seller
      if (listing.sellerSteamId === buyerSteamId) {
        throw new Error('You cannot purchase your own listing');
      }

      // For auctions, check if there are any bids
      if (listing.type === ListingType.AUCTION && listing.bidCount > 0) {
        throw new Error('Cannot purchase auction listing with active bids');
      }

      // Process purchase (this would integrate with payment system)
      // For now, just mark as sold
      listing.status = ListingStatus.SOLD;
      listing.soldAt = new Date();
      listing.updatedAt = new Date();

      const updatedListing = await this.listingRepository.save(listing);

      // Update inventory ownership
      if (listing.inventoryItem) {
        listing.inventoryItem.steamId = buyerSteamId;
        listing.inventoryItem.active = true;
        await this.inventoryRepository.save(listing.inventoryItem);
      }

      return updatedListing;
    } catch (error) {
      console.error('Error purchasing listing:', error);
      throw new Error('Failed to purchase listing');
    }
  }

  async cancelListing(listingId: string, sellerSteamId: string): Promise<Listing> {
    try {
      const listing = await this.listingRepository.findOne({
        where: { listingId, sellerSteamId, status: ListingStatus.ACTIVE }
      });

      if (!listing) {
        throw new Error('Listing not found or not owned by you');
      }

      listing.status = ListingStatus.CANCELLED;
      listing.cancelledAt = new Date();
      listing.cancelledBy = sellerSteamId;
      listing.updatedAt = new Date();

      const updatedListing = await this.listingRepository.save(listing);

      // Reactivate inventory item
      const inventoryItem = await this.inventoryRepository.findOne({
        where: { id: listing.inventoryItemId }
      });

      if (inventoryItem) {
        inventoryItem.active = true;
        await this.inventoryRepository.save(inventoryItem);
      }

      return updatedListing;
    } catch (error) {
      console.error('Error cancelling listing:', error);
      throw new Error('Failed to cancel listing');
    }
  }

  async placeBid(listingId: string, bidderSteamId: string, amount: number): Promise<Listing> {
    try {
      const listing = await this.listingRepository.findOne({
        where: { listingId, status: ListingStatus.ACTIVE, type: ListingType.AUCTION }
      });

      if (!listing) {
        throw new Error('Auction listing not found or not active');
      }

      // Validate bidder exists
      const bidder = await this.userRepository.findOne({ where: { steamId: bidderSteamId } });
      if (!bidder) {
        throw new Error('Bidder not found');
      }

      // Check if bidder is not the seller
      if (listing.sellerSteamId === bidderSteamId) {
        throw new Error('You cannot bid on your own listing');
      }

      // Validate bid amount
      const currentBid = listing.currentBid || listing.startingPrice || listing.price;
      if (amount <= currentBid) {
        throw new Error('Bid amount must be higher than current bid');
      }

      // Update listing with new bid
      listing.currentBid = amount;
      listing.highestBidderSteamId = bidderSteamId;
      listing.bidCount = (listing.bidCount || 0) + 1;
      listing.updatedAt = new Date();

      return await this.listingRepository.save(listing);
    } catch (error) {
      console.error('Error placing bid:', error);
      throw new Error('Failed to place bid');
    }
  }

  async incrementViewCount(listingId: string): Promise<void> {
    try {
      await this.listingRepository.increment({ listingId }, 'viewCount', 1);
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }

  async getListingStatistics(steamId: string): Promise<{
    totalListings: number;
    activeListings: number;
    soldListings: number;
    cancelledListings: number;
    totalRevenue: number;
    averagePrice: number;
  }> {
    try {
      const totalListings = await this.listingRepository.count({
        where: { sellerSteamId: steamId }
      });

      const activeListings = await this.listingRepository.count({
        where: { sellerSteamId: steamId, status: ListingStatus.ACTIVE }
      });

      const soldListings = await this.listingRepository.count({
        where: { sellerSteamId: steamId, status: ListingStatus.SOLD }
      });

      const cancelledListings = await this.listingRepository.count({
        where: { sellerSteamId: steamId, status: ListingStatus.CANCELLED }
      });

      const soldListingsData = await this.listingRepository.find({
        where: { sellerSteamId: steamId, status: ListingStatus.SOLD }
      });

      const totalRevenue = soldListingsData.reduce((sum, listing) => sum + (listing.price - (listing.serviceFeeAmount || 0)), 0);
      const averagePrice = soldListingsData.length > 0 ? totalRevenue / soldListingsData.length : 0;

      return {
        totalListings,
        activeListings,
        soldListings,
        cancelledListings,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averagePrice: Math.round(averagePrice * 100) / 100
      };
    } catch (error) {
      console.error('Error getting listing statistics:', error);
      return {
        totalListings: 0,
        activeListings: 0,
        soldListings: 0,
        cancelledListings: 0,
        totalRevenue: 0,
        averagePrice: 0
      };
    }
  }

  private generateListingId(): string {
    return `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateServiceFee(price: number): number {
    return price * 0.05; // 5% fee
  }

  async getFeaturedListings(limit = 10): Promise<Listing[]> {
    try {
      return await this.listingRepository.find({
        where: { featured: true, status: ListingStatus.ACTIVE },
        relations: ['seller', 'inventoryItem'],
        order: { createdAt: 'DESC' },
        take: limit
      });
    } catch (error) {
      console.error('Error getting featured listings:', error);
      return [];
    }
  }

  async getTopSellingItems(appId?: number, limit = 10): Promise<Listing[]> {
    try {
      const queryBuilder = this.listingRepository.createQueryBuilder('listing')
        .leftJoinAndSelect('listing.seller', 'seller')
        .leftJoinAndSelect('listing.inventoryItem', 'inventoryItem')
        .where('listing.status = :status', { status: ListingStatus.SOLD });

      if (appId) {
        queryBuilder.andWhere('inventoryItem.appId = :appId', { appId });
      }

      queryBuilder.orderBy('listing.soldAt', 'DESC')
        .addOrderBy('listing.price', 'DESC')
        .take(limit);

      return await queryBuilder.getMany();
    } catch (error) {
      console.error('Error getting top selling items:', error);
      return [];
    }
  }
}