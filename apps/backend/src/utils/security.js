/**
 * Security Validators
 * Input validation for security-critical data
 */

/**
 * Validate Steam ID format (17 digit number)
 */
function isValidSteamId(steamId) {
    if (!steamId || typeof steamId !== 'string') return false;
    return /^\d{17}$/.test(steamId);
}

/**
 * Validate Steam ID and throw if invalid
 */
function validateSteamId(steamId, fieldName = 'steamId') {
    if (!isValidSteamId(steamId)) {
        const error = new Error(`Invalid ${fieldName} format. Must be 17 digits.`);
        error.statusCode = 400;
        error.code = 'INVALID_STEAM_ID';
        throw error;
    }
    return steamId;
}

/**
 * Validate Steam Trade URL format
 */
function isValidTradeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const pattern = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[\w-]+$/;
    return pattern.test(url);
}

/**
 * Validate Trade URL and throw if invalid
 */
function validateTradeUrl(url, fieldName = 'tradeUrl') {
    if (!isValidTradeUrl(url)) {
        const error = new Error(`Invalid ${fieldName} format. Must be a valid Steam trade URL.`);
        error.statusCode = 400;
        error.code = 'INVALID_TRADE_URL';
        throw error;
    }
    return url;
}

/**
 * Validate URL protocol (prevent javascript: URLs)
 */
function isValidHttpUrl(url) {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * Sanitize string for safe URL inclusion
 * Removes any potentially dangerous characters
 */
function sanitizeForUrl(str) {
    if (!str || typeof str !== 'string') return '';
    // Remove any HTML/script tags
    return str
        .replace(/<[^>]*>/g, '')
        .replace(/[<>'"]/g, '')
        .substring(0, 200); // Limit length
}

/**
 * Sanitize username for display
 */
function sanitizeUsername(username) {
    if (!username || typeof username !== 'string') return 'Unknown User';
    // Remove HTML tags, limit length
    return username
        .replace(/<[^>]*>/g, '')
        .replace(/[<>]/g, '')
        .substring(0, 50);
}

/**
 * CSRF token generation
 */
function generateCsrfToken() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
}

module.exports = {
    isValidSteamId,
    validateSteamId,
    isValidTradeUrl,
    validateTradeUrl,
    isValidHttpUrl,
    sanitizeForUrl,
    sanitizeUsername,
    generateCsrfToken,
};
