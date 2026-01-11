/**
 * Admin Routes
 * Handles admin panel API endpoints
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
// const { botManager } = require('../services/bot-manager.service'); // Moved to worker
const { tradeQueueService } = require('../services/trade-queue.service');
const { calculateItemValue } = require('../services/external-pricing.service');
const auditService = require('../services/audit.service');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET environment variable is required');
    console.error('   Set JWT_SECRET in your .env file');
    // Don't exit in dev, but log warning
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}
const JWT_EXPIRES = '24h';

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
    // Read from httpOnly cookie first, fallback to header for backward compatibility
    const token = req.cookies?.admin_token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const result = await pool.query(
            'SELECT id, username, role, is_active FROM admins WHERE id = $1',
            [decoded.adminId]
        );

        if (result.rows.length === 0 || !result.rows[0].is_active) {
            return res.status(401).json({ success: false, error: 'Invalid or inactive admin' });
        }

        req.admin = result.rows[0];
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

// Log admin action
const logAction = async (adminId, action, entityType, entityId, details, ipAddress) => {
    await auditService.log(
        `admin:${adminId}`, 
        action, 
        entityId, 
        { entityType, ...details }, 
        ipAddress
    );
};

// ==================== EXPORT ====================

// GET /api/admin/audit/export - Download CSV
router.get('/audit/export', adminAuth, async (req, res) => {
    try {
        const csv = await auditService.exportCsv();
        res.header('Content-Type', 'text/csv');
        res.attachment(`audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ success: false, error: 'Export failed' });
    }
});

// ==================== AUTH ====================

// Rate limiting for login (prevent brute force)
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { success: false, error: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Admin login
router.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    try {
        const result = await pool.query(
            'SELECT id, username, password_hash, role, is_active FROM admins WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const admin = result.rows[0];

        if (!admin.is_active) {
            return res.status(401).json({ success: false, error: 'Account disabled' });
        }

        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Update last login
        await pool.query('UPDATE admins SET last_login_at = NOW() WHERE id = $1', [admin.id]);

        const token = jwt.sign(
            { adminId: admin.id, username: admin.username, role: admin.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        await logAction(admin.id, 'LOGIN', null, null, {}, req.ip);

        // Set JWT in httpOnly cookie (XSS-safe)
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: '/api/admin',
        });

        res.json({
            success: true,
            data: {
                admin: { id: admin.id, username: admin.username, role: admin.role }
            }
        });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// Verify token
router.get('/verify', adminAuth, (req, res) => {
    res.json({ success: true, admin: req.admin });
});

// ==================== DASHBOARD ====================

router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        const stats = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM users'),
            pool.query('SELECT COUNT(*) as count FROM listings WHERE status = $1', ['active']),
            pool.query('SELECT COUNT(*) as count FROM escrow_trades'),
            pool.query('SELECT COUNT(*) as count FROM bots WHERE is_online = true'),
            pool.query(`SELECT COALESCE(SUM(CAST(price AS DECIMAL)), 0) as volume 
                       FROM escrow_trades WHERE status = 'completed'`),
            pool.query(`SELECT COUNT(*) as count FROM escrow_trades 
                       WHERE created_at > NOW() - INTERVAL '24 hours'`),
        ]);

        // Recent activity
        const recentTrades = await pool.query(`
            SELECT t.id, t.trade_uuid, t.status, t.created_at, 
                   l.item_name, l.price
            FROM escrow_trades t
            JOIN listings l ON t.listing_id = l.id
            ORDER BY t.created_at DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers: parseInt(stats[0].rows[0].count),
                    activeListings: parseInt(stats[1].rows[0].count),
                    totalTrades: parseInt(stats[2].rows[0].count),
                    onlineBots: parseInt(stats[3].rows[0].count),
                    totalVolume: parseFloat(stats[4].rows[0].volume) || 0,
                    trades24h: parseInt(stats[5].rows[0].count),
                },
                recentTrades: recentTrades.rows
            }
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ success: false, error: 'Failed to load dashboard' });
    }
});

// ==================== USERS ====================

router.get('/users', adminAuth, async (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT id, steam_id, username, avatar, balance, is_banned, created_at
            FROM users
        `;
        let countQuery = 'SELECT COUNT(*) as count FROM users';
        const params = [];

        if (search) {
            query += ' WHERE username ILIKE $1 OR steam_id ILIKE $1';
            countQuery += ' WHERE username ILIKE $1 OR steam_id ILIKE $1';
            params.push(`%${search}%`);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const [users, total] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, search ? [`%${search}%`] : [])
        ]);

        res.json({
            success: true,
            data: {
                users: users.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(total.rows[0].count),
                    pages: Math.ceil(total.rows[0].count / limit)
                }
            }
        });
    } catch (err) {
        console.error('Users list error:', err);
        res.status(500).json({ success: false, error: 'Failed to load users' });
    }
});

// Update user (ban/unban, adjust balance)
router.patch('/users/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { is_banned, balance_adjustment, balance_set } = req.body;

    try {
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (is_banned !== undefined) {
            updates.push(`is_banned = $${paramIndex++}`);
            params.push(is_banned);
        }

        if (balance_set !== undefined) {
            updates.push(`balance = $${paramIndex++}`);
            params.push(balance_set);
        } else if (balance_adjustment) {
            updates.push(`balance = balance + $${paramIndex++}`);
            params.push(balance_adjustment);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No updates provided' });
        }

        params.push(id);
        const result = await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        await logAction(req.admin.id, 'UPDATE_USER', 'user', id, req.body, req.ip);

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
});

// ==================== LISTINGS ====================

router.get('/listings', adminAuth, async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT l.*, u.username as seller_name
            FROM listings l
            LEFT JOIN users u ON l.seller_id = u.id
        `;
        let countQuery = 'SELECT COUNT(*) as count FROM listings';
        const params = [];

        if (status) {
            query += ' WHERE l.status = $1';
            countQuery += ' WHERE status = $1';
            params.push(status);
        }

        query += ` ORDER BY l.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const [listings, total] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, status ? [status] : [])
        ]);

        res.json({
            success: true,
            data: {
                listings: listings.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(total.rows[0].count),
                    pages: Math.ceil(total.rows[0].count / limit)
                }
            }
        });
    } catch (err) {
        console.error('Listings error:', err);
        res.status(500).json({ success: false, error: 'Failed to load listings' });
    }
});

// Update listing (feature, remove)
router.patch('/listings/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { status, is_featured } = req.body;

    try {
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (status) {
            updates.push(`status = $${paramIndex++}`);
            params.push(status);
        }

        if (is_featured !== undefined) {
            updates.push(`is_featured = $${paramIndex++}`);
            params.push(is_featured);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No updates provided' });
        }

        params.push(id);
        const result = await pool.query(
            `UPDATE listings SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        await logAction(req.admin.id, 'UPDATE_LISTING', 'listing', id, req.body, req.ip);

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Update listing error:', err);
        res.status(500).json({ success: false, error: 'Failed to update listing' });
    }
});

// ==================== TRADES ====================

router.get('/trades', adminAuth, async (req, res) => {
    const { page = 1, limit = 20, status, type } = req.query; // Added type support
    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT t.*, l.item_name, l.price,
                   buyer.username as buyer_name,
                   seller.username as seller_name
            FROM escrow_trades t
            LEFT JOIN listings l ON t.listing_id = l.id
            LEFT JOIN users buyer ON t.buyer_steam_id = buyer.steam_id -- Fixed join on steam_id
            LEFT JOIN users seller ON t.seller_steam_id = seller.steam_id -- Fixed join on steam_id
        `;
        let countQuery = 'SELECT COUNT(*) as count FROM escrow_trades t';
        const params = [];
        let paramIndex = 1;

        const conditions = [];

        if (status) {
            conditions.push(`t.status = $${paramIndex++}`);
            params.push(status);
        }

        if (type) {
            conditions.push(`t.trade_type = $${paramIndex++}`);
            params.push(type);
        }

        if (conditions.length > 0) {
            const whereClause = ' WHERE ' + conditions.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }

        query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const [trades, total] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, params.slice(0, conditions.length)) // Only condition params
        ]);

        res.json({
            success: true,
            data: {
                trades: trades.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(total.rows[0].count),
                    pages: Math.ceil(total.rows[0].count / limit)
                }
            }
        });
    } catch (err) {
        console.error('Trades error:', err);
        res.status(500).json({ success: false, error: 'Failed to load trades' });
    }
});

// Process Withdrawal (Approve/Reject)
router.post('/trades/:id/process-withdrawal', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const tradeRes = await client.query("SELECT * FROM escrow_trades WHERE id = $1 AND trade_type = 'withdrawal' FOR UPDATE", [id]);
        if (tradeRes.rows.length === 0) throw new Error('Withdrawal request not found');
        const trade = tradeRes.rows[0];

        if (trade.status !== 'pending_approval') throw new Error('Withdrawal already processed');

        if (action === 'approve') {
            // Mark completed
            await client.query("UPDATE escrow_trades SET status = 'completed', updated_at = NOW(), notes = $2 WHERE id = $1", [id, reason || 'Approved by admin']);
            await logAction(req.admin.id, 'APPROVE_WITHDRAWAL', 'trade', id, { amount: trade.price }, req.ip);
        } else {
            // Reject - Refund Balance
            await client.query("UPDATE escrow_trades SET status = 'cancelled', updated_at = NOW(), cancel_reason = $2 WHERE id = $1", [id, reason || 'Rejected by admin']);
            await client.query("UPDATE users SET balance = balance + $1 WHERE steam_id = $2", [trade.price, trade.seller_steam_id]);
            await logAction(req.admin.id, 'REJECT_WITHDRAWAL', 'trade', id, { amount: trade.price, reason }, req.ip);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Withdrawal ${action}ed successfully` });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

// ==================== BOTS ====================

router.get('/bots', adminAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, account_name, steam_id, is_online, inventory_count, 
                   active_trades, last_login_at, created_at
            FROM bots
            ORDER BY id
        `);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Bots error:', err);
        res.status(500).json({ success: false, error: 'Failed to load bots' });
    }
});

// ==================== AUDIT LOG ====================

router.get('/audit-logs', adminAuth, async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    try {
        const [logs, total] = await Promise.all([
            pool.query(`
                SELECT al.*, a.username as admin_name
                FROM audit_logs al
                LEFT JOIN admins a ON al.admin_id = a.id
                ORDER BY al.created_at DESC
                LIMIT $1 OFFSET $2
            `, [limit, offset]),
            pool.query('SELECT COUNT(*) as count FROM audit_logs')
        ]);

        res.json({
            success: true,
            data: {
                logs: logs.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(total.rows[0].count),
                    pages: Math.ceil(total.rows[0].count / limit)
                }
            }
        });
    } catch (err) {
        console.error('Audit logs error:', err);
        res.status(500).json({ success: false, error: 'Failed to load audit logs' });
    }
});

// NEW: Sync Bot Inventory to Database (Real Items)
router.post('/sync-inventory', adminAuth, async (req, res) => {
    try {
        console.log('[Admin] Queueing Inventory Sync...');

        await tradeQueueService.addTradeJob({
            type: 'system-sync-inventory',
            message: 'Manual Inventory Sync triggered by Admin'
        }, { priority: 10 }); // High priority

        res.json({ success: true, message: 'Inventory sync job queued. Check logs for progress.' });

    } catch (err) {
        console.error('[Admin] Sync failed to queue:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== ANALYTICS & MONITORING ====================

const { analyticsService } = require('../services/analytics.service');
const { activityLogService } = require('../services/activity-log.service');

// GET /admin/analytics/dashboard - Full dashboard stats
router.get('/analytics/dashboard', adminAuth, async (req, res) => {
    try {
        const stats = await analyticsService.getDashboardStats();
        res.json({ success: true, data: stats });
    } catch (err) {
        console.error('[Admin] Dashboard stats error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /admin/analytics/trades - Trade summary
router.get('/analytics/trades', adminAuth, async (req, res) => {
    try {
        const [summary, hourly] = await Promise.all([
            analyticsService.getTradeSummary(),
            analyticsService.getHourlyVolume(24)
        ]);
        res.json({ success: true, data: { summary, hourly } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /admin/analytics/revenue - Revenue stats
router.get('/analytics/revenue', adminAuth, async (req, res) => {
    try {
        const revenue = await analyticsService.getRevenueStats();
        res.json({ success: true, data: revenue });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /admin/analytics/top-items - Top selling items
router.get('/analytics/top-items', adminAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const items = await analyticsService.getTopItems(limit);
        res.json({ success: true, data: items });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /admin/analytics/bots - Bot status
router.get('/analytics/bots', adminAuth, async (req, res) => {
    try {
        const bots = analyticsService.getBotStats();
        res.json({ success: true, data: bots });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /admin/activity - Recent activity log
router.get('/activity', adminAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const activity = activityLogService.getRecent(limit);
        const stats = activityLogService.getStats();
        res.json({ success: true, data: { activity, stats } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /admin/errors - Error log
router.get('/errors', adminAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const errors = await analyticsService.getErrorLog(limit);
        res.json({ success: true, data: errors });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /admin/health - System health check
router.get('/health', adminAuth, async (req, res) => {
    try {
        const [dbRes, bots] = await Promise.all([
            pool.query('SELECT NOW()'),
            analyticsService.getBotStats()
        ]);

        res.json({
            success: true,
            data: {
                database: { status: 'ok', timestamp: dbRes.rows[0].now },
                bots: {
                    status: bots.online > 0 ? 'ok' : 'warning',
                    online: bots.online,
                    total: bots.total
                },
                memory: process.memoryUsage(),
                uptime: process.uptime()
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
