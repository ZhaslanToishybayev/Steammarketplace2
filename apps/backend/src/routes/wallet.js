/**
 * Wallet Routes
 * Manage user balance and transactions
 */
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
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

module.exports = router;
