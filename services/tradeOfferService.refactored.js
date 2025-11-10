/**
 * Trade Offer Service (Refactored to use Repository Pattern)
 * Handles Steam trade offers
 */

const { TradeOfferRepository } = require('../repositories');
const { CreateTradeOfferDTO, TradeOfferResponseDTO, PaginatedResponseDTO } = require('../dto');
const logger = require('../utils/logger');
const { Sentry } = require('../config/sentry');

class TradeOfferService {
  constructor(botManager, io = null) {
    this.botManager = botManager;
    this.activeOffers = new Map();
    this.io = io; // Socket.io instance for notifications
  }

  /**
   * Create a trade offer
   */
  async createOffer(bot, partnerSteamId, myAssetIds, theirAssetIds = [], listingId = null, metadata = {}) {
    return new Promise((resolve, reject) => {
      try {
        const offer = bot.manager.createOffer(partnerSteamId);

        logger.info(`Creating trade offer for partner: ${partnerSteamId}, items: ${myAssetIds.length}`);

        // Add bot items
        myAssetIds.forEach(assetId => {
          const item = bot.client.inventory.assets.get(assetId);
          if (item) {
            offer.addMyItem(item);
            logger.info(`Added bot item to trade offer: ${item.name} (${assetId})`);
          } else {
            logger.warn(`Item ${assetId} not found in bot inventory`);
          }
        });

        // Add partner items
        if (offer.partnerInventory && theirAssetIds.length > 0) {
          theirAssetIds.forEach(assetId => {
            const item = offer.partnerInventory.getAsset(assetId);
            if (item) {
              offer.addTheirItem(item);
              logger.info(`Added partner item to trade offer: ${item.name}`);
            } else {
              logger.warn(`Partner item ${assetId} not found in partner inventory`);
            }
          });
        } else if (theirAssetIds.length > 0) {
          logger.warn('Partner inventory not loaded, skipping theirAssetIds');
        }

        // Send offer
        offer.send(async (err) => {
          if (err) {
            logger.error('Error sending trade offer:', err);
            if (Sentry) {
              Sentry.captureException(err, {
                tags: {
                  service: 'tradeOfferService',
                  action: 'createOffer',
                  partnerSteamId
                },
                extra: {
                  myAssetIds,
                  theirAssetIds,
                  listingId
                }
              });
            }
            return reject(err);
          }

          const offerId = offer.id;

          try {
            // Create trade offer data
            const tradeOfferData = {
              offerId: offerId,
              steamId: partnerSteamId,
              botId: bot.id || 'unknown',
              itemsGiven: myAssetIds.map(assetId => this._formatItem(assetId, bot)),
              itemsReceived: theirAssetIds.map(assetId => this._formatItemFromPartner(offer, assetId)),
              status: 'sent',
              metadata: {
                source: 'api',
                ...metadata
              }
            };

            // Save to database using repository
            const createdOffer = await TradeOfferRepository.createOffer(tradeOfferData);

            // Track active offer
            this.activeOffers.set(offerId, {
              listingId,
              partnerSteamId,
              botId: bot.id,
              createdAt: new Date()
            });

            // Emit socket event if available
            if (this.io) {
              this.io.emit('tradeOfferCreated', {
                offerId,
                partnerSteamId,
                status: 'sent'
              });
            }

            logger.info(`Trade offer created successfully: ${offerId}`);

            resolve(TradeOfferResponseDTO.forUser(createdOffer));
          } catch (dbError) {
            logger.error('Error saving trade offer to database:', dbError);
            reject(dbError);
          }
        });
      } catch (error) {
        logger.error('Error in createOffer:', error);
        reject(error);
      }
    });
  }

  /**
   * Get trade offer by ID
   */
  async getTradeOfferById(offerId) {
    try {
      const tradeOffer = await TradeOfferRepository.findByOfferId(offerId);
      return tradeOffer ? TradeOfferResponseDTO.forUser(tradeOffer) : null;
    } catch (error) {
      logger.error(`Error getting trade offer ${offerId}:`, error);
      throw error;
    }
  }

  /**
   * Get trade offers by Steam ID
   */
  async getTradeOffersBySteamId(steamId, filters = {}, options = {}, page = 1, limit = 20) {
    try {
      const result = await TradeOfferRepository.findBySteamId(steamId, filters, options, page, limit);
      return PaginatedResponseDTO.fromResult(result, (offer) => {
        return TradeOfferResponseDTO.forUser(offer);
      });
    } catch (error) {
      logger.error(`Error getting trade offers for ${steamId}:`, error);
      throw error;
    }
  }

