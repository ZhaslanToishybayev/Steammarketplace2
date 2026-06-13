const { v4: uuidv4 } = require('uuid');
const { notificationService } = require('./notification.service');

const P2P_STATUS = Object.freeze({
    PAYMENT_RESERVED: 'PAYMENT_RESERVED',
    WAITING_SELLER: 'WAITING_SELLER',
    TRADE_SENT: 'TRADE_SENT',
    TRADE_ACCEPTED: 'TRADE_ACCEPTED',
    SETTLEMENT_PENDING: 'SETTLEMENT_PENDING',
    TRADE_COMPLETED: 'TRADE_COMPLETED',
    CANCELLED: 'CANCELLED',
    REFUNDED: 'REFUNDED',
    DISPUTED: 'DISPUTED',
});

const LISTING_STATUS = Object.freeze({
    OPEN: 'OPEN',
    RESERVED: 'RESERVED',
    REMOVED: 'REMOVED',
    SOLD: 'SOLD',
});

function numeric(value) {
    return Number.parseFloat(value || 0);
}

async function addHistory(client, tradeId, oldStatus, newStatus, changedBy, notes) {
    await client.query(`
        INSERT INTO escrow_trade_history (escrow_trade_id, old_status, new_status, changed_by, notes)
        VALUES ($1, $2, $3, $4, $5)
    `, [tradeId, oldStatus, newStatus, changedBy || 'system', notes || null]);
}

class P2PFlowService {
    get platformFeePercent() {
        return numeric(process.env.PLATFORM_FEE_PERCENT || '5.0');
    }

    get settlementHoldDays() {
        return Number.parseInt(process.env.P2P_SETTLEMENT_HOLD_DAYS || '7', 10);
    }

    calculateAmounts(price) {
        const amount = numeric(price);
        const platformFee = Number((amount * (this.platformFeePercent / 100)).toFixed(2));
        const sellerPayout = Number((amount - platformFee).toFixed(2));
        return { price: amount, platformFee, sellerPayout, platformFeePercent: this.platformFeePercent };
    }

    async reserveBuyerFunds(client, buyerSteamId, price) {
        const buyerRes = await client.query(
            'SELECT balance, reserved_balance FROM users WHERE steam_id = $1 FOR UPDATE',
            [buyerSteamId]
        );

        if (buyerRes.rows.length === 0) {
            throw new Error('Buyer account not found');
        }

        const balance = numeric(buyerRes.rows[0].balance);
        const reserved = numeric(buyerRes.rows[0].reserved_balance);
        const available = balance - reserved;

        if (available < price) {
            throw new Error('Insufficient available balance');
        }

        await client.query(
            'UPDATE users SET reserved_balance = reserved_balance + $1, updated_at = NOW() WHERE steam_id = $2',
            [price, buyerSteamId]
        );
    }

    async createReservedTrade(client, { listing, buyerSteamId, buyerTradeUrl, buyerProfileUrl }) {
        const amounts = this.calculateAmounts(listing.price);
        await this.reserveBuyerFunds(client, buyerSteamId, amounts.price);

        const tradeUuid = uuidv4();
        const insert = await client.query(`
            INSERT INTO escrow_trades (
                trade_uuid, listing_id, buyer_steam_id, seller_steam_id,
                item_asset_id, item_name, item_app_id, price,
                platform_fee, platform_fee_percent, seller_payout,
                status, trade_type, buyer_trade_url, seller_trade_url,
                buyer_profile_url, payment_reserved_at, seller_notified_at, created_at, updated_at
            )
            VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8,
                $9, $10, $11,
                $12, 'p2p', $13, $14,
                $15, NOW(), NOW(), NOW(), NOW()
            )
            RETURNING id, trade_uuid, status
        `, [
            tradeUuid,
            listing.id,
            buyerSteamId,
            listing.seller_steam_id,
            listing.item_asset_id,
            listing.item_name,
            listing.item_app_id,
            amounts.price,
            amounts.platformFee,
            amounts.platformFeePercent,
            amounts.sellerPayout,
            P2P_STATUS.WAITING_SELLER,
            buyerTradeUrl,
            listing.seller_trade_url,
            buyerProfileUrl || null,
        ]);

        const trade = insert.rows[0];
        await addHistory(client, trade.id, null, P2P_STATUS.PAYMENT_RESERVED, 'buyer', 'Buyer funds reserved');
        await addHistory(client, trade.id, P2P_STATUS.PAYMENT_RESERVED, P2P_STATUS.WAITING_SELLER, 'system', 'Seller notification queued');

        await client.query(`
            INSERT INTO balance_transactions (steam_id, amount, type, reference_id, description)
            VALUES ($1, $2, 'reserve', $3, $4)
        `, [buyerSteamId, amounts.price, tradeUuid, `Reserved for P2P purchase: ${listing.item_name}`]);

        return trade;
    }

    async markSellerTradeSent(client, tradeUuid, tradeOfferId) {
        const tradeRes = await client.query(
            'SELECT id, status FROM escrow_trades WHERE trade_uuid = $1 FOR UPDATE',
            [tradeUuid]
        );
        if (tradeRes.rows.length === 0) throw new Error('Trade not found');

        const trade = tradeRes.rows[0];
        await client.query(`
            UPDATE escrow_trades
            SET status = $1, seller_trade_offer_id = COALESCE($2, seller_trade_offer_id),
                trade_sent_at = NOW(), seller_offer_sent_at = NOW(), updated_at = NOW()
            WHERE id = $3
        `, [P2P_STATUS.TRADE_SENT, tradeOfferId || null, trade.id]);
        await addHistory(client, trade.id, trade.status, P2P_STATUS.TRADE_SENT, 'seller', 'Seller sent Steam trade offer');

        const updated = await client.query('SELECT * FROM escrow_trades WHERE id = $1', [trade.id]);
        if (updated.rows[0]) notificationService.notifyTradeUpdate(updated.rows[0]);
    }

