// ENHANCED STEAM INVENTORY SYSTEM - Professional marketplace approach
const https = require('https');
const zlib = require('zlib');

// Cache system - как у профессиональных marketplace
const inventoryCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут кэширования

// Retry mechanism - как у CS.Money и Buff163
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 секунды между попытками

class EnhancedSteamInventory {
  constructor() {
    this.cache = new Map();
    this.requestQueue = new Map(); // Для предотвращения дублирующих запросов
  }

  // Кэширование как у профессиональных marketplace
  isCacheValid(key) {
    if (!this.cache.has(key)) return false;

    const { timestamp } = this.cache.get(key);
    return (Date.now() - timestamp) < CACHE_DURATION;
  }

  getFromCache(key) {
    if (this.isCacheValid(key)) {
      console.log(`📦 Cache hit for Steam ID: ${key}`);
      return this.cache.get(key).data;
    }
    return null;
  }

  setToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`📦 Cached inventory for Steam ID: ${key} (5 minutes)`);
  }

  // Retry mechanism как у профессиональных marketplace
  async retryWithBackoff(fn, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await fn();
        if (result) return result;
      } catch (error) {
        console.log(`🔄 Retry ${i + 1}/${retries} failed: ${error.message}`);

        if (i === retries - 1) {
          throw error;
        }

        // Exponential backoff
        await this.delay(RETRY_DELAY * Math.pow(2, i));
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Enhanced Steam API call with professional approach
  async fetchSteamInventory(steamId, appId = 730) {
    const cacheKey = `${steamId}_${appId}`;

    // Проверяем кэш первым делом
    const cachedData = this.getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Проверяем, не выполняется ли уже запрос для этого Steam ID
    if (this.requestQueue.has(cacheKey)) {
      console.log(`⏳ Waiting for existing request for Steam ID: ${steamId}`);
      return this.requestQueue.get(cacheKey);
    }

    // Создаем новый запрос
    const requestPromise = this.executeSteamRequest(steamId, appId);
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.requestQueue.delete(cacheKey);
      this.setToCache(cacheKey, result);
      return result;
    } catch (error) {
      this.requestQueue.delete(cacheKey);
      throw error;
    }
  }

  // Professional Steam API request implementation
  async executeSteamRequest(steamId, appId) {
    return this.retryWithBackoff(async () => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const apiUrl = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=5000`;

        console.log(`📦 Enhanced Steam API request: ${apiUrl}`);

        const options = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 10000, // 10 секунд таймаут (как у профессионалов)
          rejectUnauthorized: false // Для стабильности
        };

        const request = https.get(apiUrl, options, (res) => {
          let rawData = '';
          let decompressedStream;

          // Обработка gzip/deflate как у профессионалов
          if (res.headers['content-encoding'] && res.headers['content-encoding'].includes('gzip')) {
            decompressedStream = res.pipe(zlib.createGunzip());
          } else if (res.headers['content-encoding'] && res.headers['content-encoding'].includes('deflate')) {
            decompressedStream = res.pipe(zlib.createInflate());
          } else {
            decompressedStream = res;
          }

          decompressedStream.on('data', (chunk) => {
            rawData += chunk;
          });

          decompressedStream.on('end', () => {
            const duration = Date.now() - startTime;
            console.log(`📦 Steam API response in ${duration}ms - Status: ${res.statusCode}`);

            if (res.statusCode === 200) {
              try {
                // Professional JSON parsing with error handling
                if (!rawData || rawData.trim() === '' || rawData === 'null') {
                  reject(new Error('Empty or null response from Steam API'));
                  return;
                }

                const inventory = JSON.parse(rawData);

                if (!inventory.success || !inventory.assets || inventory.assets.length === 0) {
                  // Пустой инвентарь - это нормально, возвращаем пустой результат
                  resolve({
                    success: true,
                    steamId,
                    appId,
                    items: [],
                    totalCount: 0,
                    message: 'Inventory is empty or private'
                  });
                  return;
                }

                // Professional item processing
                const processedItems = this.processInventoryItems(inventory, appId);
                const result = {
                  success: true,
                  steamId,
                  appId,
                  items: processedItems,
                  totalCount: processedItems.length
                };

                resolve(result);

              } catch (parseError) {
                console.error('❌ JSON parse error:', parseError.message);
                console.log('📦 Raw data preview:', rawData.substring(0, 500));
                reject(new Error('Failed to parse Steam API response'));
              }
            } else {
              // Professional error handling
              const errorMessages = {
                400: 'Invalid Steam ID or request parameters',
                401: 'Unauthorized access to Steam inventory',
                403: 'Steam inventory is private',
                404: 'Steam user not found or inventory does not exist',
                500: 'Steam server error',
                502: 'Steam server temporarily unavailable',
                503: 'Steam service temporarily unavailable'
              };

              const errorMessage = errorMessages[res.statusCode] || `HTTP ${res.statusCode}: ${res.statusMessage}`;
              reject(new Error(errorMessage));
            }
          });
        });

        request.on('timeout', () => {
          console.error('❌ Steam API request timeout');
          request.destroy();
          reject(new Error('Steam API request timeout'));
        });

        request.on('error', (error) => {
          console.error('❌ Steam API request error:', error.message);
          reject(new Error(`Network error: ${error.message}`));
        });
      });
    });
  }

  // Professional item processing like CS.Money
  processInventoryItems(inventory, appId) {
    const items = [];

    try {
      inventory.assets.forEach(asset => {
        const description = inventory.descriptions.find(desc =>
          desc.classid === asset.classid && desc.instanceid === asset.instanceid
        );

        if (description) {
          const item = {
            assetId: asset.assetid,
            classId: asset.classid,
            instanceId: asset.instanceid,
            amount: parseInt(asset.amount) || 1,
            name: description.name || 'Unknown Item',
            type: description.type || '',
            marketHashName: description.market_hash_name || '',
            description: description.description?.[0]?.value || '',
            appId: appId,
            // Professional item attributes
            tradable: description.tradable === 1,
            marketable: description.marketable === 1,
            commodity: description.commodity === 1,
            // Item quality and condition
            quality: this.extractQuality(description.tags),
            rarity: this.extractRarity(description.tags),
            exterior: this.extractExterior(description.tags),
            // Images with fallback
            image: this.getImageUrl(description.icon_url, '62fx62f'),
            imageLarge: this.getImageUrl(description.icon_url_large, '184fx184f'),
            // Game-specific data
            categoryId: description.market_fee_app || appId,
            fraudWarnings: description.fraudwarnings || [],
            // Estimated price (placeholder for Buff163 integration)
            estimatedPrice: 0,
            // Timestamps
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          items.push(item);
        }
      });

      console.log(`📦 Processed ${items.length} items from Steam inventory`);

    } catch (error) {
      console.error('❌ Error processing inventory items:', error.message);
    }

    return items;
  }

  // Professional attribute extraction
  extractQuality(tags) {
    if (!tags) return '';
    const qualityTag = tags.find(tag => tag.category === 'Quality');
    return qualityTag?.localized_tag || qualityTag?.name || '';
  }

  extractRarity(tags) {
    if (!tags) return '';
    const rarityTag = tags.find(tag => tag.category === 'Rarity');
    return rarityTag?.localized_tag || rarityTag?.name || '';
  }

  extractExterior(tags) {
    if (!tags) return '';
    const exteriorTag = tags.find(tag => tag.category === 'Exterior');
    return exteriorTag?.localized_tag || exteriorTag?.name || '';
  }

  getImageUrl(iconUrl, size) {
    if (!iconUrl) return '';
    return `https://steamcommunity-a.akamaihd.net/economy/image/${iconUrl}/${size}`;
  }

  // Professional cache management
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getCacheStats() {
    const totalEntries = this.cache.size;
    const validEntries = Array.from(this.cache.keys()).filter(key =>
      this.isCacheValid(key)
    ).length;

    return {
      totalEntries,
      validEntries,
      expiredEntries: totalEntries - validEntries,
      hitRate: totalEntries > 0 ? `${Math.round((validEntries / totalEntries) * 100)}%` : '0%'
    };
  }
}

// Export singleton instance
module.exports = new EnhancedSteamInventory();