  /**
   * Get trade offers by bot ID
   */
  async getTradeOffersByBotId(botId, filters = {}, options = {}, page = 1, limit = 20) {
    try {
      const result = await TradeOfferRepository.findByBotId(botId, filters, options, page, limit);
      return PaginatedResponseDTO.fromResult(result, (offer) => {
        return TradeOfferResponseDTO.forUser(offer);
      });
    } catch (error) {
      logger.error(`Error getting trade offers for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Get trade history
   */
  async getTradeHistory(steamId, filters = {}, options = {}, page = 1, limit = 20) {
    try {
      const result = await TradeOfferRepository.getTradeHistory(steamId, filters, options, page, limit);
      return PaginatedResponseDTO.fromResult(result, (offer) => {
        return TradeOfferResponseDTO.forUser(offer);
      });
    } catch (error) {
      logger.error(`Error getting trade history for ${steamId}:`, error);
      throw error;
    }
  }

  /**
   * Update trade offer status
   */
  async updateTradeStatus(offerId, status, metadata = {}) {
    try {
      let result;

      switch (status) {
        case 'accepted':
          result = await TradeOfferRepository.markAsAccepted(offerId, metadata);
          break;
        case 'declined':
          result = await TradeOfferRepository.markAsDeclined(offerId, metadata.reason);
          break;
        case 'cancelled':
          result = await TradeOfferRepository.markAsCancelled(offerId, metadata.reason);
          break;
        case 'failed':
          result = await TradeOfferRepository.markAsFailed(
            offerId,
            metadata.errorMessage,
            metadata.errorCode
          );
          break;
        default:
          result = await TradeOfferRepository.updateStatus(offerId, status, metadata);
      }

      // Emit socket event if available
      if (this.io) {
        this.io.emit('tradeOfferUpdated', {
          offerId,
          status,
          metadata
        });
      }

      logger.info(`Trade offer ${offerId} status updated to: ${status}`);

      return TradeOfferResponseDTO.forUser(result);
    } catch (error) {
      logger.error(`Error updating trade status for ${offerId}:`, error);
      throw error;
    }
  }

  /**
   * Get trade statistics
   */
  async getTradeStats(steamId = null, botId = null) {
    try {
      const stats = await TradeOfferRepository.getTradeStats(steamId, botId);
      return stats;
    } catch (error) {
      logger.error('Error getting trade stats:', error);
      throw error;
    }
  }

  /**
   * Get pending trades
   */
  async getPendingTrades() {
    try {
      const trades = await TradeOfferRepository.findPendingTrades();
      return trades.map(trade => TradeOfferResponseDTO.forUser(trade));
    } catch (error) {
      logger.error('Error getting pending trades:', error);
      throw error;
    }
  }

  /**
   * Get trades requiring action
   */
  async getTradesRequiringAction() {
    try {
      const trades = await TradeOfferRepository.findTradesRequiringAction();
      return trades.map(trade => TradeOfferResponseDTO.forUser(trade));
    } catch (error) {
      logger.error('Error getting trades requiring action:', error);
      throw error;
    }
  }

  /**
   * Get trade analytics
   */
  async getTradeAnalytics(steamId = null, period = '7d') {
    try {
      const analytics = await TradeOfferRepository.getTradeAnalytics(steamId, period);
      return analytics;
    } catch (error) {
      logger.error('Error getting trade analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate profit
   */
  async calculateProfit(steamId = null, botId = null, startDate = null, endDate = null) {
    try {
      const profit = await TradeOfferRepository.calculateProfit(steamId, botId, startDate, endDate);
      return profit;
    } catch (error) {
      logger.error('Error calculating profit:', error);
      throw error;
    }
  }

  /**
   * Find failed trades for retry
   */
  async getFailedTradesForRetry() {
    try {
      const trades = await TradeOfferRepository.findFailedTradesForRetry();
      return trades.map(trade => TradeOfferResponseDTO.forUser(trade));
    } catch (error) {
      logger.error('Error getting failed trades for retry:', error);
      throw error;
    }
  }

  /**
   * Clean up old trades
   */
  async cleanupOldTrades(daysOld = 90) {
    try {
      const result = await TradeOfferRepository.cleanupOldTrades(daysOld);
      logger.info(`Cleaned up ${result.deletedCount} old trade offers`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up old trades:', error);
      throw error;
    }
  }

  /**
   * Get recent trades
   */
  async getRecentTrades(limit = 10, steamId = null) {
    try {
      const trades = await TradeOfferRepository.getRecentTrades(limit, steamId);
      return trades.map(trade => TradeOfferResponseDTO.forUser(trade));
    } catch (error) {
      logger.error('Error getting recent trades:', error);
      throw error;
    }
  }

  /**
   * Helper: Format item from bot inventory
   */
  _formatItem(assetId, bot) {
    const item = bot.client.inventory.assets.get(assetId);
    if (!item) return null;

    return {
      assetId: assetId,
      classId: item.classid,
      instanceId: item.instanceid,
      name: item.name,
      marketName: item.market_name,
      iconUrl: item.icon_url,
      appId: item.appid,
      contextId: item.contextid,
      amount: item.amount || 1
    };
  }

  /**
   * Helper: Format item from partner inventory
   */
  _formatItemFromPartner(offer, assetId) {
    if (!offer.partnerInventory) return null;

    const item = offer.partnerInventory.getAsset(assetId);
    if (!item) return null;

    return {
      assetId: assetId,
      classId: item.classid,
      instanceId: item.instanceid,
      name: item.name,
      marketName: item.market_name,
      iconUrl: item.icon_url,
      appId: item.appid,
      contextId: item.contextid,
      amount: item.amount || 1
    };
  }
}

module.exports = TradeOfferService;
