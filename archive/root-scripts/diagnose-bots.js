#!/usr/bin/env node

/**
 * Steam Bot Diagnostics and Fix Script
 * Diagnoses and fixes issues with Steam bot connectivity and notifications
 */

const { botManager } = require('./src/services/bot-manager.service');
const { sessionService } = require('./src/services/bot-session.service');
const { query } = require('./src/config/database');
const SteamBot = require('./src/services/steam-bot.service');

console.log('🔧 Steam Bot Diagnostics and Fix Script');
console.log('=======================================');

async function diagnoseAndFix() {
    try {
        console.log('🔍 1. Checking environment variables...');

        // Check critical environment variables
        const requiredVars = [
            'STEAM_API_KEY',
            'STEAM_BOT_1_USERNAME',
            'STEAM_BOT_1_PASSWORD',
            'STEAM_BOT_1_SHARED_SECRET',
            'STEAM_BOT_1_IDENTITY_SECRET',
            'STEAM_BOT_1_STEAM_ID'
        ];

        const missingVars = [];
        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                missingVars.push(varName);
            }
        }

        if (missingVars.length > 0) {
            console.error('❌ Missing required environment variables:');
            missingVars.forEach(varName => console.error(`   - ${varName}`));
            console.log('   Please check your .env file');
            return;
        }

        console.log('✅ All required environment variables are set');

        console.log('🔍 2. Checking database connectivity...');
        try {
            const result = await query('SELECT NOW()');
            console.log('✅ Database connection successful');
        } catch (err) {
            console.error('❌ Database connection failed:', err.message);
            return;
        }

        console.log('🔍 3. Checking Redis connectivity...');
        try {
            const session = await sessionService.getSession(process.env.STEAM_BOT_1_USERNAME);
            if (session) {
                console.log('✅ Redis connection successful, session found');
            } else {
                console.log('✅ Redis connection successful, no session found');
            }
        } catch (err) {
            console.error('❌ Redis connection failed:', err.message);
            return;
        }

        console.log('🔍 4. Testing Steam bot configuration...');

        // Create test bot instance
        const testBotConfig = {
            accountName: process.env.STEAM_BOT_1_USERNAME,
            password: process.env.STEAM_BOT_1_PASSWORD,
            sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET,
            identitySecret: process.env.STEAM_BOT_1_IDENTITY_SECRET,
            steamId: process.env.STEAM_BOT_1_STEAM_ID,
        };

        const testBot = new SteamBot(testBotConfig);

        console.log('🔍 5. Testing bot session restore...');

        try {
            // Test session restore
            const restored = await testBot.restoreSession();
            if (restored) {
                console.log('✅ Bot session restored successfully');
                console.log('✅ Bot should be online in Steam');
            } else {
                console.log('⚠️ No saved session found, bot will need to login');
            }

            // Test 2FA code generation
            const SteamTotp = require('steam-totp');
            const authCode = SteamTotp.generateAuthCode(testBotConfig.sharedSecret);
            if (authCode) {
                console.log('✅ 2FA code generation working');
            } else {
                console.error('❌ 2FA code generation failed');
            }

        } catch (err) {
            console.error('❌ Bot configuration test failed:', err.message);
        }

        console.log('🔍 6. Checking WebSocket notification system...');

        try {
            const { getWsNotificationService } = require('./src/services/ws-notifier');
            const wsService = getWsNotificationService();

            if (wsService) {
                console.log('✅ WebSocket notification service is available');
            } else {
                console.log('⚠️ WebSocket notification service not initialized');
                console.log('   This means server.js may not have started properly');
            }

            // Test notification function
            if (wsService && wsService.notifyTradeUpdate) {
                try {
                    await wsService.notifyTradeUpdate('test_steam_id', {
                        type: 'test',
                        message: 'Test notification'
                    });
                    console.log('✅ WebSocket notification function working');
                } catch (err) {
                    console.error('⚠️ WebSocket notification test failed:', err.message);
                }
            }

        } catch (err) {
            console.error('❌ WebSocket notification check failed:', err.message);
        }

        console.log('🔍 7. Checking bot database records...');

        try {
            const botRes = await query(
                'SELECT * FROM bots WHERE steam_id = $1',
                [testBotConfig.steamId]
            );

            if (botRes.rows.length > 0) {
                const bot = botRes.rows[0];
                console.log(`✅ Bot record found in database:`);
                console.log(`   - Name: ${bot.account_name}`);
                console.log(`   - Status: ${bot.status}`);
                console.log(`   - Steam ID: ${bot.steam_id}`);
                console.log(`   - Last online: ${bot.last_online_at}`);
            } else {
                console.log('⚠️ Bot record not found in database');
                console.log('   Creating bot record...');

                await query(`
                    INSERT INTO bots (
                        steam_id, account_name, display_name, status, trade_url,
                        shared_secret_encrypted, identity_secret_encrypted,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, 'offline', $4, $5, $6, NOW(), NOW())
                `, [
                    testBotConfig.steamId,
                    testBotConfig.accountName,
                    testBotConfig.accountName,
                    null, // trade_url
                    null, // shared_secret_encrypted
                    null  // identity_secret_encrypted
                ]);

                console.log('✅ Bot record created successfully');
            }

        } catch (err) {
            console.error('❌ Database bot check failed:', err.message);
        }

        console.log('🔍 8. Testing bot login simulation...');

        try {
            console.log('   Attempting to restore session...');

            // Test if we can restore session
            const session = await sessionService.getSession(testBotConfig.accountName);
            if (session) {
                console.log('✅ Session available, bot should be online');
            } else {
                console.log('⚠️ No session available, bot needs to login');
                console.log('   This may cause the "bot in offline" issue in Steam');
            }

        } catch (err) {
            console.error('❌ Bot login test failed:', err.message);
        }

        console.log('');
        console.log('📋 DIAGNOSIS SUMMARY:');
        console.log('====================');

        // Check for common issues
        const issues = [];

        // Check if session exists
        try {
            const session = await sessionService.getSession(testBotConfig.accountName);
            if (!session) {
                issues.push('❌ Bot session not found - bot will be offline in Steam');
                issues.push('   Solution: Start the bot to create a session');
            }
        } catch (err) {
            issues.push('❌ Cannot check bot session - Redis issue');
        }

        // Check WebSocket service
        try {
            const { getWsNotificationService } = require('./src/services/ws-notifier');
            const wsService = getWsNotificationService();
            if (!wsService) {
                issues.push('❌ WebSocket notification service not initialized');
                issues.push('   Solution: Ensure server.js starts properly');
            }
        } catch (err) {
            issues.push('❌ Cannot check WebSocket service');
        }

        // Check bot database record
        try {
            const botRes = await query(
                'SELECT * FROM bots WHERE steam_id = $1',
                [testBotConfig.steamId]
            );
            if (botRes.rows.length === 0) {
                issues.push('❌ Bot record missing from database');
                issues.push('   Solution: Bot records will be created automatically');
            }
        } catch (err) {
            issues.push('❌ Cannot check bot database record');
        }

        if (issues.length === 0) {
            console.log('✅ No critical issues found');
            console.log('✅ Bot system should be working correctly');
        } else {
            console.log('⚠️ Issues found:');
            issues.forEach(issue => console.log(`   ${issue}`));
        }

        console.log('');
        console.log('🔧 SUGGESTED FIXES:');
        console.log('==================');

        console.log('1. Start the trading system:');
        console.log('   npm run start (or your startup script)');
        console.log('');
        console.log('2. If bots are still offline:');
        console.log('   - Check Steam Guard settings on bot accounts');
        console.log('   - Ensure shared_secret and identity_secret are correct');
        console.log('   - Verify Steam API key is working');
        console.log('');
        console.log('3. If notifications still not working:');
        console.log('   - Check WebSocket CORS configuration');
        console.log('   - Verify frontend is connecting to WebSocket endpoint');
        console.log('   - Check browser console for WebSocket errors');

    } catch (err) {
        console.error('❌ Diagnostic script failed:', err.message);
        console.error(err.stack);
    }
}

// Run the diagnostic
diagnoseAndFix();