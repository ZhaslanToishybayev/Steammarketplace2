/**
 * Request ID Middleware
 * Adds unique request ID for tracing across services
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Adds a unique request ID to each request
 * - Uses existing X-Request-ID header if present (from load balancer)
 * - Generates new UUID if not present
 * - Attaches to req.id and response header
 */
function requestIdMiddleware(req, res, next) {
    // Use existing header or generate new
    const requestId = req.headers['x-request-id'] || uuidv4();

    // Attach to request object
    req.id = requestId;

    // Add to response headers
    res.setHeader('X-Request-ID', requestId);

    next();
}

module.exports = { requestIdMiddleware };
