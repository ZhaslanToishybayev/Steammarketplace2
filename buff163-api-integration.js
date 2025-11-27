// BUFF163 API INTEGRATION
// =======================
// Integration with Buff163 marketplace API for real-time market prices

const https = require('https');
const axios = require('axios');

class Buff163API {
  constructor() {
    this.baseURL = 'https://buff.163.com/api';
    this.appId = '730'; // Counter-Strike 2 default
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Referer': 'https://buff.163.com/'
    };
  }

  // Get market prices for items
  async getMarketPrices(game = 'csgo', page = 1, page_size = 100) {
    try {
      const url = `${this.baseURL}/market/goods/list`;
      const params = {
        game: game,
        page_num: page,
        page_size: page_size,
        sort_by: 'price.desc',
        mode: 'direct',
        min_price: 0.01
      };

      console.log(`📡 Fetching Buff163 prices for ${game}, page ${page}`);

      const response = await axios.get(url, {
        headers: this.headers,
        params: params,
        timeout: 10000
      });

      if (response.data && response.data.data && response.data.data.items) {
        const items = response.data.data.items.map(item => ({
          id: item.id,
          name: item.name,
          market_hash_name: item.market_hash_name,
          price: parseFloat(item.price),
          min_price: parseFloat(item.min_price || 0),
          max_price: parseFloat(item.max_price || 0),
          discount: parseFloat(item.discount || 0),
          sell_num: parseInt(item.sell_num || 0),
          buy_num: parseInt(item.buy_num || 0),
          steam_price: parseFloat(item.steam_price || 0),
          icon_url: item.icon_url,
          steam_market_url: item.steam_market_url,
          created_at: new Date().toISOString()
        }));

        console.log(`✅ Buff163 API returned ${items.length} items`);
        return {
          success: true,
          data: {
            items: items,
            total: response.data.data.total,
            page: page,
            page_size: page_size
          }
        };
      } else {
        throw new Error('Invalid API response format');
      }

    } catch (error) {
      console.error('❌ Buff163 API error:', error.message);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  // Get specific item price
  async getItemPrice(market_hash_name, game = 'csgo') {
    try {
      const url = `${this.baseURL}/market/goods/price`;
      const params = {
        game: game,
        goods_name: market_hash_name
      };

      console.log(`📡 Fetching price for ${market_hash_name}`);

      const response = await axios.get(url, {
        headers: this.headers,
        params: params,
        timeout: 5000
      });

      if (response.data && response.data.data) {
        const priceData = response.data.data;
        return {
          success: true,
          data: {
            market_hash_name: market_hash_name,
            price: parseFloat(priceData.price || 0),
            min_price: parseFloat(priceData.min_price || 0),
            max_price: parseFloat(priceData.max_price || 0),
            discount: parseFloat(priceData.discount || 0),
            sell_num: parseInt(priceData.sell_num || 0),
            buy_num: parseInt(priceData.buy_num || 0),
            steam_price: parseFloat(priceData.steam_price || 0),
            updated_at: priceData.updated_at || new Date().toISOString()
          }
        };
      } else {
        throw new Error('Item not found');
      }

    } catch (error) {
      console.error('❌ Buff163 item price error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get price history for item
  async getPriceHistory(market_hash_name, game = 'csgo', days = 7) {
    try {
      const url = `${this.baseURL}/market/goods/price_history`;
      const params = {
        game: game,
        goods_name: market_hash_name,
        days: days
      };

      console.log(`📡 Fetching price history for ${market_hash_name} (${days} days)`);

      const response = await axios.get(url, {
        headers: this.headers,
        params: params,
        timeout: 8000
      });

      if (response.data && response.data.data && response.data.data.prices) {
        const history = response.data.data.prices.map(entry => ({
          timestamp: entry.time || new Date().toISOString(),
          price: parseFloat(entry.price || 0),
          volume: parseInt(entry.volume || 0)
        }));

        return {
          success: true,
          data: {
            market_hash_name: market_hash_name,
            history: history,
            days: days,
            average_price: history.reduce((sum, entry) => sum + entry.price, 0) / history.length
          }
        };
      } else {
        throw new Error('No price history available');
      }

    } catch (error) {
      console.error('❌ Buff163 price history error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get popular items
  async getPopularItems(game = 'csgo', limit = 50) {
    try {
      const url = `${this.baseURL}/market/goods/popular`;
      const params = {
        game: game,
        page_size: limit,
        sort_by: 'sell_num.desc'
      };

      console.log(`📡 Fetching popular items for ${game}`);

      const response = await axios.get(url, {
        headers: this.headers,
        params: params,
        timeout: 8000
      });

      if (response.data && response.data.data && response.data.data.items) {
        const items = response.data.data.items.map(item => ({
          name: item.name,
          market_hash_name: item.market_hash_name,
          price: parseFloat(item.price || 0),
          sell_num: parseInt(item.sell_num || 0),
          buy_num: parseInt(item.buy_num || 0),
          discount: parseFloat(item.discount || 0),
          icon_url: item.icon_url,
          trend: item.trend || 'neutral'
        }));

        return {
          success: true,
          data: {
            items: items,
            total: response.data.data.total
          }
        };
      } else {
        throw new Error('No popular items found');
      }

    } catch (error) {
      console.error('❌ Buff163 popular items error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Cache management
  static cache = new Map();
  static cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Get cached prices
  getCachedPrices(market_hash_name) {
    const cached = Buff163API.cache.get(market_hash_name);
    if (cached && Date.now() - cached.timestamp < Buff163API.cacheTimeout) {
      console.log(`📦 Cache hit for ${market_hash_name}`);
      return cached.data;
    }
    return null;
  }

  // Set cached prices
  setCachedPrices(market_hash_name, data) {
    Buff163API.cache.set(market_hash_name, {
      data: data,
      timestamp: Date.now()
    });
  }

  // Enhanced price lookup with caching
  async getEnhancedPrice(market_hash_name, game = 'csgo') {
    // Check cache first
    const cached = this.getCachedPrices(market_hash_name);
    if (cached) {
      return {
        success: true,
        data: cached,
        cached: true
      };
    }

    // Fetch from API
    const result = await this.getItemPrice(market_hash_name, game);
    if (result.success) {
      this.setCachedPrices(market_hash_name, result.data);
    }

    return result;
  }

  // Batch price lookup
  async getBatchPrices(market_hash_names, game = 'csgo') {
    const results = new Map();
    const uncached = [];

    // Check cache for all items
    market_hash_names.forEach(name => {
      const cached = this.getCachedPrices(name);
      if (cached) {
        results.set(name, {
          success: true,
          data: cached,
          cached: true
        });
      } else {
        uncached.push(name);
      }
    });

    // Fetch uncached items in parallel
    if (uncached.length > 0) {
      console.log(`📡 Fetching ${uncached.length} uncached items from Buff163`);
      const fetchPromises = uncached.map(async name => {
        const result = await this.getItemPrice(name, game);
        if (result.success) {
          this.setCachedPrices(name, result.data);
        }
        return { name, result };
      });

      const fetchResults = await Promise.allSettled(fetchPromises);
      fetchResults.forEach(({ value }) => {
        if (value) {
          results.set(value.name, value.result);
        }
      });
    }

    return {
      success: true,
      data: Object.fromEntries(results)
    };
  }

  // Get market summary
  async getMarketSummary(game = 'csgo') {
    try {
      const [prices, popular] = await Promise.all([
        this.getMarketPrices(game, 1, 10),
        this.getPopularItems(game, 10)
      ]);

      if (prices.success && popular.success) {
        const totalVolume = popular.data.items.reduce((sum, item) => sum + item.sell_num, 0);
        const avgPrice = popular.data.items.reduce((sum, item) => sum + item.price, 0) / popular.data.items.length;

        return {
          success: true,
          data: {
            game: game,
            total_tradable_items: prices.data.total,
            popular_items_count: popular.data.items.length,
            total_volume: totalVolume,
            average_price: avgPrice,
            top_items: popular.data.items.slice(0, 5),
            updated_at: new Date().toISOString()
          }
        };
      } else {
        throw new Error('Failed to fetch market data');
      }

    } catch (error) {
      console.error('❌ Buff163 market summary error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const buff163API = new Buff163API();

module.exports = {
  Buff163API,
  buff163API
};