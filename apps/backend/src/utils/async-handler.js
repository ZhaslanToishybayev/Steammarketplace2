/**
 * Async Handler Utility
 * Wraps async route handlers to catch errors and pass to error middleware.
 * Eliminates try/catch boilerplate in route handlers.
 * 
 * Usage:
 * router.get('/items', asyncHandler(async (req, res) => {
 *   const items = await ItemService.getAll();
 *   res.json(items);
 * }));
 * 
 * @module utils/async-handler
 */

// @ts-check

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {(req: Request, res: Response, next: NextFunction) => Promise<any>} AsyncRouteHandler
 */

/**
 * Wraps an async route handler to catch errors
 * @param {AsyncRouteHandler} fn - Async route handler function
 * @returns {(req: Request, res: Response, next: NextFunction) => void}
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Wraps multiple middlewares with async error handling
 * @param  {...AsyncRouteHandler} fns - Middleware functions
 * @returns {Array<(req: Request, res: Response, next: NextFunction) => void>}
 */
function asyncMiddleware(...fns) {
    return fns.map(fn => asyncHandler(fn));
}

/**
 * Creates an async handler with timeout
 * @param {AsyncRouteHandler} fn - Async route handler
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns {(req: Request, res: Response, next: NextFunction) => void}
 */
function asyncHandlerWithTimeout(fn, timeoutMs = 30000) {
    return (req, res, next) => {
        const timeout = setTimeout(() => {
            const err = new Error('Request timeout');
            err.statusCode = 408;
            next(err);
        }, timeoutMs);

        Promise.resolve(fn(req, res, next))
            .then(() => clearTimeout(timeout))
            .catch((err) => {
                clearTimeout(timeout);
                next(err);
            });
    };
}

module.exports = {
    asyncHandler,
    asyncMiddleware,
    asyncHandlerWithTimeout,
};
