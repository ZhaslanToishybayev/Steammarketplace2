/**
 * Scam Protection Service
 * Prevents common Steam trading scams:
 * - API Key theft/change
 * - Item ownership verification
 * - Suspicious activity detection
 */

const crypto = require('crypto');
const { pool, query } = require('../config/database');
const inventoryManager = require('./inventory.manager');

// Risk score weights for different events
const RISK_WEIGHTS = {
    api_key_changed: 50,       // High risk: API key was changed
    item_missing: 30,          // Item not in inventory before trade
    rapid_cancel: 10,          // Multiple cancellations in short time
    trade_blocked: 5,          // Trade blocked by our system
    ownership_failed: 40,      // Item ownership verification failed
};

// Thresholds
const HIGH_RISK_THRESHOLD = 100;
const RAPID_CANCEL_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const RAPID_CANCEL_COUNT = 3; // 3 cancels in 30 min = suspicious

class ScamProtectionService {

    /**
     * Hash API key for storage (for change detection)
     */
    hashApiKey(apiKey) {
        return crypto.createHash('sha256').update(apiKey).digest('hex');
    }

    /**
     * Store API key hash when user registers their key
     */
    async storeApiKeyHash(steamId, apiKey) {
        const hash = this.hashApiKey(apiKey);
        await query(`
            UPDATE user_api_keys 
            SET api_key_hash = $1, last_verified_at = NOW() 
            WHERE steam_id = $2
        `, [hash, steamId]);

        console.log(`[ScamProtection] API key hash stored for ${steamId}`);
        return hash;
    }

    /**
     * Verify that user's API key hasn't changed since registration
     * Returns: { valid: boolean, changed: boolean }
     */
    async verifyApiKeyUnchanged(steamId, currentApiKey) {
        const result = await query(
            'SELECT api_key_hash FROM user_api_keys WHERE steam_id = $1',
            [steamId]
        );

        if (result.rows.length === 0) {
            return { valid: false, changed: false, reason: 'No API key registered' };
        }

        const storedHash = result.rows[0].api_key_hash;
        if (!storedHash) {
            // First time, no hash stored yet - store it now
            await this.storeApiKeyHash(steamId, currentApiKey);
            return { valid: true, changed: false };
        }

        const currentHash = this.hashApiKey(currentApiKey);
        if (currentHash !== storedHash) {
            // API KEY CHANGED! This is suspicious.
            await this.logSuspiciousActivity(steamId, 'api_key_changed', {
                message: 'Steam API key was changed since registration',
                previousHash: storedHash.substring(0, 8) + '...',
                newHash: currentHash.substring(0, 8) + '...',
            });

            return { valid: false, changed: true, reason: 'API key has been changed' };
        }

        // Update last verified timestamp
        await query(
            'UPDATE user_api_keys SET last_verified_at = NOW() WHERE steam_id = $1',
            [steamId]
        );

        return { valid: true, changed: false };
    }

    /**
     * Verify item is still in seller's inventory before sending trade
     */
    async verifyItemOwnership(steamId, assetId, appId = 730) {
        try {
            console.log(`[ScamProtection] Verifying ownership: ${assetId} for ${steamId}`);

            const inventory = await inventoryManager.getInventory(steamId, appId, 2);

            // Handle ghost inventory error
            if (inventory && inventory.error === 'GHOST_INVENTORY') {
                return {
                    valid: false,
                    reason: 'Inventory temporarily unavailable (Steam syncing)',
                    retryable: true
                };
            }

            if (!Array.isArray(inventory) || inventory.length === 0) {
                await this.logSuspiciousActivity(steamId, 'ownership_failed', {
                    assetId,
                    reason: 'Inventory empty or inaccessible'
                });
                return { valid: false, reason: 'Cannot verify inventory', retryable: true };
            }

            const item = inventory.find(i => i.assetid === assetId || i.assetid === String(assetId));

            if (!item) {
                await this.logSuspiciousActivity(steamId, 'item_missing', {
                    assetId,
                    reason: 'Item not found in seller inventory before trade'
                });
                return { valid: false, reason: 'Item no longer in inventory' };
            }

            // Check tradability
            if (item.tradable === false || item.tradable === 0) {
                return { valid: false, reason: 'Item is not tradable (trade lock active)' };
            }

            console.log(`[ScamProtection] Ownership verified: ${item.name || assetId}`);
            return { valid: true, item };

        } catch (err) {
            console.error(`[ScamProtection] Ownership check failed:`, err.message);
            return { valid: false, reason: err.message, retryable: true };
        }
    }

