/**
 * Admin Extended Routes
 * Settings, Content, Banners management
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// ==================== SETTINGS ====================

/**
 * GET /api/admin/settings
 * Get all platform settings
 */
router.get('/settings', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, key, value, description, type, updated_at
            FROM platform_settings
            ORDER BY key
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Get settings error:', err);
        res.status(500).json({ success: false, error: 'Failed to load settings' });
    }
});

/**
 * PUT /api/admin/settings
 * Update a setting
 */
router.put('/settings', async (req, res) => {
    const { key, value } = req.body;

    if (!key) {
        return res.status(400).json({ success: false, error: 'Key is required' });
    }

    try {
        const result = await pool.query(`
            UPDATE platform_settings 
            SET value = $1, updated_at = NOW()
            WHERE key = $2
            RETURNING *
        `, [value, key]);

        if (result.rows.length === 0) {
            // Insert if not exists
            await pool.query(`
                INSERT INTO platform_settings (key, value)
                VALUES ($1, $2)
            `, [key, value]);
        }

        res.json({ success: true, message: 'Setting updated' });
    } catch (err) {
        console.error('Update setting error:', err);
        res.status(500).json({ success: false, error: 'Failed to update setting' });
    }
});

// ==================== CONTENT ====================

/**
 * GET /api/admin/content
 * Get all content items
 */
router.get('/content', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, key, title, content, type, is_active, updated_at
            FROM site_content
            ORDER BY type, key
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Get content error:', err);
        res.status(500).json({ success: false, error: 'Failed to load content' });
    }
});

/**
 * PUT /api/admin/content/:id
 * Update content item
 */
router.put('/content/:id', async (req, res) => {
    const { id } = req.params;
    const { title, content, is_active } = req.body;

    try {
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (title !== undefined) {
            updates.push(`title = $${paramIndex++}`);
            values.push(title);
        }
        if (content !== undefined) {
            updates.push(`content = $${paramIndex++}`);
            values.push(content);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);

        await pool.query(`
            UPDATE site_content 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
        `, values);

        res.json({ success: true, message: 'Content updated' });
    } catch (err) {
        console.error('Update content error:', err);
        res.status(500).json({ success: false, error: 'Failed to update content' });
    }
});

/**
 * POST /api/admin/content
 * Create new content item
 */
router.post('/content', async (req, res) => {
    const { key, title, content, type = 'page' } = req.body;

    if (!key || !title) {
        return res.status(400).json({ success: false, error: 'Key and title are required' });
    }

    try {
        const result = await pool.query(`
            INSERT INTO site_content (key, title, content, type)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [key, title, content || '', type]);

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Create content error:', err);
        res.status(500).json({ success: false, error: 'Failed to create content' });
    }
});

// ==================== BANNERS ====================

/**
 * GET /api/admin/banners
 * Get all banners
 */
router.get('/banners', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, title, image_url, link_url, position, is_active, 
                   priority, starts_at, ends_at, created_at
            FROM banners
            ORDER BY priority DESC, created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Get banners error:', err);
        res.status(500).json({ success: false, error: 'Failed to load banners' });
    }
});

/**
 * POST /api/admin/banners
 * Create new banner
 */
router.post('/banners', async (req, res) => {
    const { title, image_url, link_url, position = 'home_top', priority = 0 } = req.body;

    if (!title || !image_url) {
        return res.status(400).json({ success: false, error: 'Title and image_url are required' });
    }

    try {
        const result = await pool.query(`
            INSERT INTO banners (title, image_url, link_url, position, priority)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [title, image_url, link_url || '', position, priority]);

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Create banner error:', err);
        res.status(500).json({ success: false, error: 'Failed to create banner' });
    }
});

/**
 * PUT /api/admin/banners/:id
 * Update banner
 */
router.put('/banners/:id', async (req, res) => {
    const { id } = req.params;
    const { title, image_url, link_url, position, is_active, priority } = req.body;

    try {
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (title !== undefined) { updates.push(`title = $${paramIndex++}`); values.push(title); }
        if (image_url !== undefined) { updates.push(`image_url = $${paramIndex++}`); values.push(image_url); }
        if (link_url !== undefined) { updates.push(`link_url = $${paramIndex++}`); values.push(link_url); }
        if (position !== undefined) { updates.push(`position = $${paramIndex++}`); values.push(position); }
        if (is_active !== undefined) { updates.push(`is_active = $${paramIndex++}`); values.push(is_active); }
        if (priority !== undefined) { updates.push(`priority = $${paramIndex++}`); values.push(priority); }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        values.push(id);

        await pool.query(`
            UPDATE banners 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
        `, values);

        res.json({ success: true, message: 'Banner updated' });
    } catch (err) {
        console.error('Update banner error:', err);
        res.status(500).json({ success: false, error: 'Failed to update banner' });
    }
});

/**
 * DELETE /api/admin/banners/:id
 * Delete banner
 */
router.delete('/banners/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM banners WHERE id = $1', [id]);
        res.json({ success: true, message: 'Banner deleted' });
    } catch (err) {
        console.error('Delete banner error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete banner' });
    }
});

// ==================== AUDIT LOGS ====================

/**
 * GET /api/admin/audit-logs
 * Get audit logs with pagination
 */
router.get('/audit-logs', async (req, res) => {
    const { page = 1, limit = 20, action } = req.query;
    const offset = (page - 1) * limit;

    try {
        let whereClause = '';
        const params = [parseInt(limit), offset];

        if (action) {
            whereClause = `WHERE action ILIKE $3`;
            params.push(`%${action}%`);
        }

        const [logsResult, countResult] = await Promise.all([
            pool.query(`
                SELECT al.*, a.username as admin_username
                FROM audit_logs al
                LEFT JOIN admins a ON al.admin_id = a.id
                ${whereClause}
                ORDER BY al.created_at DESC
                LIMIT $1 OFFSET $2
            `, params),
            pool.query(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
                action ? [`%${action}%`] : [])
        ]);

        res.json({
            success: true,
            data: {
                logs: logsResult.rows,
                total: parseInt(countResult.rows[0].total),
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (err) {
        console.error('Get audit logs error:', err);
        res.status(500).json({ success: false, error: 'Failed to load audit logs' });
    }
});

module.exports = router;
