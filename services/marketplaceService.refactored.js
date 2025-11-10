/**
 * Marketplace Service (Refactored to use Repository Pattern)
 * Business logic for marketplace operations
 */

const { MarketListingRepository } = require('../repositories');
const { CreateListingDTO, ListingResponseDTO, PaginatedResponseDTO } = require('../dto');
const logger = require('../utils/logger');

class MarketplaceService {
  /**
   * Get all active listings with pagination
   */
  async getActiveListings(filters = {}, options = {}, page = 1, limit = 20) {
    try {
      const result = await MarketListingRepository.getActiveListings(filters, options, page, limit);
      return PaginatedResponseDTO.fromResult(result, (listing) => {
        return ListingResponseDTO.withSeller(listing);
      });
    } catch (error) {
      logger.error('Error getting active listings:', error);
      throw error;
    }
  }

  /**
   * Search listings
   */
  async searchListings(searchTerm, filters = {}, options = {}, page = 1, limit = 20) {
    try {
      const result = await MarketListingRepository.searchListings(searchTerm, filters, options, page, limit);
      return PaginatedResponseDTO.fromResult(result, (listing) => {
        return ListingResponseDTO.withSeller(listing);
      });
    } catch (error) {
      logger.error('Error searching listings:', error);
      throw error;
    }
  }

  /**
   * Find listings by price range
   */
  async getListingsByPriceRange(minPrice, maxPrice, filters = {}, options = {}, page = 1, limit = 20) {
    try {
      const result = await MarketListingRepository.findByPriceRange(minPrice, maxPrice, filters, options, page, limit);
      return PaginatedResponseDTO.fromResult(result, (listing) => {
        return ListingResponseDTO.withSeller(listing);
      });
    } catch (error) {
      logger.error('Error getting listings by price range:', error);
      throw error;
    }
  }

  /**
   * Create new listing
   */
  async createListing(data, sellerId) {
    try {
      // Validate and transform DTO
      const createListingDTO = new CreateListingDTO(data);
      const validation = createListingDTO.validate();

      if (!validation.isValid) {
        const error = new Error(`Validation failed: ${validation.errors.join(', ')}`);
        error.statusCode = 400;
        throw error;
      }

      const listingData = createListingDTO.toModel(sellerId);

      // Create listing
      const listing = await MarketListingRepository.create(listingData);

      logger.info(`Created new listing: ${listing._id} for seller: ${sellerId}`);

      return ListingResponseDTO.withSeller(listing);
    } catch (error) {
      logger.error('Error creating listing:', error);
      throw error;
    }
  }

  /**
   * Get listing by ID
   */
  async getListingById(listingId) {
    try {
      const listing = await MarketListingRepository.findById(listingId);

      if (!listing) {
        const error = new Error('Listing not found');
        error.statusCode = 404;
        throw error;
      }

      // Increment view count
      await MarketListingRepository.incrementViews(listingId);

      return ListingResponseDTO.withSeller(listing);
    } catch (error) {
      logger.error(`Error getting listing ${listingId}:`, error);
      throw error;
    }
  }

