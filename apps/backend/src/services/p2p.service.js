
/**
 * P2P Service
 * Handles User-to-User trading logic
 */
const { pool } = require('../config/database');
const { encrypt, decrypt } = require('./crypto.service');
const { notificationService } = require('./notification.service');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { p2pFlowService, P2P_STATUS, LISTING_STATUS } = require('./p2p-flow.service');

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
        if (res.rows.length > 0) return res.rows[0].api_key;

        const globalKey = process.env.STEAM_API_KEY;
        if (globalKey && !globalKey.includes('placeholder') && !globalKey.includes('your_') && !globalKey.startsWith('local_docker_')) return globalKey;
        return null;
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
     * Convert SteamID64 to AccountID (lower 32 bits)
     */
    _steamIdToAccountId(steamId) {
        return Number(BigInt(steamId) & 0xFFFFFFFFn);
    }

    /**
     * Sync trade status from Steam to DB
     */
    async syncTrade(tradeUuid) {
        const client = await pool.connect();
        try {
            const res = await client.query('SELECT * FROM escrow_trades WHERE trade_uuid = $1', [tradeUuid]);
            if (res.rows.length === 0) throw new Error('Trade not found');
            const trade = res.rows[0];

            if (trade.trade_type !== 'p2p' && trade.trade_type !== 'p2p_direct') {
                return { status: trade.status, previousStatus: trade.status, message: 'Not a P2P trade' };
            }

            const terminalStatuses = ['TRADE_COMPLETED', 'CANCELLED', 'REFUNDED', 'DISPUTED'];
            if (terminalStatuses.includes(trade.status)) {
                return { status: trade.status, previousStatus: trade.status, message: 'Already in terminal state' };
            }

            const apiKey = await this.getApiKey(trade.seller_steam_id);
            if (!apiKey) return { status: trade.status, previousStatus: trade.status, message: 'Seller has no API Key' };

            const previousStatus = trade.status;
            let offer = null;

            if (trade.seller_trade_offer_id) {
                try {
                    const response = await axios.get('https://api.steampowered.com/IEconService/GetTradeOffer/v1/', {
                        params: { key: apiKey, tradeofferid: trade.seller_trade_offer_id, language: 'en' },
                        timeout: 10000
                    });
                    offer = response.data?.response?.offer;
                } catch (err) {
                    if (err.response?.status === 403) return { status: previousStatus, previousStatus, message: 'API key invalid' };
                    throw err;
                }
            } else if (trade.status === P2P_STATUS.WAITING_SELLER || trade.status === P2P_STATUS.TRADE_SENT) {
                try {
                    const buyerAccountId = this._steamIdToAccountId(trade.buyer_steam_id);
                    const response = await axios.get('https://api.steampowered.com/IEconService/GetTradeOffers/v1/', {
                        params: {
                            key: apiKey, get_received_offers: 1, get_sent_offers: 1, active_only: 1,
                            time_historical_cutoff: Math.floor(new Date(trade.created_at).getTime() / 1000)
                        },
                        timeout: 10000
                    });
                    const offers = [
                        ...(response.data?.response?.trade_offers_sent || []),
                        ...(response.data?.response?.trade_offers_received || []),
                    ];
                    offer = offers.find(o =>
                        Number(o.accountid_other) === buyerAccountId &&
                        o.items_to_give &&
                        o.items_to_give.some(i => String(i.assetid) === String(trade.item_asset_id))
                    );
                } catch (err) {
                    if (err.response?.status === 403) return { status: previousStatus, previousStatus, message: 'API key invalid' };
                    throw err;
                }
            } else {
                return { status: previousStatus, previousStatus, message: 'No offer ID and not in searchable status' };
            }

            if (!offer) {
                return { status: previousStatus, previousStatus, message: 'Trade offer not found on Steam yet' };
            }

            let newStatus = previousStatus;
            let note = '';

            switch (offer.trade_offer_state) {
                case 2: newStatus = P2P_STATUS.TRADE_SENT; break;
                case 3: newStatus = P2P_STATUS.SETTLEMENT_PENDING; break;
                case 6:
                case 7: newStatus = P2P_STATUS.CANCELLED; break;
                case 8: newStatus = P2P_STATUS.CANCELLED; note = 'Items invalid'; break;
            }

            if (newStatus !== previousStatus) {
                await client.query('BEGIN');
                try {
                    if (newStatus === P2P_STATUS.SETTLEMENT_PENDING) {
                        await p2pFlowService.markTradeAccepted(client, tradeUuid);
                        await client.query('UPDATE escrow_trades SET seller_trade_offer_id = $1, updated_at = NOW() WHERE id = $2',
                            [String(offer.tradeofferid), trade.id]);
                        if (trade.listing_id) {
                            await client.query('UPDATE listings SET status = $1, updated_at = NOW() WHERE id = $2',
                                [LISTING_STATUS.RESERVED, trade.listing_id]);
                        }
                    } else if (newStatus === P2P_STATUS.CANCELLED) {
                        await client.query('UPDATE escrow_trades SET status = $1, seller_trade_offer_id = $2, cancel_reason = $3, cancelled_at = NOW(), updated_at = NOW() WHERE id = $4',
                            [P2P_STATUS.REFUNDED, String(offer.tradeofferid), note || 'Steam trade cancelled', trade.id]);
                        await client.query('UPDATE users SET reserved_balance = GREATEST(reserved_balance - $1, 0), updated_at = NOW() WHERE steam_id = $2',
                            [trade.price, trade.buyer_steam_id]);
                        await client.query('INSERT INTO escrow_transactions (transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status) VALUES ($1, $2, $3, \'refund\', $4, $5, \'completed\')',
                            [uuidv4(), trade.id, trade.buyer_steam_id, trade.price, trade.currency || 'USD']);
                        if (trade.listing_id) {
                            await client.query('UPDATE listings SET status = $1, updated_at = NOW() WHERE id = $2',
                                [LISTING_STATUS.OPEN, trade.listing_id]);
                        }
                    } else {
                        await client.query('UPDATE escrow_trades SET status = $1, seller_trade_offer_id = COALESCE(seller_trade_offer_id, $2), updated_at = NOW() WHERE id = $3',
                            [newStatus, String(offer.tradeofferid), trade.id]);
                    }
                    await client.query('COMMIT');

                    const updatedTrade = await pool.query('SELECT * FROM escrow_trades WHERE trade_uuid = $1', [tradeUuid]);
                    if (updatedTrade.rows[0]) notificationService.notifyTradeUpdate(updatedTrade.rows[0]);

                    return { status: newStatus, previousStatus, message: 'Trade updated from Steam sync' };
                } catch (err) {
                    await client.query('ROLLBACK');
                    throw err;
                }
            }

            return { status: previousStatus, previousStatus, message: 'No status change' };
        } catch (err) {
            if (client) await client.query('ROLLBACK');
            console.error(`[P2P] syncTrade(${tradeUuid}) error:`, err.message);
            throw err;
        } finally {
            client.release();
        }
    }

    async syncPendingTrades(limit = 10) {
        const activeStatuses = [P2P_STATUS.WAITING_SELLER, P2P_STATUS.TRADE_SENT];
        const trades = await pool.query(`
            SELECT trade_uuid FROM escrow_trades
            WHERE trade_type IN ('p2p', 'p2p_direct')
              AND status = ANY($1)
            ORDER BY updated_at ASC
            LIMIT $2
        `, [activeStatuses, limit]);

        const results = [];
        for (const row of trades.rows) {
            try {
                const result = await this.syncTrade(row.trade_uuid);
                results.push({ tradeUuid: row.trade_uuid, ...result });
            } catch (err) {
                results.push({ tradeUuid: row.trade_uuid, error: err.message });
            }
        }
        return results;
    }
}

module.exports = new P2PService();
