/**
 * Steam API Mocks for testing
 * Мокирует Steam Community API endpoints для тестирования
 */

const nock = require('nock');

// Настройка nock
nock.disableNetConnect();
nock.enableNetConnect('localhost');

/**
 * Мок Steam inventory API
 * @param {string} steamId - Steam ID пользователя
 * @param {number} appId - App ID игры (730 для CS2)
 * @param {Array} items - Массив предметов в инвентаре
 */
const mockSteamInventory = (steamId, appId, items = []) => {
  const scope = nock('https://steamcommunity.com')
    .get(`/inventory/${steamId}/${appId}/2`)
    .query({ l: 'english', count: 5000 })
    .reply(200, {
      success: true,
      assets: items.map((item, index) => ({
        assetid: item.assetId || `asset_${index}`,
        classid: item.classId || '730_1',
        instanceid: item.instanceId || '0',
        amount: item.amount || 1
      })),
      descriptions: items.map((item, index) => ({
        classid: item.classId || '730_1',
        instanceid: item.instanceId || '0',
        name: item.name || 'AK-47 | Redline (Field-Tested)',
        market_name: item.marketName || 'AK-47 | Redline (Field-Tested)',
        type: item.type || 'Rifle',
        icon_url: item.iconUrl || 'fCEeWS/HA1Z28/k8x9WaD/V3V/6gxJ/E1UW/1',
        tradable: item.tradable || 1,
        marketable: item.marketable || 1,
        tags: item.tags || [
          {
            category: 'Exterior',
            internal_name: 'WearCategory2',
            localized_name: 'Field-Tested',
            color: '5e98d9'
          },
          {
            category: 'Rarity',
            internal_name: 'Rifle',
            localized_name: 'Classified',
            color: 'eb4b4b'
          }
        ]
      }))
    });

  return scope;
};

/**
 * Мок Steam market price API
 * @param {string} itemName - Название предмета
 * @param {Object} price - Цена {lowest, volume}
 */
const mockMarketPrice = (itemName, price = { lowest: '10.00', volume: 100 }) => {
  const scope = nock('https://steamcommunity.com')
    .get('/market/priceoverview')
    .query({
      appid: 730,
      currency: 5,
      item_nameid: '12345',
      market_hash_name: encodeURIComponent(itemName)
    })
    .reply(200, {
      success: true,
      lowest_price: `$${price.lowest}`,
      volume: price.volume.toString(),
      median_price: `$${(parseFloat(price.lowest) * 0.9).toFixed(2)}`
    });

  return scope;
};

/**
 * Мок для получения item_nameid
 */
const mockItemNameId = (itemName, nameId = '12345') => {
  const scope = nock('https://steamcommunity.com')
    .get('/market/search/render/')
    .query({
      query: itemName,
      start: 0,
      count: 1,
      search_descriptions: 0,
      sort_column: 'popular',
      sort_dir: 'desc',
      appid: 730,
      norender: 1
    })
    .reply(200, {
      success: true,
      results_html: '',
      total_count: 1,
      start: 0,
      count: 1,
      results: [
        {
          name: itemName,
          hash_name: itemName.replace(/\s+/g, '_'),
          nameid: nameId
        }
      ]
    });

  return scope;
};

/**
 * Мок Steam profile API
 * @param {string} steamId - Steam ID
 * @param {Object} profile - Данные профиля
 */
const mockSteamProfile = (steamId, profile = {}) => {
  const scope = nock('https://steamcommunity.com')
    .get(`/profiles/${steamId}/`)
    .query({ xml: 1 })
    .reply(200, `
      <?xml version="1.0" encoding="UTF-8" ?>
      <response>
        <steamID64>${steamId}</steamID64>
        <steamID>TestUser</steamID>
        <avatar>https://example.com/avatar.jpg</avatar>
        <avatarMedium>https://example.com/avatar_medium.jpg</avatar>
        <avatarFull>https://example.com/avatar_full.jpg</avatar>
        <profileURL>https://steamcommunity.com/profiles/${steamId}</profileURL>
      </response>
    `);

  return scope;
};

/**
 * Мок Steam API с ошибкой
 * @param {string} steamId - Steam ID
 * @param {number} appId - App ID
 * @param {number} statusCode - HTTP статус код
 */
const mockSteamApiError = (steamId, appId, statusCode = 500) => {
  const scope = nock('https://steamcommunity.com')
    .get(`/inventory/${steamId}/${appId}/2`)
    .query({ l: 'english', count: 5000 })
    .reply(statusCode, {
      success: false,
      Error: 'Internal server error'
    });

  return scope;
};

/**
 * Очистка всех моков
 */
const cleanup = () => {
  nock.cleanAll();
};

/**
 * Проверка, что все моки были вызваны
 */
const isDone = () => {
  return nock.isDone();
};

module.exports = {
  mockSteamInventory,
  mockMarketPrice,
  mockItemNameId,
  mockSteamProfile,
  mockSteamApiError,
  cleanup,
  isDone
};