    /**
     * Log suspicious activity to database
     */
    async logSuspiciousActivity(steamId, eventType, details = {}) {
        const riskScore = RISK_WEIGHTS[eventType] || 10;

        try {
            await query(`
                INSERT INTO user_scam_logs (steam_id, event_type, details, risk_score)
                VALUES ($1, $2, $3, $4)
            `, [steamId, eventType, JSON.stringify(details), riskScore]);

            console.warn(`[ScamProtection] ⚠️ Logged: ${eventType} for ${steamId} (+${riskScore} risk)`);

            // Update cached risk score
            await this.updateRiskScore(steamId);

        } catch (err) {
            console.error(`[ScamProtection] Failed to log activity:`, err.message);
        }
    }

    /**
     * Calculate and cache user's total risk score
     */
    async calculateRiskScore(steamId) {
        const result = await query(`
            SELECT 
                SUM(risk_score) as total_risk,
                COUNT(*) as event_count,
                jsonb_object_agg(event_type, cnt) as flags
            FROM (
                SELECT event_type, risk_score, COUNT(*) as cnt
                FROM user_scam_logs 
                WHERE steam_id = $1 
                  AND created_at > NOW() - INTERVAL '30 days'
                  AND resolved = FALSE
                GROUP BY event_type, risk_score
            ) sub
        `, [steamId]);

        const { total_risk, event_count, flags } = result.rows[0] || {};

        return {
            riskScore: parseInt(total_risk) || 0,
            eventCount: parseInt(event_count) || 0,
            flags: flags || {},
            isHighRisk: (parseInt(total_risk) || 0) >= HIGH_RISK_THRESHOLD
        };
    }

    /**
     * Update cached risk score for performance
     */
    async updateRiskScore(steamId) {
        const { riskScore, flags } = await this.calculateRiskScore(steamId);

        await query(`
            INSERT INTO user_risk_scores (steam_id, risk_score, flags, last_calculated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (steam_id) 
            DO UPDATE SET risk_score = $2, flags = $3, last_calculated_at = NOW()
        `, [steamId, riskScore, JSON.stringify(flags)]);
    }

    /**
     * Get cached risk score (fast lookup)
     */
    async getRiskScore(steamId) {
        const result = await query(
            'SELECT risk_score, flags, last_calculated_at FROM user_risk_scores WHERE steam_id = $1',
            [steamId]
        );

        if (result.rows.length === 0) {
            return { riskScore: 0, isHighRisk: false, flags: {} };
        }

        const { risk_score, flags } = result.rows[0];
        return {
            riskScore: risk_score,
            isHighRisk: risk_score >= HIGH_RISK_THRESHOLD,
            flags: flags || {}
        };
    }

    /**
     * Check for rapid cancellation pattern
     */
    async checkRapidCancellations(steamId) {
        const result = await query(`
            SELECT COUNT(*) as cancel_count
            FROM user_scam_logs 
            WHERE steam_id = $1 
              AND event_type = 'rapid_cancel'
              AND created_at > NOW() - INTERVAL '30 minutes'
        `, [steamId]);

        const count = parseInt(result.rows[0]?.cancel_count) || 0;

        if (count >= RAPID_CANCEL_COUNT) {
            console.warn(`[ScamProtection] ⚠️ Rapid cancellation detected for ${steamId}: ${count} in 30min`);
            return { suspicious: true, count };
        }

        return { suspicious: false, count };
    }

    /**
     * Pre-flight checks before sending any trade
     * Call this before bot.sendTradeOffer()
     */
    async preTradeCheck(sellerSteamId, buyerSteamId, assetId, appId = 730) {
        const checks = {
            itemOwnership: null,
            sellerRisk: null,
            buyerRisk: null,
            passed: false,
            reason: null
        };

        // 1. Verify item ownership
        checks.itemOwnership = await this.verifyItemOwnership(sellerSteamId, assetId, appId);
        if (!checks.itemOwnership.valid) {
            checks.reason = checks.itemOwnership.reason;
            return checks;
        }

        // 2. Check seller risk score
        checks.sellerRisk = await this.getRiskScore(sellerSteamId);
        if (checks.sellerRisk.isHighRisk) {
            checks.reason = 'Seller account flagged for suspicious activity';
            await this.logSuspiciousActivity(sellerSteamId, 'trade_blocked', {
                reason: 'High risk score blocked trade',
                riskScore: checks.sellerRisk.riskScore
            });
            return checks;
        }

        // 3. Check buyer risk score
        checks.buyerRisk = await this.getRiskScore(buyerSteamId);
        if (checks.buyerRisk.isHighRisk) {
            checks.reason = 'Buyer account flagged for suspicious activity';
            return checks;
        }

        checks.passed = true;
        return checks;
    }
}

module.exports = new ScamProtectionService();
