#!/usr/bin/env node

/**
 * Steam Bot Connection Test
 * Tests if bots can connect to Steam and send notifications
 */

require('dotenv').config();

const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamTotp = require('steam-totp');

console.log('🤖 Steam Bot Connection Test');
console.log('=============================');

async function testBotConnection() {
    try {
        // Bot configuration from environment
        const botConfig = {
            accountName: process.env.STEAM_BOT_1_USERNAME,
            password: process.env.STEAM_BOT_1_PASSWORD,
            sharedSecret: process.env.STEAM_BOT_1_SHARED_SECRET,
            identitySecret: process.env.STEAM_BOT_1_IDENTITY_SECRET,
            steamId: process.env.STEAM_BOT_1_STEAM_ID,
        };

        if (!botConfig.accountName || !botConfig.password) {
            console.error('❌ Bot credentials not configured in environment');
            console.log('   Please set STEAM_BOT_1_USERNAME and STEAM_BOT_1_PASSWORD');
            return;
        }

        console.log(`🔍 Testing bot: ${botConfig.accountName}`);
        console.log(`   SteamID: ${botConfig.steamId || 'Not set'}`);

        // Initialize Steam services
        const community = new SteamCommunity();
        const manager = new TradeOfferManager({
            community: community,
            language: 'en',
            pollInterval: 10000,
            cancelTime: 600000,
            domain: 'localhost',
            apiKey: process.env.STEAM_API_KEY,
        });

        console.log('🔄 Attempting to login to Steam...');

        // Generate 2FA code
        const twoFactorCode = SteamTotp.generateAuthCode(botConfig.sharedSecret);
        console.log(`   2FA Code: ${twoFactorCode}`);

        return new Promise((resolve, reject) => {
            community.login({
                accountName: botConfig.accountName,
                password: botConfig.password,
                twoFactorCode: twoFactorCode
            }, async (err, sessionID, cookies) => {
                if (err) {
                    console.error('❌ Steam login failed:', err.message);
                    console.log('');
                    console.log('💡 Common issues:');
                    console.log('   - Incorrect username/password');
                    console.log('   - Wrong shared_secret');
                    console.log('   - Steam Guard email not confirmed');
                    console.log('   - Account locked or banned');
                    console.log('   - Rate limiting');
                    resolve(false);
                    return;
                }

                console.log('✅ Steam login successful!');

                // Set cookies for trade manager
                manager.setCookies(cookies, (err) => {
                    if (err) {
                        console.error('❌ Failed to set cookies:', err.message);
                        resolve(false);
                        return;
                    }

                    console.log('✅ Trade manager initialized');

                    // Test sending a message (Steam notification)
                    try {
                        const testSteamId = botConfig.steamId || '76561198012345678'; // Use self or test account

                        community.chatMessage(testSteamId, '🧪 Test notification from Steam Bot Connection Test', (err) => {
                            if (err) {
                                console.error('❌ Failed to send test message:', err.message);
                                console.log('   This may be due to:');
                                console.log('   - Privacy settings on the target account');
                                console.log('   - Account not friends with bot');
                                console.log('   - Account offline or restricted');
                            } else {
                                console.log('✅ Test message sent successfully');
                            }

                            // Test trade offer creation
                            try {
                                const offer = manager.createOffer(testSteamId);
                                console.log('✅ Trade offer manager working');
                            } catch (err) {
                                console.error('❌ Trade offer manager error:', err.message);
                            }

                            resolve(true);
                        });

                    } catch (err) {
                        console.error('❌ Message sending failed:', err.message);
                        resolve(false);
                    }
                });
            });
        });

    } catch (err) {
        console.error('❌ Bot connection test failed:', err.message);
        return false;
    }
}

async function testSteamAPI() {
    console.log('🌐 Testing Steam Web API...');
    try {
        const SteamAPI = require('steam-web-api');
        const steamAPI = new SteamAPI(process.env.STEAM_API_KEY);

        // Test API key
        const result = await steamAPI.getPlayerSummaries('76561198012345678');
        console.log('✅ Steam API key is working');
        return true;
    } catch (err) {
        console.error('❌ Steam API test failed:', err.message);
        console.log('   Please check your STEAM_API_KEY');
        return false;
    }
}

async function main() {
    console.log('');

    // Test Steam API first
    const apiWorking = await testSteamAPI();
    console.log('');

    // Test bot connection
    const botWorking = await testBotConnection();

    console.log('');
    console.log('📋 Test Results:');
    console.log('================');
    console.log(`Steam API: ${apiWorking ? '✅ Working' : '❌ Failed'}`);
    console.log(`Bot Connection: ${botWorking ? '✅ Working' : '❌ Failed'}`);

    if (apiWorking && botWorking) {
        console.log('');
        console.log('🎉 All tests passed! Bots should work correctly.');
        console.log('🚀 You can now start the trading system with:');
        console.log('   ./start-real-bot-mode.sh');
    } else {
        console.log('');
        console.log('⚠️ Some tests failed. Please check:');
        if (!apiWorking) {
            console.log('   - STEAM_API_KEY is correct');
        }
        if (!botWorking) {
            console.log('   - Bot credentials are correct');
            console.log('   - Steam Guard settings');
            console.log('   - Account status and restrictions');
        }
    }
}

main().catch(console.error);