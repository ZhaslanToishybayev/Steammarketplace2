/**
 * Common TypeScript type definitions for the Steam Marketplace
 */

export interface Wallet {
  balance: number;
  pendingBalance: number;
}

export interface Reputation {
  positive: number;
  negative: number;
  total: number;
}

export interface UserSettings {
  notifications: boolean;
  privacy: 'public' | 'friends' | 'private';
}

export interface User {
  _id?: string;
  steamId: string;
  username: string;
  displayName?: string;
  steamName?: string;
  avatar?: string;
  wallet: Wallet;
  reputation: Reputation;
  settings: UserSettings;
  isAdmin: boolean;
  isBanned: boolean;
  steamInventory?: any[];
  gameInventories?: Map<string, any[]>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MarketListing {
  _id?: string;
  itemName: string;
  itemImage: string;
  description?: string;
  price: number;
  status: 'active' | 'pending_trade' | 'sold' | 'cancelled';
  seller: string | User;
  buyer?: string | User;
  tradeOfferId?: string;
  assetId?: string;
  appId: number;
  contextId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SteamItem {
  assetid: string;
  appid: number;
  contextid: string;
  classid: string;
  instanceid: string;
  icon_url: string;
  icon_url_large?: string;
  name: string;
  market_hash_name?: string;
  market_name?: string;
  type: string;
  color: string;
  tradable: boolean;
  marketable: boolean;
  commodity: number;
  market_tradable_restriction: number;
  market_marketable_restriction: number;
  fmarketable: boolean;
  app_data?: any;
  tags?: any[];
}

export interface TradeOffer {
  _id?: string;
  offerId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  listingId: string | MarketListing;
  buyer: string | User;
  seller: string | User;
  items: SteamItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Transaction {
  _id?: string;
  userId: string | User;
  listingId?: string | MarketListing;
  type: 'purchase' | 'sale' | 'refund';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod?: 'wallet' | 'stripe';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SteamBotConfig {
  username: string;
  password: string;
  sharedSecret: string;
  identitySecret: string;
  id?: number;
  steamId?: string;
  personaName?: string;
  isConnected?: boolean;
  isInitialized?: boolean;
  currentTrades?: number;
  inventory?: SteamItem[];
}

export interface SteamBotStatus {
  id: number;
  username: string;
  isConnected: boolean;
  isInitialized: boolean;
  currentTrades: number;
  inventoryCount: number;
}
