/**
 * Support Tickets Routes
 * Handle customer support requests
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get user's tickets
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.id || req.session?.passport?.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const result = await pool.query(`
            SELECT id, subject, status, priority, created_at, updated_at
            FROM support_tickets
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [userId]);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({ success: false, error: 'Failed to get tickets' });
    }
});

// Create ticket
router.post('/', async (req, res) => {
    try {
        const userId = req.user?.id || req.session?.passport?.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const { subject, message, priority = 'normal', category = 'general' } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ success: false, error: 'Subject and message required' });
        }

        const result = await pool.query(`
            INSERT INTO support_tickets (user_id, subject, priority, category, status)
            VALUES ($1, $2, $3, $4, 'open')
            RETURNING *
        `, [userId, subject, priority, category]);

        const ticketId = result.rows[0].id;

        // Add first message
        await pool.query(`
            INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff)
            VALUES ($1, $2, $3, false)
        `, [ticketId, userId, message]);

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ success: false, error: 'Failed to create ticket' });
    }
});

// Get ticket messages
router.get('/:ticketId/messages', async (req, res) => {
    try {
        const userId = req.user?.id || req.session?.passport?.user?.id;
        const { ticketId } = req.params;

        // Verify ownership
        const ticket = await pool.query(
            'SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2',
            [ticketId, userId]
        );

        if (ticket.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        const messages = await pool.query(`
            SELECT tm.*, u.username, u.avatar
            FROM ticket_messages tm
            LEFT JOIN users u ON tm.user_id = u.id
            WHERE tm.ticket_id = $1
            ORDER BY tm.created_at ASC
        `, [ticketId]);

        res.json({
            success: true,
            data: {
                ticket: ticket.rows[0],
                messages: messages.rows
            }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ success: false, error: 'Failed to get messages' });
    }
});

// Reply to ticket
router.post('/:ticketId/reply', async (req, res) => {
    try {
        const userId = req.user?.id || req.session?.passport?.user?.id;
        const { ticketId } = req.params;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message required' });
        }

        // Verify ownership
        const ticket = await pool.query(
            'SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2',
            [ticketId, userId]
        );

        if (ticket.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        // Add message
        const result = await pool.query(`
            INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff)
            VALUES ($1, $2, $3, false)
            RETURNING *
        `, [ticketId, userId, message]);

        // Update ticket
        await pool.query(
            'UPDATE support_tickets SET updated_at = NOW() WHERE id = $1',
            [ticketId]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Reply error:', error);
        res.status(500).json({ success: false, error: 'Failed to send reply' });
    }
});

module.exports = router;
