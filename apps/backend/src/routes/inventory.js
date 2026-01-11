// apps/backend/src/routes/inventory.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const { proxyService } = require('../services/proxy.service'); // Import ProxyService
const { steamInventoryBreaker } = require('../services/circuit-breaker.service');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const steaminventory = require('get-steam-inventory');
const qs = require('querystring');

const inventoryManager = require('../services/inventory.manager'); // SWAPPED: inventoryManager

/**
 * Fetch inventory with Circuit Breaker protection
 * @param {string} steamId 
 * @param {string} appId 
 * @param {string} contextId 
 * @returns {Promise<any[]|{error: string}>}
 */
async function fetchInventoryRaw(steamId, appId, contextId) {
  // Wrap the inventory fetch in a circuit breaker
  try {
    return await steamInventoryBreaker.execute(async () => {
      let items = [];
      try {
        console.log(`📡 Fetching inventory via InventoryManager for ${steamId}...`);
        // Use the new Multi-Strategy Manager
        const result = await inventoryManager.getInventory(steamId, appId, contextId);

        // Bubble up error object to the route handler
        if (result && result.error === 'GHOST_INVENTORY') {
          console.warn('👻 Ghost Inventory Detected. Returning error to route.');
          return { error: 'GHOST_INVENTORY' };
        }

        if (result && result.length > 0) {
          items = result;
        } else if (Array.isArray(result)) {
          items = result; // Empty array
        }
      } catch (err) {
        console.warn(`⚠️ Inventory fetch failed: ${err.message}`);
        throw err; // Re-throw to trigger circuit breaker
      }

      // Return items (empty or not)
      if (items.length === 0) {
        console.log('⚠️ Strategy failed. Returning empty inventory.');
        
        // MOCK DATA FOR TEST USER
        if (steamId === '76561198000000001') {
             console.log('🧪 Serving MOCK INVENTORY for Test User');
             return getMockInventory(appId);
        }
      }

      return items;
    });
  } catch (breakerError) {
    // Circuit breaker is open or request failed
    if (breakerError.message.includes('Circuit breaker OPEN')) {
      console.warn(`🔴 Steam Inventory API is temporarily unavailable: ${breakerError.message}`);
      return { error: 'SERVICE_UNAVAILABLE', message: breakerError.message };
    }
    // Other errors - return empty inventory
    console.warn(`⚠️ Inventory fetch error: ${breakerError.message}`);
    return [];
  }
}

function getMockInventory(appId) {
  if (String(appId) !== '730') return [];

  return [
    {
      assetid: 'mock_1',
      classid: 'mock_c1',
      instanceid: 'mock_i1',
      amount: 1,
      name: 'AWP | Asiimov',
      market_hash_name: 'AWP | Asiimov (Field-Tested)',
      icon_url: 'http://cdn.steamcommunity.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0nPbmPLTQqWgu5Mx2gv3--Y3nj1h84kI_Y270LdecIQc8YQvTrFm9x-e9g5606Z_MnCRj7yQk7XfVmQv3308XJ_-s1A',
      tradable: true,
      marketable: true
    },
    {
      assetid: 'mock_2',
      classid: 'mock_c2',
      instanceid: 'mock_i2',
      amount: 1,
      name: 'AK-47 | Redline',
      market_hash_name: 'AK-47 | Redline (Field-Tested)',
      icon_url: 'http://cdn.steamcommunity.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV092lnYmGmOHLPr7Vn35cpsB3j-qUpsWk3lHl-hA4MW-hJI6QdgM8YVHQq1G8k-zuhp_utczIn3FjvyQ8pSGKgwjW4QA',
      tradable: true,
      marketable: true
    },
    {
      assetid: 'mock_3',
      classid: 'mock_c3',
      instanceid: 'mock_i3',
      amount: 1,
      name: 'M4A4 | Howl',
      market_hash_name: 'M4A4 | Howl (Factory New)',
      icon_url: 'http://cdn.steamcommunity.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhjxszFJTwW09izh4-DlP7jJ7bmhCgu5Mx2gv3--Y3nj1h84kY5Z2DydoaXIFI9Mg7V_1S2yO_m1pS6vZrAm3I26Scj7y7VmQv330_1s_Av_g',
      tradable: true,
      marketable: true
    },
    {
      assetid: 'mock_4',
      classid: 'mock_c4',
      instanceid: 'mock_i4',
      amount: 1,
      name: 'Karambit | Doppler',
      market_hash_name: 'Karambit | Doppler (Factory New)',
      icon_url: 'http://cdn.steamcommunity.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLacDBA5ciJl5W0nPb4J4Tdn2xZ_Ish0rDA99Wk0QGx_xBvYGj2ctCccQI9ZlqC_VA6x-u618O8vM6bn3J9-n1069Xv85E',
      tradable: true,
      marketable: true
    },
    {
      assetid: 'mock_5',
      classid: 'mock_c5',
      instanceid: 'mock_i5',
      amount: 1,
      name: 'Glock-18 | Fade',
      market_hash_name: 'Glock-18 | Fade (Factory New)',
      icon_url: 'http://cdn.steamcommunity.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxf0v73efTH9X7t5460h_n1N77UqWdY781lxO2S84jw3wW1-EFrYmD7d9KUIQA2aVGE_VPrw-3vgpW7v57PyCZh6yQk4H6Mzhzjg01Fbew7jg',
      tradable: true,
      marketable: true
    }
  ];
}


