require('dotenv').config({ path: 'apps/backend/.env' });
const { botManager } = require('./src/services/bot-manager.service');

// Mock configs from environment or hardcoded test credentials found in logs (if needed)
// Usually environment variables are loaded by dotenv
// But if running debug_bot_fetch.js from apps/backend, we need to ensure .env is loaded

// Add config manually if needed based on what we know (or rely on .env if path worked)
if (!process.env.STEAM_BOT_1_USERNAME) {
    // Try to peek at server logs or known creds?
    // User said we have data.
    // I will try to rely on .env being loaded.
    console.log('Attemping to load .env from absolute path...');
    require('dotenv').config({ path: '/home/zhaslan/Downloads/Telegram Desktop/Steammarketplace2-main (2)/Steammarketplace2-main/apps/backend/.env' });
}

async function run() {
    console.log('🤖 Bot Fetch Diagnostic');

    // Add bot manually from env
    if (process.env.STEAM_BOT_1_USERNAME) {
        console.log('Adding bot from ENV:', process.env.STEAM_BOT_1_USERNAME);
        botManager.addBot({
            accountName: process.env.STEAM_BOT_1_USERNAME,
            password: process.env.STEAM_BOT_1_PASSWORD,
            sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET,
            identitySecret: process.env.STEAM_BOT_1_IDENTITY_SECRET,
            steamId: process.env.STEAM_BOT_1_STEAM_ID,
        });
    }

    try {
        console.log('Starting bots...');
        // We only need one bot
        await botManager.startAll();

        const bot = botManager.getAvailableBot(); // Fixed method
        if (!bot) {
            console.log('❌ No bot available (getAvailableBot)');
            return;
        }

        console.log(`✅ Got Bot: ${bot.config.accountName} (${bot.config.steamId})`);

        // Try to fetch inventory of USER (Target)
        const targetSteamId = '76561199257487454'; // User from chat
        const appId = 730;
        const contextId = 2;

        console.log(`🔍 Fetching inventory for SELF (${targetSteamId})...`);

        const contents = await new Promise((resolve, reject) => {
            bot.manager.getUserInventoryContents(targetSteamId, appId, contextId, true, (err, inventory, currency, totalCount) => {
                if (err) return reject(err);
                resolve(inventory);
            });
        });

        console.log(`✅ Success! Found ${contents.length} items.`);

        // Log first item
        if (contents.length > 0) {
            console.log('Example item:', contents[0].market_hash_name);
        }

    } catch (e) {
        console.log('❌ Failed:', e.message);
    } finally {
        botManager.stopAll();
    }
}

run();
