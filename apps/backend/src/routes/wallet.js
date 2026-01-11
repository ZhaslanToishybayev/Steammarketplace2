/**
 * Wallet Routes
 * Manage user balance and transactions
 */
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const auditService = require('../services/audit.service');
const { v4: uuidv4 } = require('uuid');

// Middleware
const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    next();
};

/**
 * GET /api/wallet/balance
 * Get current user balance
 */
router.get('/balance', requireAuth, async (req, res) => {
    try {
        const result = await query(
            'SELECT balance FROM users WHERE steam_id = $1',
            [req.user.steamId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            balance: parseFloat(result.rows[0].balance),
            currency: 'USD'
        });
    } catch (err) {
        console.error('[Wallet] Failed to get balance:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch balance' });
    }
});

/**
 * POST /api/wallet/deposit
 * Add funds to wallet (Mock Payment for testing)
 * Supports idempotency key to prevent duplicate deposits
 */
const { DepositSchema, validateBody } = require('../middleware/validation');

router.post('/deposit', requireAuth, validateBody(DepositSchema), async (req, res) => {
    try {
        const { amount, idempotencyKey } = req.validatedBody;
        const steamId = req.user.steamId;

        console.log(`[DEBUG] Deposit request:`, { amount, steamId, idempotencyKey });

        const client = await require('../config/database').getClient();

        try {
            await client.query('BEGIN');

            // Check idempotency key if provided (prevent duplicate deposits)
            if (idempotencyKey) {
                const existing = await client.query(
                    'SELECT id FROM balance_transactions WHERE trade_ref = $1',
                    [idempotencyKey]
                );
                if (existing.rows.length > 0) {
                    await client.query('ROLLBACK');
                    return res.json({
                        success: true,
                        message: 'Deposit already processed (duplicate request)',
                        duplicate: true,
                    });
                }
            }

            // Use idempotency key or generate new UUID
            const transactionRef = idempotencyKey || uuidv4();

            // 1. Update Balance
            await client.query(
                'UPDATE users SET balance = balance + $1 WHERE steam_id = $2',
                [amount, steamId]
            );

            // 2. Record Transaction
            await client.query(`
                INSERT INTO balance_transactions 
                (user_steam_id, type, amount, trade_ref, description, created_at)
                VALUES ($1, 'deposit', $2, $3, $4, NOW())
            `, [steamId, amount, transactionRef, `Manual Deposit (DEP-${Date.now()})`]);

            await client.query('COMMIT');

            res.json({
                success: true,
                message: `Deposited $${amount} successfully`,
                transactionRef,
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[Wallet] Deposit failed:', err);
        res.status(500).json({ success: false, error: 'Deposit failed', code: 'DEPOSIT_ERROR' });
    }
});

/**
 * POST /api/wallet/withdraw
 * Request Withdrawal
 */
router.post('/withdraw', requireAuth, async (req, res) => {
    const { amount, method, details } = req.body;
    const steamId = req.user.steamId;

    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const client = await require('../config/database').getClient();
    try {
        await client.query('BEGIN');

        // Check Balance
        const userRes = await client.query('SELECT balance FROM users WHERE steam_id = $1 FOR UPDATE', [steamId]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const balance = parseFloat(userRes.rows[0].balance);

        if (balance < amount) throw new Error('Insufficient balance');

        // Deduct Balance
        await client.query('UPDATE users SET balance = balance - $1 WHERE steam_id = $2', [amount, steamId]);

        // Create Withdrawal Request (using escrow_trades as container)
        const tradeUuid = uuidv4();
        await client.query(`
            INSERT INTO escrow_trades (
                trade_uuid, seller_steam_id, buyer_steam_id, 
                price, status, trade_type, item_name, 
                buyer_trade_url, seller_trade_url, created_at,
                item_asset_id, item_app_id, seller_payout, platform_fee -- Added seller_payout
            ) VALUES ($1, $2, 'SYSTEM', $3, 'pending_approval', 'withdrawal', $4, $5, $6, NOW(), $7, $8, $9, 0)
        `, [
            tradeUuid, 
            steamId, 
            amount, 
            `Withdrawal (${method})`, 
            details || '', // Store details in buyer_trade_url or notes? Using buyer_trade_url for now as it's text
            '',
            '0', // Placeholder asset_id
            0,   // Placeholder app_id
            amount // Seller payout = amount requested (assuming fees deducted from balance or handled elsewhere)
        ]);

        await client.query('COMMIT');

        // Audit Log
        await auditService.log(
            steamId, 
            'WITHDRAW_REQUEST', 
            tradeUuid, 
            { amount, method }, 
            req.ip
        );

        res.json({
            success: true,
            message: 'Withdrawal request submitted',
            tradeUuid
        });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
