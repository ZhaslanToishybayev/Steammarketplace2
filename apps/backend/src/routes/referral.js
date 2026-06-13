/**
 * Referral System Routes
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get user ID helper
const getUserId = (req) => {
    if (req.user?.steamId) return req.user.steamId;
    if (req.session?.passport?.user?.steamId) return req.session.passport.user.steamId;
    return null;
};

// Get user's referral info
router.get('/my', async (req, res) => {
    try {
        const steamId = getUserId(req);
        if (!steamId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        // Get user's referral code
        const userResult = await pool.query(
            'SELECT referral_code FROM users WHERE steam_id = $1',
            [steamId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        let referralCode = userResult.rows[0].referral_code;

        // Generate if not exists
        if (!referralCode) {
            referralCode = steamId.slice(-8).toUpperCase();
            await pool.query(
                'UPDATE users SET referral_code = $1 WHERE steam_id = $2',
                [referralCode, steamId]
            );
        }

        // Get referral stats
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_referrals,
                SUM(CASE WHEN bonus_given THEN bonus_amount ELSE 0 END) as total_earned,
                COUNT(CASE WHEN bonus_given THEN 1 END) as successful_referrals
            FROM referrals
            WHERE referrer_steam_id = $1
        `, [steamId]);

        const stats = statsResult.rows[0];

        // Get recent referrals
        const recentResult = await pool.query(`
            SELECT r.created_at, r.bonus_given, r.bonus_amount, u.username
            FROM referrals r
            JOIN users u ON r.referred_steam_id = u.steam_id
            WHERE r.referrer_steam_id = $1
            ORDER BY r.created_at DESC
            LIMIT 10
        `, [steamId]);

        res.json({
            success: true,
            data: {
                code: referralCode,
                referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?ref=${referralCode}`,
                stats: {
                    totalReferrals: parseInt(stats.total_referrals) || 0,
                    successfulReferrals: parseInt(stats.successful_referrals) || 0,
                    totalEarned: parseFloat(stats.total_earned) || 0
                },
                recentReferrals: recentResult.rows
            }
        });
    } catch (error) {
        console.error('Get referral info error:', error);
        res.status(500).json({ success: false, error: 'Failed to get referral info' });
    }
});

// Apply referral code (for new users)
router.post('/apply', async (req, res) => {
    try {
        const steamId = getUserId(req);
        if (!steamId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, error: 'Referral code required' });
        }

        // Check if user already has a referrer
        const existingRef = await pool.query(
            'SELECT id FROM referrals WHERE referred_steam_id = $1',
            [steamId]
        );

        if (existingRef.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Already used a referral code' });
        }

        // Find referrer
        const referrerResult = await pool.query(
            'SELECT steam_id FROM users WHERE referral_code = $1',
            [code.toUpperCase()]
        );

        if (referrerResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Invalid referral code' });
        }

        const referrerSteamId = referrerResult.rows[0].steam_id;

        // Can't refer yourself
        if (referrerSteamId === steamId) {
            return res.status(400).json({ success: false, error: 'Cannot use your own code' });
        }

        // Create referral record
        await pool.query(`
            INSERT INTO referrals (referrer_steam_id, referred_steam_id, referral_code)
            VALUES ($1, $2, $3)
        `, [referrerSteamId, steamId, code.toUpperCase()]);

        res.json({
            success: true,
            message: 'Referral code applied! You will receive a bonus after your first trade.'
        });
    } catch (error) {
        console.error('Apply referral error:', error);
        res.status(500).json({ success: false, error: 'Failed to apply referral code' });
    }
});

// Process referral bonus (called after successful trade)
async function processReferralBonus(steamId, tradeAmount) {
    try {
        // Check if user has a referrer and bonus not yet given
        const refResult = await pool.query(`
            SELECT id, referrer_steam_id 
            FROM referrals 
            WHERE referred_steam_id = $1 AND bonus_given = false
        `, [steamId]);

        if (refResult.rows.length === 0) return null;

        const referral = refResult.rows[0];
        const bonusAmount = Math.min(tradeAmount * 0.01, 5.00); // 1% of trade, max $5

        // Give bonus to referrer
        await pool.query('UPDATE users SET balance = balance + $1 WHERE steam_id = $2',
            [bonusAmount, referral.referrer_steam_id]);

        // Record transaction
        await pool.query(`
            INSERT INTO balance_transactions (steam_id, amount, type, description)
            VALUES ($1, $2, 'referral_bonus', $3)
        `, [referral.referrer_steam_id, bonusAmount, `Referral bonus for user ${steamId}`]);

        // Mark as processed
        await pool.query(
            'UPDATE referrals SET bonus_given = true, bonus_amount = $1 WHERE id = $2',
            [bonusAmount, referral.id]
        );

        return { referrerId: referral.referrer_steam_id, bonus: bonusAmount };
    } catch (e) {
        console.error('Process referral bonus error:', e);
        return null;
    }
}

router.processReferralBonus = processReferralBonus;

module.exports = router;