  /**
   * Update listing
   */
  async updateListing(listingId, userId, data) {
    try {
      const listing = await MarketListingRepository.findById(listingId);

      if (!listing) {
        const error = new Error('Listing not found');
        error.statusCode = 404;
        throw error;
      }

      // Check if user is the seller
      if (listing.seller.toString() !== userId) {
        const error = new Error('Not authorized to update this listing');
        error.statusCode = 403;
        throw error;
      }

      // Check if listing is still active
      if (listing.status !== 'active') {
        const error = new Error('Cannot update listing that is not active');
        error.statusCode = 400;
        throw error;
      }

      // Update allowed fields
      const updateData = {};
      if (data.price) updateData.price = data.price;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.autoAccept !== undefined) updateData.autoAccept = data.autoAccept;

      const updatedListing = await MarketListingRepository.updateById(listingId, updateData);

      logger.info(`Updated listing: ${listingId}`);

      return ListingResponseDTO.withSeller(updatedListing);
    } catch (error) {
      logger.error(`Error updating listing ${listingId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel listing
   */
  async cancelListing(listingId, userId) {
    try {
      const listing = await MarketListingRepository.findById(listingId);

      if (!listing) {
        const error = new Error('Listing not found');
        error.statusCode = 404;
        throw error;
      }

      // Check if user is the seller
      if (listing.seller.toString() !== userId) {
        const error = new Error('Not authorized to cancel this listing');
        error.statusCode = 403;
        throw error;
      }

      // Check if listing is still active
      if (listing.status !== 'active') {
        const error = new Error('Cannot cancel listing that is not active');
        error.statusCode = 400;
        throw error;
      }

      await MarketListingRepository.cancelListing(listingId);

      logger.info(`Cancelled listing: ${listingId}`);

      return { success: true, message: 'Listing cancelled successfully' };
    } catch (error) {
      logger.error(`Error cancelling listing ${listingId}:`, error);
      throw error;
    }
  }

  /**
   * Mark listing as sold
   */
  async markAsSold(listingId, buyerId, tradeOfferId) {
    try {
      const updatedListing = await MarketListingRepository.markAsSold(listingId, buyerId, tradeOfferId);

      logger.info(`Marked listing as sold: ${listingId}`);

      return ListingResponseDTO.withSeller(updatedListing);
    } catch (error) {
      logger.error(`Error marking listing as sold ${listingId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's listings
   */
  async getUserListings(userId, filters = {}, options = {}, page = 1, limit = 20) {
    try {
      const result = await MarketListingRepository.getListingsBySeller(userId, filters, options, page, limit);
      return PaginatedResponseDTO.fromResult(result);
    } catch (error) {
      logger.error(`Error getting user listings for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's active listings
   */
  async getUserActiveListings(userId) {
    try {
      const listings = await MarketListingRepository.getUserActiveListings(userId);
      return listings.map(listing => new ListingResponseDTO(listing));
    } catch (error) {
      logger.error(`Error getting user active listings for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get featured listings
   */
  async getFeaturedListings(limit = 10) {
    try {
      const listings = await MarketListingRepository.getFeaturedListings(limit);
      return listings.map(listing => ListingResponseDTO.withSeller(listing));
    } catch (error) {
      logger.error('Error getting featured listings:', error);
      throw error;
    }
  }

  /**
   * Get cheapest listing for an item
   */
  async getCheapestListing(classId, instanceId = null) {
    try {
      const listing = await MarketListingRepository.getCheapestListing(classId, instanceId);
      return listing ? ListingResponseDTO.withSeller(listing) : null;
    } catch (error) {
      logger.error(`Error getting cheapest listing for ${classId}:`, error);
      throw error;
    }
  }

  /**
   * Get market statistics
   */
  async getMarketStats(classId = null) {
    try {
      const stats = await MarketListingRepository.getMarketStats(classId);
      return stats;
    } catch (error) {
      logger.error('Error getting market stats:', error);
      throw error;
    }
  }

  /**
   * Get trending items
   */
  async getTrendingItems(limit = 10, timeframe = '24h') {
    try {
      const items = await MarketListingRepository.getTrendingItems(limit, timeframe);
      return items;
    } catch (error) {
      logger.error('Error getting trending items:', error);
      throw error;
    }
  }

  /**
   * Auto-expire old listings
   */
  async autoExpireListings() {
    try {
      const result = await MarketListingRepository.autoExpireListings();
      logger.info(`Auto-expired ${result.modifiedCount} listings`);
      return result;
    } catch (error) {
      logger.error('Error auto-expiring listings:', error);
      throw error;
    }
  }

  /**
   * Get listing analytics
   */
  async getListingAnalytics(listingId) {
    try {
      const analytics = await MarketListingRepository.getListingAnalytics(listingId);
      return analytics;
    } catch (error) {
      logger.error(`Error getting listing analytics for ${listingId}:`, error);
      throw error;
    }
  }

  /**
   * Find similar listings
   */
  async findSimilarListings(listingId, limit = 5) {
    try {
      const listings = await MarketListingRepository.findSimilarListings(listingId, limit);
      return listings.map(listing => ListingResponseDTO.withSeller(listing));
    } catch (error) {
      logger.error(`Error finding similar listings for ${listingId}:`, error);
      throw error;
    }
  }
}

module.exports = new MarketplaceService();
