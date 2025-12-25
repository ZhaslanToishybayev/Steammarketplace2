/**
 * Bot Configuration and Initialization
 * Loads bot credentials from environment and starts the bot pool
 */

require('dotenv').config();
const { botManager } = require('../services/bot-manager.service');

// Bot credentials from environment
const BOT_CONFIGS = [];

// Load Bot 1 from environment
if (process.env.STEAM_BOT_1_USERNAME && process.env.STEAM_BOT_1_PASSWORD) {
    BOT_CONFIGS.push({
        accountName: process.env.STEAM_BOT_1_USERNAME,
        password: process.env.STEAM_BOT_1_PASSWORD,
        sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET,
        identitySecret: process.env.STEAM_BOT_1_IDENTITY_SECRET,
        steamId: process.env.STEAM_BOT_1_STEAM_ID,
    });
}

// Load Bot 2 if configured
if (process.env.STEAM_BOT_2_USERNAME && process.env.STEAM_BOT_2_PASSWORD) {
    BOT_CONFIGS.push({
        accountName: process.env.STEAM_BOT_2_USERNAME,
        password: process.env.STEAM_BOT_2_PASSWORD,
        sharedSecret: process.env.STEAM_BOT_2_SHARED_SECRET,
        identitySecret: process.env.STEAM_BOT_2_IDENTITY_SECRET,
        steamId: process.env.STEAM_BOT_2_STEAM_ID,
    });
}

/**
 * Initialize all configured bots
 */
async function initializeBots() {
    if (BOT_CONFIGS.length === 0) {
        console.log('⚠️ No Steam bots configured. Add STEAM_BOT_1_* variables to .env');
        return { success: false, message: 'No bots configured' };
    }

    console.log(`🤖 Initializing ${BOT_CONFIGS.length} Steam bot(s)...`);

    // Add bots to manager
    for (const config of BOT_CONFIGS) {
        console.log(`  ➕ Adding bot: ${config.accountName}`);
        botManager.addBot(config);
    }

    // Start all bots
    try {
        const results = await botManager.startAll();

        const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
        const failed = results.length - successful;

        if (successful > 0) {
            console.log(`✅ ${successful} bot(s) started successfully`);
        }
        if (failed > 0) {
            console.log(`❌ ${failed} bot(s) failed to start`);
        }

        // Log bot statuses
        const stats = botManager.getStatistics();
        console.log(`📊 Bot Pool: ${stats.onlineBots}/${stats.totalBots} online`);

        return {
            success: successful > 0,
            online: stats.onlineBots,
            total: stats.totalBots,
            results
        };
    } catch (err) {
        console.error('❌ Failed to start bots:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Shutdown all bots gracefully
 */
function shutdownBots() {
    console.log('🛑 Shutting down bots...');
    botManager.stopAll();
}

// Handle process termination
process.on('SIGINT', shutdownBots);
process.on('SIGTERM', shutdownBots);

module.exports = {
    initializeBots,
    shutdownBots,
    botManager,
    BOT_CONFIGS,
};
