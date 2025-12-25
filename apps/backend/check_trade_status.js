/**
 * Check Trade Offer Status
 * Investigates why trade offer might not have been delivered
 */

require('dotenv').config();
const { initializeBots, botManager } = require('./src/config/bots.config');
const axios = require('axios');

const OFFER_ID = '8697926375';

async function checkTradeStatus() {
    console.log('=== TRADE OFFER STATUS CHECK ===\n');

    // 1. Initialize bots
    console.log('1. Initializing bots...');
    const initResult = await initializeBots();
    if (!initResult.success) {
        console.error(`❌ Failed: ${initResult.message || initResult.error}`);
        process.exit(1);
    }
    console.log(`✅ Bots online: ${initResult.online}/${initResult.total}\n`);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. Get bot
    const bot = botManager.getAvailableBot();
    if (!bot) {
        console.error('❌ No bot available');
        process.exit(1);
    }

    // 3. Check via Steam Web API
    console.log('2. Checking trade offer via Steam API...');
    const apiKey = process.env.STEAM_API_KEY;

    try {
        const response = await axios.get(
            `https://api.steampowered.com/IEconService/GetTradeOffer/v1/`,
            {
                params: {
                    key: apiKey,
                    tradeofferid: OFFER_ID,
                    language: 'en',
                },
                timeout: 10000,
            }
        );

        const offer = response.data?.response?.offer;
        if (offer) {
            console.log('✅ Trade offer found!');
            console.log(`   Offer ID: ${offer.tradeofferid}`);
            console.log(`   State: ${getTradeState(offer.trade_offer_state)}`);
            console.log(`   Created: ${new Date(offer.time_created * 1000).toISOString()}`);
            console.log(`   Expires: ${new Date(offer.expiration_time * 1000).toISOString()}`);
            console.log(`   Items to give: ${offer.items_to_give?.length || 0}`);
            console.log(`   Items to receive: ${offer.items_to_receive?.length || 0}`);
            console.log(`   Is our offer: ${offer.is_our_offer ? 'Yes' : 'No'}`);
            console.log(`   Confirmation needed: ${offer.confirmation_method || 'None'}`);

            if (offer.trade_offer_state === 9) {
                console.log('\n⚠️ TRADE NEEDS MOBILE CONFIRMATION!');
                console.log('   The bot needs to confirm this trade via Steam Guard Mobile.');
            }
        } else {
            console.log('❌ Trade offer not found in API response');
            console.log('   Raw response:', JSON.stringify(response.data, null, 2));
        }
    } catch (err) {
        console.error('❌ API Error:', err.message);
        if (err.response) {
            console.log('   Status:', err.response.status);
            console.log('   Data:', JSON.stringify(err.response.data, null, 2));
        }
    }

    // 4. Check bot's pending offers
    console.log('\n3. Checking bot\'s sent offers...');
    try {
        const response = await axios.get(
            `https://api.steampowered.com/IEconService/GetTradeOffers/v1/`,
            {
                params: {
                    key: apiKey,
                    get_sent_offers: 1,
                    active_only: 1,
                    time_historical_cutoff: Math.floor(Date.now() / 1000) - 3600, // Last hour
                },
                timeout: 10000,
            }
        );

        const sentOffers = response.data?.response?.trade_offers_sent || [];
        console.log(`   Found ${sentOffers.length} sent offers in last hour`);

        sentOffers.forEach((offer, i) => {
            console.log(`   ${i + 1}. ID: ${offer.tradeofferid}, State: ${getTradeState(offer.trade_offer_state)}`);
        });
    } catch (err) {
        console.error('❌ Failed to get sent offers:', err.message);
    }

    console.log('\n=== CHECK COMPLETE ===');
    process.exit(0);
}

function getTradeState(state) {
    const states = {
        1: 'Invalid',
        2: 'Active (waiting for acceptance)',
        3: 'Accepted',
        4: 'Countered',
        5: 'Expired',
        6: 'Canceled',
        7: 'Declined',
        8: 'InvalidItems',
        9: 'CreatedNeedsConfirmation ⚠️',
        10: 'CanceledBySecondFactor',
        11: 'InEscrow',
    };
    return states[state] || `Unknown (${state})`;
}

checkTradeStatus().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
