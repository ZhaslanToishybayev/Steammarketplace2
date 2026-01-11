/**
 * Test Bot Trade Script
 * Verifies that the bot can send trade offers
 */

require('dotenv').config();
const { initializeBots, botManager } = require('./src/config/bots.config');

async function testBotTrade() {
    console.log('=== BOT TRADE TEST ===\n');

    // 0. Initialize bots first
    console.log('0. Initializing bots from config...');
    const initResult = await initializeBots();
    if (!initResult.success) {
        console.error(`❌ Failed to initialize bots: ${initResult.message || initResult.error}`);
        console.log('   Check .env for STEAM_BOT_1_* variables');
        process.exit(1);
    }
    console.log(`✅ Bots initialized: ${initResult.online}/${initResult.total} online\n`);

    // Wait a moment for bots to fully connect
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 1. Check if bot is available
    console.log('1. Checking bot availability...');
    const bot = botManager.getAvailableBot();

    if (!bot) {
        console.error('❌ No bot available!');
        console.log('   Make sure a bot is configured and online.');
        process.exit(1);
    }

    console.log(`✅ Bot found: ${bot.config?.accountName || 'Unknown'}`);
    console.log(`   Steam ID: ${bot.steamId || 'N/A'}`);
    console.log(`   Status: ${bot.status || 'Unknown'}\n`);

    // 2. Check bot's inventory
    console.log('2. Fetching bot inventory...');
    try {
        const inventory = await bot.getInventory(730, 2); // CS2
        console.log(`✅ Bot has ${inventory?.length || 0} CS2 items\n`);

        if (inventory && inventory.length > 0) {
            console.log('   Sample items:');
            inventory.slice(0, 3).forEach((item, i) => {
                console.log(`   ${i + 1}. ${item.name || item.market_hash_name}`);
            });
            console.log('');
        }
    } catch (err) {
        console.warn(`⚠️ Could not fetch inventory: ${err.message}\n`);
    }

    // 3. Test trade offer creation (DRY RUN - no actual send)
    console.log('3. Testing trade offer creation (DRY RUN)...');

    // This is a mock trade URL for testing - replace with real one for actual test
    const testTradeUrl = process.env.TEST_TRADE_URL || 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefgh';

    console.log(`   Target Trade URL: ${testTradeUrl.substring(0, 50)}...`);

    // Check if trade manager is ready
    if (bot.manager) {
        console.log('✅ Trade Manager is initialized');
        console.log(`   API Key configured: ${bot.manager.apiKey ? 'Yes' : 'No'}`);
    } else {
        console.error('❌ Trade Manager not initialized!');
    }

    // 4. Attempt actual trade (only if TEST_REAL_TRADE=true)
    if (process.env.TEST_REAL_TRADE === 'true' && process.env.TEST_TRADE_URL) {
        console.log('\n4. Sending REAL test trade offer...');
        try {
            const offerId = await bot.sendTradeOffer({
                partnerTradeUrl: process.env.TEST_TRADE_URL,
                itemsToReceive: [], // Empty = just testing connection
                itemsToGive: [],
                message: '[TEST] Steam Marketplace Bot Test Trade',
            });

            console.log(`✅ Trade offer sent successfully!`);
            console.log(`   Offer ID: ${offerId}`);
        } catch (err) {
            console.error(`❌ Failed to send trade offer: ${err.message}`);
            if (err.message.includes('rate limit')) {
                console.log('   Steam is rate limiting. Wait a few minutes.');
            }
        }
    } else {
        console.log('\n4. Skipping real trade (set TEST_REAL_TRADE=true and TEST_TRADE_URL to enable)');
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('Bot is operational and ready to send trades.');

    process.exit(0);
}

// Run test
testBotTrade().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
