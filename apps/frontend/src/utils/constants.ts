// Game IDs
export const GAMES = {
  CS2: '730',
  CSGO: '730', // CS:GO and CS2 share the same app ID
  DOTA2: '570',
  TF2: '440',
  RUST: '252490',
  PUBG: '578080',
} as const;

export type GameId = keyof typeof GAMES;

// Rarity levels
export const RARITIES = [
  { id: 'common', name: 'Common', color: 'gray', weight: 1 },
  { id: 'uncommon', name: 'Uncommon', color: 'green', weight: 2 },
  { id: 'rare', name: 'Rare', color: 'blue', weight: 3 },
  { id: 'mythical', name: 'Mythical', color: 'purple', weight: 4 },
  { id: 'legendary', name: 'Legendary', color: 'orange', weight: 5 },
  { id: 'ancient', name: 'Ancient', color: 'red', weight: 6 },
  { id: 'immortal', name: 'Immortal', color: 'gold', weight: 7 },
] as const;

export type RarityId = typeof RARITIES[number]['id'];

// CS:GO/CS2 Wear levels
export const WEAR_LEVELS = [
  { id: 'factory_new', name: 'Factory New', abbreviation: 'FN' },
  { id: 'minimal_wear', name: 'Minimal Wear', abbreviation: 'MW' },
  { id: 'field_tested', name: 'Field-Tested', abbreviation: 'FT' },
  { id: 'well_worn', name: 'Well-Worn', abbreviation: 'WW' },
  { id: 'battle_scarred', name: 'Battle-Scarred', abbreviation: 'BS' },
] as const;

export type WearId = typeof WEAR_LEVELS[number]['id'];

// Trade statuses
export const TRADE_STATUSES = {
  PENDING: 'pending',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
} as const;

export type TradeStatus = typeof TRADE_STATUSES[keyof typeof TRADE_STATUSES];

// User roles
export const USER_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Transaction types
export const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  TRADE: 'trade',
  BONUS: 'bonus',
  FEE: 'fee',
  REFUND: 'refund',
  TRANSFER: 'transfer',
} as const;

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];

// Transaction statuses
export const TRANSACTION_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type TransactionStatus = typeof TRANSACTION_STATUSES[keyof typeof TRANSACTION_STATUSES];

// Notification types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  TRADE: 'trade',
  SYSTEM: 'system',
  SECURITY: 'security',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Payment methods
export const PAYMENT_METHODS = {
  STEAM_WALLET: 'steam_wallet',
  CRYPTO_BTC: 'crypto_btc',
  CRYPTO_ETH: 'crypto_eth',
  CRYPTO_USDT: 'crypto_usdt',
  CARD_VISA: 'card_visa',
  CARD_MC: 'card_mc',
  PAYPAL: 'paypal',
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

// Sort options
export const SORT_OPTIONS = {
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  RARITY: 'rarity',
  FLOAT_ASC: 'float_asc',
  FLOAT_DESC: 'float_desc',
  NEWEST: 'newest',
  OLDEST: 'oldest',
} as const;

export type SortOption = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS];

// Filter options
export const FILTER_OPTIONS = {
  GAMES: Object.entries(GAMES).map(([key, value]) => ({
    id: value,
    name: key,
  })),
  RARITIES: RARITIES.map(rarity => ({
    id: rarity.id,
    name: rarity.name,
    color: rarity.color,
  })),
  WEAR_LEVELS: WEAR_LEVELS.map(wear => ({
    id: wear.id,
    name: wear.name,
    abbreviation: wear.abbreviation,
  })),
} as const;

// Currency options
export const CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  RUB: 'RUB',
  BRL: 'BRL',
} as const;