// Простая проверка аутентификации
function ensureAuthenticated(req, res) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: 'Not authenticated' });
    return false;
  }
  return true;
}

/**
 * Получение инвентаря CS2 пользователя
 */
router.get('/cs2/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const { forceRefresh = false } = req.query;

    // Use key from env or fallback
    const apiKey = process.env.STEAM_API_KEY || 'E1FC69B3707FF57C6267322B0271A86B';


    // Ключ для кеширования в Redis
    const cacheKey = `inventory:cs2:${steamId}`;

    // Пытаемся получить из кеша (если не forceRefresh)
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    // Получаем реальный инвентарь из Steam
    const inventory = await fetchInventoryRaw(steamId, '730', '2');

    // Handle bubble-up error for Ghost Inventory
    if (inventory && inventory.error === 'GHOST_INVENTORY') {
      return res.status(503).json({
        success: false,
        error: 'GHOST_INVENTORY',
        message: 'Steam Inventory is syncing (Ghost Status). Please wait 10-15 minutes.'
      });
    }

    // Обрабатываем предметы
    const processedItems = inventory.map(item => ({
      assetid: item.assetid,
      classid: item.classid,
      instanceid: item.instanceid,
      amount: item.amount,
      pos: item.pos,
      name: item.name,
      market_name: item.market_name,
      market_hash_name: item.market_hash_name,
      icon_url: item.icon_url,
      icon_url_large: item.icon_url_large,
      tradable: item.tradable,
      marketable: item.marketable,
      commodity: item.commodity,
      market_tradable_restriction: item.market_tradable_restriction,
      fraudwarnings: item.fraudwarnings,
      descriptions: item.descriptions,
      actions: item.actions,
      market_actions: item.market_actions,
      tags: item.tags,
      appid: item.appid,
      contextid: item.contextid
    }));

    // Сохраняем в кеш на 5 минут
    cache.set(cacheKey, {
      success: true,
      steamId,
      appId: 730,
      count: processedItems.length,
      items: processedItems
    });

    // Отправляем ответ
    res.json({
      success: true,
      steamId,
      appId: 730,
      count: processedItems.length,
      items: processedItems
    });

  } catch (error) {
    console.error('Inventory fetch error:', error);

    // Проверяем специфичные ошибки Steam API
    if (error.message.includes('429')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to Steam API. Please try again later.'
      });
    }

    if (error.message.includes('403')) {
      return res.status(403).json({
        error: 'Inventory private',
        message: 'This inventory is set to private. Please set your Steam profile to public.'
      });
    }

    res.status(500).json({
      error: 'Failed to fetch inventory',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Получение инвентаря CS2 текущего пользователя (из сессии)
router.get('/cs2', async (req, res) => {
  console.log('🔥 [DEBUG] GET /inventory/cs2 hit!', req.query, req.user);
  try {
    const steamId = (req.user && req.user.steamId) || req.query.steamid;
    if (!steamId) {
      return res.status(400).json({ error: 'steamid required' });
    }
    req.params.steamId = steamId;
    const { forceRefresh = false } = req.query;
    req.query.forceRefresh = forceRefresh;
    const items = await fetchInventoryRaw(steamId, '730', '2');
    const processedItems = items;
    const responseBody = {
      success: true,
      steamId,
      appId: 730,
      count: processedItems.length,
      items: processedItems
    };
    res.json(responseBody);
  } catch (error) {
    console.error('Inventory (session) fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory', message: error.message });
  }
});

// Получение инвентаря Dota 2 по SteamID
router.get('/dota/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const { forceRefresh = false } = req.query;

    if (!process.env.STEAM_API_KEY) {
      return res.status(500).json({
        error: 'Steam API key not configured',
        message: 'Please set STEAM_API_KEY in .env file'
      });
    }

    const cacheKey = `inventory:dota:${steamId}`;
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    const inventory = await fetchInventoryRaw(steamId, '570', '2');

    const processedItems = inventory.map(item => ({
      assetid: item.assetid,
      classid: item.classid,
      instanceid: item.instanceid,
      amount: item.amount,
      pos: item.pos,
      name: item.name,
      market_name: item.market_name,
      market_hash_name: item.market_hash_name,
      icon_url: item.icon_url,
      icon_url_large: item.icon_url_large,
      tradable: item.tradable,
      marketable: item.marketable,
      commodity: item.commodity,
      market_tradable_restriction: item.market_tradable_restriction,
      fraudwarnings: item.fraudwarnings,
      descriptions: item.descriptions,
      actions: item.actions,
      market_actions: item.market_actions,
      tags: item.tags,
      appid: item.appid,
      contextid: item.contextid
    }));

    const responseBody = {
      success: true,
      steamId,
      appId: 570,
      count: processedItems.length,
      items: processedItems
    };
    cache.set(cacheKey, responseBody);
    res.json(responseBody);

  } catch (error) {
    console.error('Dota inventory fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch inventory',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Получение инвентаря Dota 2 для текущего пользователя
router.get('/dota', async (req, res) => {
  try {
    const steamId = (req.user && req.user.steamId) || req.query.steamid;
    if (!steamId) {
      return res.status(400).json({ error: 'steamid required' });
    }
    const items = await fetchInventoryRaw(steamId, '570', '2');
    const responseBody = {
      success: true,
      steamId,
      appId: 570,
      count: items.length,
      items
    };
    res.json(responseBody);
  } catch (error) {
    console.error('Inventory (session) fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory', message: error.message });
  }
});

/**
 * Тестовая команда для вывода скинов (как просил друг)
 */
router.get('/test/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;

    // Получаем инвентарь
    const inventory = await fetchInventoryRaw(steamId, '730', '2');

    // Выводим простой список скинов
    const skins = inventory.map(item => ({
      name: item.name,
      market_hash_name: item.market_hash_name,
      tradable: item.tradable,
      icon: item.icon_url
    }));

    console.log('=== CS2 Inventory Test ===');
    console.log(`SteamID: ${steamId}`);
    console.log(`Total items: ${skins.length}`);
    console.log('Items:');
    skins.forEach((skin, index) => {
      console.log(`${index + 1}. ${skin.name} (Tradable: ${skin.tradable})`);
    });

    res.json({
      message: 'Check server console for inventory details',
      count: skins.length,
      steamId: steamId
    });

  } catch (error) {
    console.error('Test command error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Получение конкретного предмета по assetid
 */
router.get('/item/:steamId/:assetId', async (req, res) => {
  try {
    if (!ensureAuthenticated(req, res)) return;
    const { steamId, assetId } = req.params;
    const { appid = '730', contextid = '2' } = req.query;

    // Используем прямой запрос к Steam API для конкретного предмета
    const response = await axios.get(
      `https://steamcommunity.com/inventory/${steamId}/${appid}/${contextid}`,
      {
        params: {
          l: 'english',
          count: 5000
        }
      }
    );

    // Ищем предмет по assetid
    const asset = response.data.assets?.find(a => a.assetid === assetId);
    if (!asset) {
      return res.status(404).json({ error: 'Item not found in inventory' });
    }

    // Находим описание предмета
    const description = response.data.descriptions?.find(
      d => d.classid === asset.classid && d.instanceid === asset.instanceid
    );

    const item = {
      ...asset,
      ...description,
      icon_url: description.icon_url
    };

    res.json({ success: true, item });

  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get item price (Real Market Data + Smart Valuation)
 */
router.post('/price', async (req, res) => {
  try {
    const { name, stickers, float } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { priceEngine } = require('../services/price-engine.service');

    // 1. Get Base Market Price
    const priceData = await priceEngine.getPrice(name);

    // 2. Calculate Smart Price if details provided
    let smartValuation = null;
    if (priceData && priceData.suggested) {
      smartValuation = priceEngine.calculateSmartPrice(priceData.suggested, {
        stickers: stickers || [],
        float: float ? Number(float) : null
      });
    }

    res.json({
      success: true,
      data: {
        ...priceData,
        smartValuation
      }
    });

  } catch (err) {
    console.error('Price fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
