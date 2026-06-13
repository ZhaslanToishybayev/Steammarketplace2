/**
 * Send Trade with Confirmation Debug
 * Waits for confirmation and shows detailed errors
 */

require('dotenv').config();
const { initializeBots, botManager } = require('./src/config/bots.config');
const SteamTotp = require('steam-totp');

const TEST_TRADE_URL = 'https://steamcommunity.com/tradeoffer/new/?partner=1297221726&token=QTf6ymsX';

async function sendTradeWithConfirmation() {
    console.log('=== TRADE WITH CONFIRMATION DEBUG ===\n');

    // 1. Initialize
    console.log('1. Initializing bots...');
    const initResult = await initializeBots();
    if (!initResult.success) {
        console.error(`❌ Failed: ${initResult.message}`);
        process.exit(1);
    }
    console.log(`✅ Online: ${initResult.online}/${initResult.total}\n`);

    await new Promise(r => setTimeout(r, 3000));

    // 2. Get bot
    const bot = botManager.getAvailableBot();
    if (!bot) {
        console.error('❌ No bot');
        process.exit(1);
    }

    // Check identity secret
    console.log('2. Checking Identity Secret...');
    if (!bot.config.identitySecret) {
        console.error('❌ Identity Secret NOT configured!');
        console.log('   Add STEAM_BOT_1_IDENTITY_SECRET to .env');
        process.exit(1);
    }
    console.log(`✅ Identity Secret: ${bot.config.identitySecret.substring(0, 10)}...`);

    // Test TOTP generation
    try {
        const time = SteamTotp.time();
        const confKey = SteamTotp.getConfirmationKey(bot.config.identitySecret, time, 'conf');
        console.log(`✅ TOTP Confirmation Key generated successfully\n`);
    } catch (err) {
        console.error(`❌ Failed to generate TOTP: ${err.message}`);
        process.exit(1);
    }

    // 3. Get inventory
    console.log('3. Getting inventory...');
    let items = [];
    try {
        items = await bot.getInventory(730, 2);
        console.log(`✅ Found ${items.length} items\n`);
    } catch (err) {
        console.error(`❌ Inventory error: ${err.message}`);
        process.exit(1);
    }

    if (items.length === 0) {
        console.log('⚠️ No items to send, will send empty offer\n');
    }

    // 4. Send offer with manual confirmation
    console.log('4. Creating and sending trade offer...');

    return new Promise((resolve, reject) => {
        const offer = bot.manager.createOffer(TEST_TRADE_URL);

        if (items.length > 0) {
            const item = items[0];
            console.log(`   Adding item: ${item.name || item.market_hash_name}`);
            offer.addMyItem({
                assetid: item.assetid || item.id,
                appid: 730,
                contextid: '2',
            });
        }

        offer.setMessage('[DEBUG] Steam Marketplace Trade Test');

        offer.send((err, status) => {
            if (err) {
                console.error(`❌ Send failed: ${err.message}`);
                return reject(err);
            }

            console.log(`✅ Offer created: ID=${offer.id}, Status=${status}`);

            if (status === 'pending') {
                console.log('\n5. Confirming trade offer...');

                // Manual confirmation with detailed error handling
                bot.community.acceptConfirmationForObject(
                    bot.config.identitySecret,
                    offer.id,
                    (confErr) => {
                        if (confErr) {
                            console.error(`❌ Confirmation FAILED!`);
                            console.error(`   Error: ${confErr.message}`);
                            if (confErr.message.includes('Could not find confirmation')) {
                                console.log('\n⚠️ Confirmation not found. Possible reasons:');
                                console.log('   1. Steam Guard Mobile not linked to this account');
                                console.log('   2. Identity Secret is incorrect/expired');
                                console.log('   3. Steam session expired (need re-login)');
                            }
                            reject(confErr);
                        } else {
                            console.log(`✅ TRADE CONFIRMED!`);
                            console.log(`   Offer ID: ${offer.id}`);
                            console.log(`   Link: https://steamcommunity.com/tradeoffer/${offer.id}/`);
                            resolve(offer.id);
                        }
                    }
                );
            } else if (status === 'sent') {
                console.log(`✅ Trade sent (no confirmation needed)`);
                console.log(`   Offer ID: ${offer.id}`);
                resolve(offer.id);
            } else {
                console.log(`⚠️ Unknown status: ${status}`);
                resolve(offer.id);
            }
        });
    });
}

sendTradeWithConfirmation()
    .then(offerId => {
        console.log(`\n=== SUCCESS! Offer: ${offerId} ===\n`);
        // Wait a bit before exiting to allow async operations
        setTimeout(() => process.exit(0), 2000);
    })
    .catch(err => {
        console.error(`\n=== FAILED: ${err.message} ===\n`);
        setTimeout(() => process.exit(1), 2000);
    });
