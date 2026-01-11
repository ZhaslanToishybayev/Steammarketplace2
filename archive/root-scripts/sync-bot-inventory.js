#!/usr/bin/env node
/**
 * Sync Bot Inventory to Database
 * Fetches real items from Steam bot and creates listings
 */

require('dotenv').config();
const axios = require('axios');
const { query } = require('./src/config/database');

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const BOT_STEAM_ID = '76561198782060203';
const BOT_TRADE_URL = 'https://steamcommunity.com/tradeoffer/new/?partner=821794475&token=YOUR_TOKEN';

async function getBotInventory(steamId, appId = '730') {
  try {
    console.log(`📦 Fetching inventory for bot ${steamId}...`);
    
    // Use Steam Community API to get inventory
    const url = `https://steamcommunity.com/inventory/${steamId}/${appId}/2?l=english&count=100`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    if (!response.data || !response.data.assets) {
      console.log('❌ No inventory data returned');
      return [];
    }

    const { assets, descriptions } = response.data;
    
    // Map assets to descriptions
    const items = assets.map(asset => {
      const desc = descriptions.find(d => 
        d.classid === asset.classid && d.instanceid === asset.instanceid
      );
      
      if (!desc) return null;
      
      return {
        assetid: asset.assetid,
        classid: asset.classid,
        instanceid: asset.instanceid,
        amount: asset.amount,
        name: desc.name,
        market_hash_name: desc.market_hash_name,
        type: desc.type,
        icon_url: desc.icon_url,
        tradable: desc.tradable ? 1 : 0,
        marketable: desc.marketable ? 1 : 0,
        commodity: desc.commodity ? 1 : 0,
        tags: desc.tags || []
      };
    }).filter(item => item !== null && item.tradable && item.marketable);

    console.log(`✅ Found ${items.length} tradable items`);
    return items;
    
  } catch (error) {
    console.error('❌ Error fetching inventory:', error.message);
    if (error.response?.status === 403) {
      console.log('💡 Profile might be private. Make sure bot profile is public.');
    }
    return [];
  }
}

async function getPriceEstimate(marketHashName) {
  try {
    // Use Steam market API for price
    const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=1&market_hash_name=${encodeURIComponent(marketHashName)}`;
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data && response.data.median_price) {
      // Parse price like "$12.34"
      const priceStr = response.data.median_price.replace(/[^0-9.]/g, '');
      return parseFloat(priceStr) || 0;
    }
    
    return 0;
  } catch (error) {
    // If price fetch fails, return 0 (will be updated later)
    return 0;
  }
}

async function clearOldListings() {
  console.log('🗑️  Removing old fake listings...');
  await query("DELETE FROM listings WHERE seller_steam_id = $1", [BOT_STEAM_ID]);
  console.log('✅ Old listings removed');
}

async function createListingsFromInventory(items) {
  console.log(`📝 Creating listings for ${items.length} items...`);
  
  let created = 0;
  let skipped = 0;
  
  for (const item of items) {
    try {
      // Get price estimate (with rate limiting)
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 sec delay
      const price = await getPriceEstimate(item.market_hash_name);
      
      if (price === 0) {
        console.log(`⚠️  Skipping ${item.name} - no price data`);
        skipped++;
        continue;
      }

      // Extract rarity from tags
      const rarityTag = item.tags.find(t => t.category === 'Rarity');
      const rarity = rarityTag ? rarityTag.localized_tag_name : null;
      
      // Extract exterior from tags  
      const exteriorTag = item.tags.find(t => t.category === 'Exterior');
      const exterior = exteriorTag ? exteriorTag.localized_tag_name : null;

      await query(`
        INSERT INTO listings (
          seller_steam_id, seller_trade_url, item_asset_id, item_class_id, 
          item_instance_id, item_name, item_market_hash_name, item_app_id,
          item_context_id, item_icon_url, item_rarity, item_exterior,
          price, currency, status, listing_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        BOT_STEAM_ID,
        BOT_TRADE_URL,
        item.assetid,
        item.classid,
        item.instanceid,
        item.name,
        item.market_hash_name,
        730, // CS2
        2,   // Context ID
        item.icon_url,
        rarity,
        exterior,
        price,
        'USD',
        'active',
        'bot_sale'
      ]);
      
      console.log(`✅ Listed: ${item.name} - $${price}`);
      created++;
      
    } catch (error) {
      console.error(`❌ Failed to list ${item.name}:`, error.message);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created} listings`);
  console.log(`   Skipped: ${skipped} items (no price)`);
}

async function main() {
  try {
    console.log('🚀 Starting Bot Inventory Sync...\n');
    
    // Step 1: Clear old fake listings
    await clearOldListings();
    
    // Step 2: Get real inventory
    const items = await getBotInventory(BOT_STEAM_ID);
    
    if (items.length === 0) {
      console.log('⚠️  No items found in bot inventory');
      process.exit(0);
    }
    
    // Step 3: Create listings (limit to first 10 for testing)
    const itemsToList = items.slice(0, 10);
    await createListingsFromInventory(itemsToList);
    
    console.log('\n✅ Inventory sync completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
