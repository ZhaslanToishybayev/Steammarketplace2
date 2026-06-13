/**
 * Real Trade Test Script
 * Sends an actual trade offer to verify bot functionality
 */

require('dotenv').config();
const { initializeBots, botManager } = require('./src/config/bots.config');

const TEST_TRADE_URL = 'https://steamcommunity.com/tradeoffer/new/?partner=1297221726&token=QTf6ymsX';

async function sendRealTrade() {
    console.log('=== REAL TRADE TEST ===\n');

    // 1. Initialize bots
    console.log('1. Initializing bots...');
    const initResult = await initializeBots();
    if (!initResult.success) {
        console.error(`❌ Failed to initialize: ${initResult.message || initResult.error}`);
        process.exit(1);
    }
    console.log(`✅ Bots: ${initResult.online}/${initResult.total} online\n`);

    // Wait for full initialization
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. Get bot
    console.log('2. Getting available bot...');
    const bot = botManager.getAvailableBot();
    if (!bot) {
        console.error('❌ No bot available');
        process.exit(1);
    }
    console.log(`✅ Using bot: ${bot.config?.accountName}\n`);

    // 3. Get bot's inventory (to send one item)
    console.log('3. Fetching bot inventory...');
    let botItems = [];
    try {
        botItems = await bot.getInventory(730, 2); // CS2
        console.log(`✅ Bot has ${botItems.length} items\n`);
    } catch (err) {
        console.error(`❌ Failed to get inventory: ${err.message}`);
        process.exit(1);
    }

    if (botItems.length === 0) {
        console.log('⚠️ Bot has no items to send. Sending empty offer (connection test)...\n');
    }

    // 4. Send trade offer
    console.log('4. Sending trade offer...');
    console.log(`   Target: ${TEST_TRADE_URL.substring(0, 60)}...`);

    try {
        // Choose first item to send (if any)
        const itemsToGive = botItems.length > 0 ? [{
            assetId: botItems[0].assetid || botItems[0].id,
            appId: 730,
            contextId: '2',
        }] : [];

        if (itemsToGive.length > 0) {
            console.log(`   Sending item: ${botItems[0].name || botItems[0].market_hash_name}`);
        } else {
            console.log('   Sending empty offer (connection test only)');
        }

        const offerId = await bot.sendTradeOffer({
            partnerTradeUrl: TEST_TRADE_URL,
            itemsToGive: itemsToGive,
            itemsToReceive: [],
            message: '[TEST] Steam Marketplace Bot - Trade System Test',
        });

        console.log(`\n✅ SUCCESS! Trade offer sent!`);
        console.log(`   Offer ID: ${offerId}`);
        console.log(`   Check your Steam: https://steamcommunity.com/tradeoffer/${offerId}/`);

    } catch (err) {
        console.error(`\n❌ FAILED to send trade offer:`);
        console.error(`   Error: ${err.message}`);

        if (err.message.includes('rate limit')) {
            console.log('   Steam is rate limiting. Wait a few minutes.');
        } else if (err.message.includes('access')) {
            console.log('   Check if trade URL is valid and profile is public.');
        } else if (err.message.includes('API')) {
            console.log('   Steam API issue. Check STEAM_API_KEY.');
        }
    }

    console.log('\n=== TEST COMPLETE ===');
    process.exit(0);
}

sendRealTrade().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
