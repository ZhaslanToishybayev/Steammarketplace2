/**
 * Validation Schemas (Zod)
 * Centralized input validation for all API endpoints
 */

const { z } = require('zod');

// ==================== COMMON SCHEMAS ====================

const SteamId = z.string().regex(/^\d{17}$/, 'Invalid Steam ID format');

const TradeUrl = z.string()
    .url('Must be a valid URL')
    .regex(
        /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[\w-]+$/,
        'Invalid Steam trade URL format'
    );

const Price = z.number()
    .positive('Price must be positive')
    .min(0.01, 'Minimum price is $0.01')
    .max(100000, 'Maximum price is $100,000');

const Pagination = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

// ==================== P2P SCHEMAS ====================

const P2PListingSchema = z.object({
    assetId: z.string().min(1, 'Asset ID is required').max(50),
    appId: z.coerce.number().int().default(730),
    price: Price,
    tradeUrl: TradeUrl,
});

const P2PBuySchema = z.object({
    buyerTradeUrl: TradeUrl,
});

// ==================== WALLET SCHEMAS ====================

const DepositSchema = z.object({
    amount: Price,
    idempotencyKey: z.string().uuid().optional(),
});

const WithdrawSchema = z.object({
    amount: Price,
    destination: z.string().min(1),
});

// ==================== ADMIN SCHEMAS ====================

const AdminLoginSchema = z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(6).max(100),
});

const AdminUserUpdateSchema = z.object({
    balance: z.number().optional(),
    is_banned: z.boolean().optional(),
    ban_reason: z.string().max(500).optional(),
});

// ==================== ESCROW SCHEMAS ====================

const ListingFiltersSchema = z.object({
    appId: z.coerce.number().int().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().max(1000000).optional(),
    minFloat: z.coerce.number().min(0).max(1).optional(),
    maxFloat: z.coerce.number().min(0).max(1).optional(),
    search: z.string().max(200).optional(),
    hasStickers: z.enum(['true', 'false']).optional(),
    sortBy: z.enum(['created_at', 'price', 'item_name']).default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    ...Pagination.shape,
});

// ==================== VALIDATION MIDDLEWARE ====================

/**
 * Creates validation middleware for request body
 */
function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: result.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            });
        }
        req.validatedBody = result.data;
        next();
    };
}

/**
 * Creates validation middleware for query params
 */
function validateQuery(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid query parameters',
                details: result.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            });
        }
        req.validatedQuery = result.data;
        next();
    };
}

/**
 * Creates validation middleware for route params
 */
function validateParams(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid route parameters',
                details: result.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            });
        }
        req.validatedParams = result.data;
        next();
    };
}

module.exports = {
    // Schemas
    SteamId,
    TradeUrl,
    Price,
    Pagination,
    P2PListingSchema,
    P2PBuySchema,
    DepositSchema,
    WithdrawSchema,
    AdminLoginSchema,
    AdminUserUpdateSchema,
    ListingFiltersSchema,

    // Middleware
    validateBody,
    validateQuery,
    validateParams,
};