export type Currency = typeof CURRENCIES[keyof typeof CURRENCIES];

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_ME: '/api/auth/me',
  AUTH_STEAM: '/api/auth/steam',
  AUTH_STEAM_CALLBACK: '/api/auth/steam/callback',
  AUTH_TRADE_URL: '/api/auth/trade-url',

  // User
  USER_PROFILE: '/api/user/profile',
  USER_SETTINGS: '/api/user/settings',
  USER_STATISTICS: '/api/user/statistics',
  USER_NOTIFICATIONS: '/api/user/notifications',

  // Inventory
  INVENTORY: '/api/inventory',
  INVENTORY_SYNC: '/api/inventory/sync',
  INVENTORY_ITEM: '/api/inventory/item',

  // Items
  ITEMS: '/api/items',
  ITEM_DETAIL: '/api/items/:id',
  ITEM_PRICING: '/api/items/:id/pricing',
  ITEM_HISTORY: '/api/items/:id/history',

  // Trades
  TRADES: '/api/trades',
  TRADE_DETAIL: '/api/trades/:id',
  TRADE_CREATE: '/api/trades',
  TRADE_RESPOND: '/api/trades/:id/respond',
  TRADE_CANCEL: '/api/trades/:id/cancel',
  TRADE_STATISTICS: '/api/trades/statistics',

  // Wallet
  WALLET_BALANCE: '/api/wallet/balance',
  WALLET_TRANSACTIONS: '/api/wallet/transactions',
  WALLET_DEPOSIT: '/api/wallet/deposit',
  WALLET_WITHDRAW: '/api/wallet/withdraw',
  WALLET_TRANSFER: '/api/wallet/transfer',
  WALLET_METHODS: '/api/wallet/payment-methods',

  // Market
  MARKET_LISTINGS: '/api/market/listings',
  MARKET_CREATE: '/api/market/create',
  MARKET_BUY: '/api/market/:id/buy',
  MARKET_CANCEL: '/api/market/:id/cancel',

  // Admin
  ADMIN_DASHBOARD: '/api/admin/dashboard',
  ADMIN_USERS: '/api/admin/users',
  ADMIN_TRADES: '/api/admin/trades',
  ADMIN_BOTS: '/api/admin/bots',
  ADMIN_CONFIG: '/api/admin/config',
  ADMIN_AUDIT: '/api/admin/audit',

  // Notifications
  NOTIFICATIONS: '/api/notifications',
  NOTIFICATIONS_READ: '/api/notifications/read',
  NOTIFICATIONS_READ_ALL: '/api/notifications/read-all',
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;

// File upload limits
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_IMAGE_DIMENSION: 2048,
} as const;

// Socket events
export const SOCKET_EVENTS = {
  // Trade events
  TRADE_UPDATE: 'trade:update',
  TRADE_COMPLETED: 'trade:completed',
  TRADE_ACCEPTED: 'trade:accepted',
  TRADE_DECLINED: 'trade:declined',
  TRADE_CANCELLED: 'trade:cancelled',

  // Notification events
  NOTIFICATION: 'notification',

  // Inventory events
  INVENTORY_UPDATED: 'inventory:updated',

  // Balance events
  BALANCE_UPDATED: 'balance:updated',

  // System events
  MAINTENANCE_SCHEDULED: 'maintenance:scheduled',
  SYSTEM_ALERT: 'system:alert',
} as const;

// Cache keys
export const CACHE_KEYS = {
  AUTH: 'auth',
  USER: 'user',
  INVENTORY: 'inventory',
  TRADES: 'trades',
  WALLET: 'wallet',
  MARKET: 'market',
  NOTIFICATIONS: 'notifications',
  PRICING: 'pricing',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_PREFERENCES: 'userPreferences',
  THEME: 'theme',
  FILTERS: 'filters',
  TRADE_CART: 'tradeCart',
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_MARKETPLACE: true,
  ENABLE_TRADING: true,
  ENABLE_DEPOSITS: true,
  ENABLE_WITHDRAWALS: true,
  ENABLE_REFERRALS: false,
  ENABLE_BOTS: true,
  ENABLE_ADMIN_PANEL: true,
} as const;