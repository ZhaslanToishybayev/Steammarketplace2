// Base types
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// User types
export interface User extends BaseEntity {
  steamId: string;
  username: string;
  displayName?: string;
  email?: string;
  avatar: string;
  avatarFull?: string;
  avatarMedium?: string;
  tradeUrl?: string;
  balance: number;
  role: 'user' | 'moderator' | 'admin';
  isAdmin: boolean;
  status: 'active' | 'banned' | 'suspended';
  isEmailVerified: boolean;
  isTradeEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  steamLevel?: number;
  profileVisibility: 'public' | 'friends' | 'private';
  tradeOffers: 'everyone' | 'friends' | 'disabled';
  inventoryVisibility: 'public' | 'friends' | 'private';
}

export interface UserProfile {
  bio?: string;
  location?: string;
  website?: string;
  discord?: string;
  twitter?: string;
  steamGroup?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    tradeUpdates: boolean;
    priceAlerts: boolean;
    systemUpdates: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'system';
    currency: string;
    compactMode: boolean;
    showRarityColors: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    tradeOffers: 'everyone' | 'friends' | 'disabled';
    inventoryVisibility: 'public' | 'friends' | 'private';
  };
}

// Item types
export interface Item extends BaseEntity {
  name: string;
  description?: string;
  image: string;
  icon?: string;
  iconUrl?: string;
  gameId: string;
  game: Game;
  appId: number;
  appIdName: string;
  rarity: ItemRarity;
  quality: ItemQuality;
  type: ItemType;
  marketHashName: string;
  marketName: string;
  steamMarketUrl?: string;
  suggestedPrice: number;
  avgPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  float?: number;
  pattern?: number;
  stickers?: ItemSticker[];
  paintSeed?: number;
  paintWear?: number;
  isTradeable: boolean;
  tradableAfter?: string;
  isMarketable: boolean;
  isCommodity: boolean;
  tags: ItemTag[];
  inventoryItems?: InventoryItem[];
  listings?: MarketListing[];
  priceHistory?: PricePoint[];
  volume?: number;
  marketable: boolean;
  commodity: boolean;
  marketableRestriction?: number;
}