    async markTradeAccepted(client, tradeUuid) {
        const tradeRes = await client.query(
            'SELECT id, status FROM escrow_trades WHERE trade_uuid = $1 FOR UPDATE',
            [tradeUuid]
        );
        if (tradeRes.rows.length === 0) throw new Error('Trade not found');

        const trade = tradeRes.rows[0];
        const hold = this.settlementHoldDays;
        await client.query(`
            UPDATE escrow_trades
            SET status = $1,
                trade_accepted_at = NOW(),
                buyer_accepted_at = NOW(),
                settlement_due_at = NOW() + ($2 || ' days')::interval,
                updated_at = NOW()
            WHERE id = $3
        `, [P2P_STATUS.SETTLEMENT_PENDING, String(hold), trade.id]);
        await addHistory(client, trade.id, trade.status, P2P_STATUS.TRADE_ACCEPTED, 'system', 'Steam transfer verified');
        await addHistory(client, trade.id, P2P_STATUS.TRADE_ACCEPTED, P2P_STATUS.SETTLEMENT_PENDING, 'system', `${hold}-day settlement hold started`);

        const updated = await client.query('SELECT * FROM escrow_trades WHERE id = $1', [trade.id]);
        if (updated.rows[0]) notificationService.notifyTradeUpdate(updated.rows[0]);
    }

    /**
     * Cancel a trade and fully refund the buyer's reserved balance.
     * Restores the listing to OPEN status.
     */
    async cancelAndRefund(client, trade, reason, changedBy) {

        await client.query(`
            UPDATE escrow_trades
            SET status = $1, cancel_reason = $2, cancelled_at = NOW(), updated_at = NOW()
            WHERE id = $3
        `, [P2P_STATUS.REFUNDED, reason, trade.id]);

        // Release buyer reserved funds
        await client.query(
            'UPDATE users SET reserved_balance = GREATEST(reserved_balance - $1, 0), updated_at = NOW() WHERE steam_id = $2',
            [trade.price, trade.buyer_steam_id],
        );

        // Record refund transaction
        await client.query(`
            INSERT INTO escrow_transactions (transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status)
            VALUES ($1, $2, $3, 'refund', $4, $5, 'completed')
        `, [uuidv4(), trade.id, trade.buyer_steam_id, trade.price, trade.currency || 'USD']);

        // Restore listing
        if (trade.listing_id) {
            await client.query(
                'UPDATE listings SET status = $1, updated_at = NOW() WHERE id = $2',
                [LISTING_STATUS.OPEN, trade.listing_id],
            );
        }

        await addHistory(client, trade.id, trade.status, P2P_STATUS.REFUNDED, changedBy, reason);

        const updated = await client.query('SELECT * FROM escrow_trades WHERE id = $1', [trade.id]);
        if (updated.rows[0]) notificationService.notifyTradeUpdate(updated.rows[0]);
    }

    async releaseDueSettlements(client, limit = 25) {
        const trades = await client.query(`
            SELECT id, trade_uuid, buyer_steam_id, seller_steam_id, price, seller_payout, platform_fee, currency, status
            FROM escrow_trades
            WHERE status = $1
              AND settlement_due_at IS NOT NULL
              AND settlement_due_at <= NOW()
              AND dispute_opened_at IS NULL
            ORDER BY settlement_due_at ASC
            LIMIT $2
            FOR UPDATE SKIP LOCKED
        `, [P2P_STATUS.SETTLEMENT_PENDING, limit]);

        for (const trade of trades.rows) {
            await client.query(
                'UPDATE users SET reserved_balance = GREATEST(reserved_balance - $1, 0), updated_at = NOW() WHERE steam_id = $2',
                [trade.price, trade.buyer_steam_id]
            );
            await client.query(
                'UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE steam_id = $2',
                [trade.seller_payout, trade.seller_steam_id]
            );
            await client.query(`
                UPDATE escrow_trades
                SET status = $1, completed_at = NOW(), settlement_released_at = NOW(), updated_at = NOW()
                WHERE id = $2
            `, [P2P_STATUS.TRADE_COMPLETED, trade.id]);
            await client.query(
                'UPDATE listings SET status = $1, updated_at = NOW() WHERE id = (SELECT listing_id FROM escrow_trades WHERE id = $2)',
                [LISTING_STATUS.SOLD, trade.id]
            );
            await client.query(`
                INSERT INTO escrow_transactions (transaction_uuid, escrow_trade_id, steam_id, type, amount, currency, status)
                VALUES ($1, $2, $3, 'payout', $4, $5, 'completed')
            `, [uuidv4(), trade.id, trade.seller_steam_id, trade.seller_payout, trade.currency || 'USD']);
            await addHistory(client, trade.id, trade.status, P2P_STATUS.TRADE_COMPLETED, 'system', 'Settlement released to seller');

            const updated = await client.query('SELECT * FROM escrow_trades WHERE id = $1', [trade.id]);
            if (updated.rows[0]) notificationService.notifyTradeUpdate(updated.rows[0]);
        }

        return trades.rows.length;
    }
}

module.exports = {
    p2pFlowService: new P2PFlowService(),
    P2P_STATUS,
    LISTING_STATUS,
};
