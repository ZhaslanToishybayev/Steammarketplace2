const { pool } = require('../config/database');

class AuditService {
    /**
     * Log an action
     * @param {string} actorSteamId - SteamID of user/admin (or 'SYSTEM')
     * @param {string} action - Event name (e.g., 'TRADE_BUY', 'LOGIN')
     * @param {string} targetId - ID of the affected entity (Trade UUID, User ID)
     * @param {object} metadata - Additional details (amount, status, reason)
     * @param {string} ip - IP address
     */
    async log(actorSteamId, action, targetId, metadata = {}, ip = null) {
        try {
            await pool.query(
                `INSERT INTO audit_logs (actor_steam_id, action, target_id, metadata, ip_address, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [actorSteamId, action, targetId, JSON.stringify(metadata), ip]
            );
            console.log(`[Audit] ${action} by ${actorSteamId}`);
        } catch (err) {
            console.error('[Audit] Failed to write log:', err.message);
        }
    }

    /**
     * Get recent logs
     */
    async getLogs(limit = 50, offset = 0) {
        const res = await pool.query(
            `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return res.rows;
    }

    /**
     * Export logs to CSV format
     */
    async exportCsv() {
        const res = await pool.query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1000`);
        const logs = res.rows;

        if (logs.length === 0) return '';

        const header = 'ID,Timestamp,Actor,Action,Target,IP,Metadata\n';
        const rows = logs.map(log => {
            const metaObj = log.metadata || {};
            const meta = JSON.stringify(metaObj).replace(/"/g, '""'); // Escape quotes
            return `${log.id},${log.created_at.toISOString()},${log.actor_steam_id},${log.action},${log.target_id},${log.ip_address},"${meta}"`;
        }).join('\n');

        return header + rows;
    }
}

module.exports = new AuditService();