export interface ItemRarity {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface ItemQuality {
  id: string;
  name: string;
  color: string;
}

export interface ItemType {
  id: string;
  name: string;
  category?: string;
}

export interface ItemSticker {
  id: string;
  name: string;
  image: string;
  slot: number;
  wear: number;
  price: number;
}

export interface ItemTag {
  id: string;
  name: string;
  category: string;
  color?: string;
}

export interface Game {
  id: string;
  appId: number;
  name: string;
  icon: string;
  logo?: string;
  background?: string;
  supported: boolean;
}

// Inventory types
export interface Inventory extends BaseEntity {
  userId: string;
  user: User;
  gameId: string;
  game: Game;
  items: InventoryItem[];
  totalItems: number;
  totalValue: number;
  lastSyncedAt: string;
  syncStatus: 'syncing' | 'completed' | 'failed';
  syncError?: string;
}

export interface InventoryItem extends BaseEntity {
  inventoryId: string;
  steamAssetId: string;
  steamInstanceId: string;
  steamClassId: string;
  description: Item;
  amount: number;
  inTrade: boolean;
  tradeLockUntil?: string;
  marketable: boolean;
  tradable: boolean;
  tags?: ItemTag[];
  stickers?: ItemSticker[];
  float?: number;
  pattern?: number;
  price: number;
  isSelected?: boolean;
  wear?: ItemWear;
}

export interface ItemWear {
  id: string;
  name: string;
  abbreviation: string;
  order: number;
}

// Trade types
export interface Trade extends BaseEntity {
  tradeId?: string;
  status: TradeStatus;
  type: 'offer' | 'request';
  items: TradeItem[];
  totalValue: number;
  participants: TradeParticipants;
  message?: string;
  expiresAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  errorMessage?: string;
  tradeOfferId?: string;
  tradeUrl?: string;
  isPublic: boolean;
  visibility: 'public' | 'private';
  tags: string[];
  metadata?: Record<string, any>;
}

export interface TradeItem {
  id: string;
  tradeId: string;
  item: Item;
  quantity: number;
  price: number;
  side: 'sender' | 'recipient';
}

export interface TradeParticipants {
  sender: TradeParticipant;
  recipient: TradeParticipant;
}

export interface TradeParticipant {
  userId: string;
  user: User;
  acceptedAt?: string;
  declinedAt?: string;
  cancelledAt?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  tradeToken?: string;
}

export type TradeStatus =
  | 'pending'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'expired'
  | 'failed';

// Market types
export interface MarketListing extends BaseEntity {
  sellerId: string;
  seller: User;
  itemId: string;
  item: Item;
  inventoryItemId?: string;
  inventoryItem?: InventoryItem;
  price: number;
  originalPrice: number;
  discountPercent?: number;
  quantity: number;
  condition?: ItemCondition;
  description?: string;
  status: ListingStatus;
  visibility: 'public' | 'private';
  expiresAt?: string;
  soldAt?: string;
  cancelledAt?: string;
  buyerId?: string;
  buyer?: User;
  transaction?: Transaction;
  tags: string[];
  views: number;
  favorites: number;
  isActive: boolean;
  isFeatured: boolean;
  isPromoted: boolean;
}

export interface ItemCondition {
  wear?: ItemWear;
  float?: number;
  pattern?: number;
  stickers?: ItemSticker[];
  quality?: ItemQuality;
  rarity?: ItemRarity;
}

export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'expired' | 'pending';

// Wallet and Transaction types
export interface Wallet extends BaseEntity {
  userId: string;
  user: User;
  balance: number;
  pendingBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  currency: string;
  status: 'active' | 'frozen' | 'suspended';
  lastTransactionAt?: string;
  transactions: Transaction[];
}

export interface Transaction extends BaseEntity {
  userId: string;
  user: User;
  walletId: string;
  wallet: Wallet;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  description: string;
  referenceId?: string;
  externalId?: string;
  metadata?: Record<string, any>;
  processedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  source?: TransactionSource;
  destination?: TransactionDestination;
  ipAddress?: string;
  userAgent?: string;
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'trade'
  | 'bonus'
  | 'fee'
  | 'refund'
  | 'transfer'
  | 'chargeback';

export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'disputed'
  | 'chargeback';

export interface TransactionSource {
  type: 'wallet' | 'bank' | 'crypto' | 'card' | 'paypal';
  details: Record<string, any>;
}

export interface TransactionDestination {
  type: 'wallet' | 'bank' | 'crypto' | 'card' | 'paypal';
  details: Record<string, any>;
}

// Notification types
export interface Notification extends BaseEntity {
  userId: string;
  user: User;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  readAt?: string;
  read: boolean;
  archivedAt?: string;
  archived: boolean;
  expiresAt?: string;
  actionUrl?: string;
  actionText?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  deliveredChannels: string[];
  metadata?: Record<string, any>;
}

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'trade'
  | 'market'
  | 'security'
  | 'system'
  | 'promotion';

// Admin types
export interface AdminDashboard {
  totalUsers: number;
  activeUsers: number;
  totalTrades: number;
  activeTrades: number;
  totalVolume: number;
  todayVolume: number;
  totalFees: number;
  systemHealth: SystemHealth;
  recentActivity: AdminActivity[];
  userStatistics: UserStatistics;
  tradeStatistics: TradeStatistics;
  financialStatistics: FinancialStatistics;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  cpu: number;
  memory: number;
  disk: number;
  database: boolean;
  cache: boolean;
  queue: boolean;
  lastCheck: string;
  issues: SystemIssue[];
}

export interface SystemIssue {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
  createdAt: string;
}

export interface AdminActivity {
  type: string;
  description: string;
  userId?: string;
  user?: User;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface UserStatistics {
  total: number;
  verified: number;
  banned: number;
  suspended: number;
  premium: number;
  growth: {
    day: number;
    week: number;
    month: number;
  };
}

export interface TradeStatistics {
  total: number;
  completed: number;
  cancelled: number;
  disputed: number;
  successRate: number;
  avgValue: number;
  growth: {
    day: number;
    week: number;
    month: number;
  };
}

export interface FinancialStatistics {
  totalVolume: number;
  totalFees: number;
  deposits: number;
  withdrawals: number;
  balance: number;
  growth: {
    day: number;
    week: number;
    month: number;
  };
}

// Bot configuration types (for admin configuration)
export interface BotConfigProfile extends BaseEntity {
  name: string;
  autoAccept: boolean;
  maxTradeValue: number;
  minTradeValue: number;
  allowedGames: string[];
  allowedRarities: string[];
  blockedUsers: string[];
  tradeMessage: string;
  autoDeclineReason: string;
  restrictions: {
    maxTradesPerHour: number;
    maxTradesPerDay: number;
    maxItemsPerTrade: number;
    cooldownMinutes: number;
    allowedHours: number[];
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface PricePoint {
  timestamp: string;
  price: number;
  volume?: number;
  count?: number;
}

// Form types
export interface TradeFormData {
  items: InventoryItem[];
  tradeUrl: string;
  message?: string;
}

export interface FilterFormData {
  gameId?: string;
  rarity?: string[];
  wear?: string[];
  minPrice?: number;
  maxPrice?: number;
  minFloat?: number;
  maxFloat?: number;
  search?: string;
  sort?: string;
}

export interface UserProfileFormData {
  username: string;
  email: string;
  bio?: string;
  location?: string;
  website?: string;
  discord?: string;
  twitter?: string;
  tradeUrl?: string;
  preferences: UserPreferences;
}

// WebSocket types
export interface SocketEvent {
  type: string;
  data: any;
  timestamp: string;
  userId?: string;
}

export interface TradeUpdateEvent {
  tradeId: string;
  status: TradeStatus;
  items: TradeItem[];
  participants: TradeParticipants;
  message?: string;
}

// File upload types
export interface FileUpload {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
  uploadedAt: string;
  uploadedBy: string;
}

// Search types
export interface SearchQuery {
  q: string;
  gameId?: string;
  type?: string;
  rarity?: string[];
  wear?: string[];
  priceRange?: [number, number];
  floatRange?: [number, number];
  sort?: string;
  page?: number;
  limit?: number;
}

export interface SearchResults {
  items: Item[];
  total: number;
  facets: SearchFacets;
  suggestions: string[];
}

export interface SearchFacets {
  games: Record<string, number>;
  rarities: Record<string, number>;
  wear: Record<string, number>;
  price: {
    min: number;
    max: number;
  };
  float: {
    min: number;
    max: number;
  };
}

// Bot types
export enum BotStatus {
  IDLE = 'IDLE',
  TRADING = 'TRADING',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR'
}

export interface Bot extends BaseEntity {
  steamId: string | null;
  accountName: string;
  tradeUrl: string | null;
  isActive: boolean;
  isOnline: boolean;
  isBusy: boolean;
  maxConcurrentTrades: number;
  currentTradeCount: number;
  totalTradesCompleted: number;
  lastLoginAt: string | null;
  lastTradeAt: string | null;
  status: BotStatus;
  statusMessage: string | null;
  currentSteamApiKey: string | null;
  isSteamApiKeyValid: boolean;
  loginAttempts: number;
  lastLoginAttemptAt: string | null;
  lastLoginError: string | null;
  tradeOffersSent: number;
  tradeOffersReceived: number;
  tradeOffersAccepted: number;
}

export interface CreateBotDto {
  accountName: string;
  password: string;
  sharedSecret: string;
  identitySecret: string;
  steamGuardCode?: string;
  apiKey?: string;
  maxConcurrentTrades?: number;
}

export interface UpdateBotDto {
  accountName?: string;
  password?: string;
  sharedSecret?: string;
  identitySecret?: string;
  steamGuardCode?: string;
  apiKey?: string;
  maxConcurrentTrades?: number;
  isActive?: boolean;
  tradeUrl?: string;
}

export interface BotStatistics {
  totalBots: number;
  onlineBots: number;
  activeBots: number;
  tradingBots: number;
  totalTradesCompleted: number;
  totalTradeVolume: number;
  averageTradeValue: number;
  successRate: number;
  botPerformance: Array<{
    botId: string;
    botName: string;
    tradesCompleted: number;
    tradeVolume: number;
    successRate: number;
    uptimePercentage: number;
  }>;
}

export interface BotActionResponse {
  success: boolean;
  message: string;
  botId: string;
  action: string;
  timestamp: string;
}

export interface BotLog {
  id: string;
  botId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface BotTradeHistory {
  id: string;
  botId: string;
  tradeId: string;
  type: 'sent' | 'received';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  items: Array<{
    id: string;
    name: string;
    image: string;
    value: number;
  }>;
  totalValue: number;
  createdAt: string;
  updatedAt: string;
}