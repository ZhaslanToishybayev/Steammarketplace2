
/**
 * P2P Service
 * Handles User-to-User trading logic
 */
const { pool } = require('../config/database');
const { encrypt, decrypt } = require('./crypto.service');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class P2PService {

    /**
     * Register or Update User's Steam API Key
     */
    async registerApiKey(steamId, apiKey) {
        // Basic validation: Steam API keys are 32 chars hex
        if (!apiKey || apiKey.length !== 32) {
            throw new Error('Invalid Steam API Key format');
        }

        // Removed encryption to match DB schema (varchar(64))
        const client = await pool.connect();
        try {
            await client.query(`
                INSERT INTO user_api_keys (steam_id, api_key, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (steam_id) 
                DO UPDATE SET api_key = $2, updated_at = NOW()
            `, [steamId, apiKey]);

            return true;
        } finally {
            client.release();
        }
    }

    /**
     * Get API key for a user
     */
    async getApiKey(steamId) {
        const res = await pool.query('SELECT api_key FROM user_api_keys WHERE steam_id = $1', [steamId]);
        if (res.rows.length === 0) return null;

        return res.rows[0].api_key;
    }

    /**
     * Monitor a specific trade offer using Seller's API Key
     * Returns the current status from Steam
     */
    async checkTradeStatus(sellerSteamId, tradeOfferId) {
        const apiKey = await this.getApiKey(sellerSteamId);
        if (!apiKey) throw new Error('Seller API Key not found');

        try {
            const response = await axios.get('https://api.steampowered.com/IEconService/GetTradeOffer/v1/', {
                params: {
                    key: apiKey,
                    tradeofferid: tradeOfferId,
                    language: 'en'
                },
                timeout: 10000
            });

            if (response.data && response.data.response && response.data.response.offer) {
                // Steam Trade Offer Object
                return response.data.response.offer;
            }
            return null;
        } catch (err) {
            console.error(`[P2P] Failed to check trade status: ${err.message}`);
            throw err;
        }
    }

    /**
     * Create a P2P Trade Record
     */
    async createP2PTrade(buyerId, sellerId, item, price) {
        // ...
    }

    /**
     * Sync trade status from Steam to DB
     */
    async syncTrade(tradeUuid) {
        const client = await pool.connect();
        try {
            // 1. Get Trade Record
            const res = await client.query('SELECT * FROM escrow_trades WHERE trade_uuid = $1', [tradeUuid]);
            if (res.rows.length === 0) throw new Error('Trade not found');
            const trade = res.rows[0];

            if (trade.trade_type !== 'p2p' && trade.trade_type !== 'p2p_direct') {
                // If bot sale, we might not use this method or logic differs
            }

            // 2. Check if we have Seller API Key
            const apiKey = await this.getApiKey(trade.seller_steam_id);
            if (!apiKey) throw new Error('Seller has no API Key registered');

            // 3. Find the matching trade offer on Steam
            // We need to look for an offer sent to the Buyer
            // Since we might not have the OfferID stored yet (if seller sent it manually), we must Search.

            let offer = null;
            if (trade.seller_trade_offer_id) {
                // We know the offer ID
                const response = await axios.get('https://api.steampowered.com/IEconService/GetTradeOffer/v1/', {
                    params: { key: apiKey, tradeofferid: trade.seller_trade_offer_id, language: 'en' }
                });
                offer = response.data?.response?.offer;
            } else {
                // Search active/history offers
                // This is expensive and rate-limited. For now assuming we can find it by partner + assetid
                const response = await axios.get('https://api.steampowered.com/IEconService/GetTradeOffers/v1/', {
                    params: {
                        key: apiKey,
                        get_sent_offers: 1,
                        active_only: 0, // Need history too if already accepted
                        time_historical_cutoff: Math.floor(new Date(trade.created_at).getTime() / 1000) // Optimization
                    }
                });
                const offers = response.data?.response?.trade_offers_sent || [];

                // Find offer with matching AssetID
                // Note: AssetID might change if item moved? No, AssetID stays same in inventory until trade.
                // But in trade offer, it's in 'items_to_give'.
                offer = offers.find(o =>
                    o.accountid_other == (BigInt(trade.buyer_steam_id) & 0xFFFFFFFFn) && // SteamID64 to AccountID
                    o.items_to_give &&
                    o.items_to_give.some(i => i.assetid === trade.item_asset_id)
                );
            }

            if (!offer) {
                return { status: trade.status, message: 'Trade offer not found on Steam yet' };
            }

            // 4. Update DB based on Steam Status
            // Steam Statuses: 2=Active, 3=Accepted, 6=Canceled, 7=Declined, 8=InvalidItems
            let newStatus = trade.status;
            let note = '';

            switch (offer.trade_offer_state) {
                case 2: // Active
                    newStatus = 'awaiting_buyer';
                    break;
                case 3: // Accepted
                    newStatus = 'completed';
                    break;
                case 6: // Canceled
                case 7: // Declined
                    newStatus = 'cancelled';
                    break;
                case 8:
                    newStatus = 'cancelled'; // Item no longer available
                    note = 'Items invalid';
                    break;
            }

            if (newStatus !== trade.status) {
                await client.query('BEGIN');

                // Update Status
                await client.query(`
                    UPDATE escrow_trades 
                    SET status = $1, seller_trade_offer_id = $2, updated_at = NOW() 
                    WHERE id = $3
                 `, [newStatus, offer.tradeofferid, trade.id]);

                // If Completed -> Release Money
                if (newStatus === 'completed' && trade.status !== 'completed') {
                    // Credit Seller
                    await client.query(`
                        UPDATE users SET balance = balance + $1 WHERE steam_id = $2
                     `, [trade.seller_payout, trade.seller_steam_id]);

                    // Record Transaction
                    await client.query(`
                        INSERT INTO escrow_transactions (transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status)
                        VALUES ($1, $2, $3, 'payout', $4, $5, 'completed')
                     `, [uuidv4(), trade.id, trade.seller_steam_id, trade.seller_payout, trade.currency]);
                }
                
                // NEW: If Cancelled/Declined -> Refund Buyer
                else if ((newStatus === 'cancelled' || newStatus === 'declined') && trade.status !== 'cancelled' && trade.status !== 'declined') {
                    console.log(`[P2P] Trade ${trade.id} cancelled. Refunding buyer...`);
                    
                    // Refund Buyer
                    await client.query(`
                        UPDATE users SET balance = balance + $1 WHERE steam_id = $2
                    `, [trade.price, trade.buyer_steam_id]);
                    
                    // Record Refund
                    await client.query(`
                        INSERT INTO escrow_transactions (transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status)
                        VALUES ($1, $2, $3, 'refund', $4, $5, 'completed')
                    `, [uuidv4(), trade.id, trade.buyer_steam_id, trade.price, trade.currency]);
                    
                    // Restore Listing
                    if (trade.listing_id) {
                        await client.query(`UPDATE listings SET status = 'active' WHERE id = $1`, [trade.listing_id]);
                    }
                }

                await client.query('COMMIT');
                return { status: newStatus, message: 'Trade updated' };
            }

            return { status: trade.status, message: 'No status change' };

        } catch (err) {
            if (client) await client.query('ROLLBACK');
            console.error('Sync Trade Error:', err);
            throw err;
        } finally {
            client.release();
        }
    }
}

module.exports = new P2PService();
