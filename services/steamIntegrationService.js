/**
 * Steam Integration Service
 * Реальная интеграция с Steam API для marketplace
 */

const axios = require('axios');
const SteamUser = require('steam-user');
const TradeOfferManager = require('steam-tradeoffer-manager');
const rateLimiter = require('../utils/rateLimit');
const logger = require('../utils/logger');

class SteamIntegrationService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get real Steam inventory from Steam Community API
   */
  async getInventory(steamId, appId = 730, accessToken = null) {
    const cacheKey = `inventory_${steamId}_${appId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return { items: cached.data, cached: true };
    }

    // Используем центральный rateLimiter
    return rateLimiter.addRequest(async () => {
      try {
        const url = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };

        // Add OAuth token if available (required for accessing inventories since Steam API changes)
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await axios.get(url, {
          timeout: 10000,
          headers: headers
        });

        if (!response.data.success) {
          throw new Error('Steam API returned error');
        }

        const { assets, descriptions } = response.data;

        if (!assets || !descriptions) {
          return { items: [], cached: false };
        }

        // Combine assets with descriptions
        const items = assets.map(asset => {
          const description = descriptions.find(desc =>
            desc.classid === asset.classid && desc.instanceid === asset.instanceid
          );

          return {
            assetId: asset.assetid,
            classId: asset.classid,
            instanceId: asset.instanceid,
            amount: asset.amount,
            name: description?.name || 'Unknown',
            marketName: description?.market_name || description?.name || 'Unknown',
            iconUrl: description?.icon_url
              ? this.getFullIconUrl(description.icon_url)
              : null,
            tradable: description?.tradable === 1,
            marketable: description?.marketable === 1,
            type: description?.type || 'Unknown',
            rarity: this.getTagValue(description, 'Rarity'),
            exterior: this.getTagValue(description, 'Exterior'),
            weapon: this.getTagValue(description, 'Weapon'),
            quality: this.getTagValue(description, 'Quality'),
            stattrak: description?.market_name?.includes('StatTrak™') || false,
            souvenir: description?.market_name?.includes('Souvenir') || false,
            inspectLink: this.generateInspectLink(description?.market_name, asset.assetid),
            // Add position info for trade offers
            contextId: asset.contextid,
            appId: asset.appid
          };
        });

        // NO FILTERING HERE - let the routes filter based on game type
        // This service should return all items and let routes decide what to show
        const allItems = items;

        // Cache result
        this.cache.set(cacheKey, {
          data: allItems,
          timestamp: Date.now()
        });

        return { items: allItems, cached: false };
      } catch (error) {
        logger.error(`Error fetching inventory for ${steamId}:`, error.message);

        // Return cached version if available
        if (cached) {
          return { items: cached.data, cached: true, error: error.message };
        }

        throw error;
      }
    });
  }

  /**
   * Verify user owns specific item
   */
  async verifyItemOwnership(steamId, assetId, appId = 730) {
    try {
      const inventory = await this.getInventory(steamId, appId);
      return inventory.items.find(item => item.assetId === assetId);
    } catch (error) {
      logger.error('Error verifying item ownership:', error);
      return null;
    }
  }

  /**
   * Get current market price from Steam Community Market
   */
  async getMarketPrice(marketHashName, currency = 'USD') {
    const cacheKey = `price_${marketHashName}_${currency}`;
    const cached = this.cache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const currencyCode = this.getCurrencyCode(currency);
      const url = `https://steamcommunity.com/market/priceoverview/` +
        `?currency=${currencyCode}&appid=730&market_hash_name=${encodeURIComponent(marketHashName)}`;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.data.success) {
        const priceData = {
          success: true,
          lowestPrice: response.data.lowest_price,
          volume: response.data.volume,
          medianPrice: response.data.median_price,
          currency: currency
        };

        // Cache result
        this.cache.set(cacheKey, {
          data: priceData,
          timestamp: Date.now()
        });

        return priceData;
      }

      return { success: false, error: 'Price not available' };
    } catch (error) {
      logger.error(`Error fetching market price for ${marketHashName}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get price history for an item
   */
  async getPriceHistory(marketHashName) {
    try {
      const url = `https://steamcommunity.com/market/listings/730/${encodeURIComponent(marketHashName)}`;
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Extract price data from HTML response
      const priceData = this.parsePriceHistory(response.data);
      return { success: true, data: priceData };
    } catch (error) {
      logger.error(`Error fetching price history for ${marketHashName}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get item float value using inspect URL
   */
  async getFloatValue(inspectUrl) {
    try {
      // Try multiple float checking services
      const services = [
        'https://api.csgofloat.com/',
        'https://float-db.com/',
        'https://csfloat.com/'
      ];

      for (const service of services) {
        try {
          const response = await axios.post(service + 'api/check', {
            url: inspectUrl
          }, {
            timeout: 5000
          });

          if (response.data && response.data.floatvalue !== undefined) {
            return {
              success: true,
              float: response.data.floatvalue,
              paintSeed: response.data.paintseed || null,
              service: service
            };
          }
        } catch (serviceError) {
          // Try next service
          continue;
        }
      }

      return {
        success: false,
        error: 'Float checking service unavailable'
      };
    } catch (error) {
      logger.error('Error fetching float value:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get bot inventory from Steam bot account
   */
  async getBotInventory(tradeOfferManager, appId = 730, contextId = 2) {
    // Константы для настройки загрузки инвентаря бота
    const BOT_INVENTORY_CONFIG = {
      TIMEOUT: 60000 // 60 seconds
    };

    // Используем центральный rateLimiter
    return rateLimiter.addRequest(() => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          logger.warn('[Bot] Inventory load timeout, falling back to Steam API');
          // Fallback to Steam API if TradeOfferManager takes too long
          if (tradeOfferManager.steam && tradeOfferManager.steam.steamID) {
            const steamId = tradeOfferManager.steam.steamID.getSteamID64();
            this.getInventory(steamId, appId)
              .then(result => resolve(result.items))
              .catch(err => {
                logger.error('[Bot] Steam API fallback failed:', err);
                resolve([]);
              });
          } else {
            resolve([]);
          }
        }, BOT_INVENTORY_CONFIG.TIMEOUT); // 60 second timeout

        try {
          // Use the correct TradeOfferManager v2+ method: getInventoryContents
          logger.info('[Bot] Using TradeOfferManager.getInventoryContents()...');

          tradeOfferManager.getInventoryContents(appId, contextId, true, (err, inventory) => {
            clearTimeout(timeout);

            if (err) {
              logger.error('[Bot] Error loading inventory via getInventoryContents:', err);
              // Try Steam API as fallback
              if (tradeOfferManager.steam && tradeOfferManager.steam.steamID) {
                const steamId = tradeOfferManager.steam.steamID.getSteamID64();
                this.getInventory(steamId, appId)
                  .then(result => resolve(result.items))
                  .catch(apiErr => {
                    logger.error('[Bot] Steam API fallback failed:', apiErr);
                    resolve([]);
                  });
              } else {
                resolve([]);
              }
              return;
            }

            if (!inventory || !Array.isArray(inventory)) {
              logger.info('[Bot] No inventory array returned, trying Steam API fallback');
              // Try Steam API as fallback
              if (tradeOfferManager.steam && tradeOfferManager.steam.steamID) {
                const steamId = tradeOfferManager.steam.steamID.getSteamID64();
                this.getInventory(steamId, appId)
                  .then(result => resolve(result.items))
                  .catch(apiErr => {
                    logger.error('[Bot] Steam API fallback failed:', apiErr);
                    resolve([]);
                  });
              } else {
                resolve([]);
              }
              return;
            }

            logger.info(`[Bot] Got ${inventory.length} items from TradeOfferManager`);

            // Log item details for the first item
            if (inventory.length > 0) {
              const firstItem = inventory[0];
              logger.info(`[Bot] Item #1: ${firstItem.name} (AssetID: ${firstItem.assetid})`);
              logger.info(`[Bot] Item #1 details: type=${firstItem.type}, tradable=${firstItem.tradable}, marketable=${firstItem.marketable}`);
            }

            // Filter for tradable and marketable CS2 items
            const tradableItems = inventory.filter(item => {
              const isTradable = item.tradable !== false && item.marketable !== false;
              const type = item.type || '';
              const isValidType = !type.includes('Base Grade Container') &&
                                !type.includes('Graffiti') &&
                                !type.includes('Music') &&
                                !type.includes('Music Kit') &&
                                type.trim() !== '';

              return isTradable && isValidType;
            });

            logger.info(`[Bot] Found ${tradableItems.length} tradable items out of ${inventory.length} total`);
            resolve(tradableItems);
          });
        } catch (error) {
          clearTimeout(timeout);
          logger.error('[Bot] Exception loading inventory:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Create trade offer from bot to user
   */
  async createTradeOffer(botManager, partnerSteamId, myAssetIds, theirAssetIds = []) {
    return new Promise((resolve, reject) => {
      botManager.createOffer(partnerSteamId, (err, offer) => {
        if (err) {
          logger.error('Error creating trade offer:', err);
          return reject(err);
        }

        // Add items from bot
        myAssetIds.forEach(assetId => {
          const item = offer.botInventory.getAsset(assetId);
          if (item) {
            offer.addMyItem(item);
          }
        });

        // Add items from user (if buying)
        theirAssetIds.forEach(assetId => {
          const item = offer.partnerInventory.getAsset(assetId);
          if (item) {
            offer.addTheirItem(item);
          }
        });

        offer.send('Marketplace transaction', (err2) => {
          if (err2) {
            logger.error('Error sending trade offer:', err2);
            return reject(err2);
          }

          logger.info(`Trade offer ${offer.id} created successfully`);

          resolve({
            offerId: offer.id,
            offer: offer,
            status: 'sent'
          });
        });
      });
    });
  }

  /**
   * Get trade offer status
   */
  async getTradeOfferStatus(botManager, offerId) {
    return new Promise((resolve, reject) => {
      botManager.getOffer(offerId, (err, offer) => {
        if (err) {
          logger.error('Error getting trade offer:', err);
          return reject(err);
        }

        resolve({
          offerId: offer.id,
          state: offer.state,
          stateName: TradeOfferManager.ETradeOfferState[offer.state],
          isCompleted: offer.isCompleted(),
          isSuccessful: offer.isSuccessful()
        });
      });
    });
  }

  // Helper methods

  getFullIconUrl(iconUrl) {
    if (!iconUrl) return null;
    if (iconUrl.startsWith('http')) return iconUrl;
    return `https://community.cloudflare.steamstatic.com/economy/image/class_730/${iconUrl}`;
  }

  getTagValue(description, tagName) {
    if (!description?.tags) return null;
    const tag = description.tags.find(t => t.category === tagName);
    return tag ? (tag.localized_tag_name || tag.name) : null;
  }

  getCurrencyCode(currency) {
    const codes = {
      'USD': 1,
      'GBP': 2,
      'EUR': 3,
      'RUB': 5,
      'CNY': 23
    };
    return codes[currency] || 1;
  }

  generateInspectLink(marketName, assetId) {
    if (!marketName || !assetId) return null;
    // Steam inspect links follow a specific format
    return `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M${marketName}%20A${assetId}%20D2`;
  }

  parsePriceHistory(html) {
    // This would parse the HTML response to extract price history
    // Simplified for now - in production, use proper HTML parsing
    const priceMatch = html.match(/var line1=\[(.*?)\]/);
    if (priceMatch) {
      return {
        prices: JSON.parse(`[${priceMatch[1]}]`)
      };
    }
    return { prices: [] };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Steam integration cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        timestamp: new Date(value.timestamp),
        items: value.data.length
      }))
    };
  }
}

module.exports = new SteamIntegrationService();
