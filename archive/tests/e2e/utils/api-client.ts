/**
 * API Client Utility for E2E Tests
 * Provides reusable methods for testing API endpoints with Supertest
 */

import * as request from 'supertest';
import { testConfig } from '../setup/test-config';

// Type definitions for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: number;
  steamId: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  isTradeUrlValid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Trade {
  id: number;
  userId: number;
  botId: number;
  steamTradeId?: string;
  status: 'PENDING' | 'SENT' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRADE';
  offerItems: any[];
  requestItems: any[];
  profit: number;
  fee: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface Item {
  id: string;
  name: string;
  appId: number;
  classId: string;
  instanceId: string;
  description: string;
  type: string;
  rarity: string;
  quality: string;
  iconUrl: string;
  tradable: boolean;
  marketable: boolean;
  float?: number;
  wear?: string;
}

export interface Price {
  itemId: string;
  steamPrice: number;
  csgoFloatPrice?: number;
  buff163Price?: number;
  lastUpdated: Date;
}

export interface Balance {
  id: number;
  userId: number;
  amount: number;
  currency: string;
  updatedAt: Date;
}

export interface Transaction {
  id: number;
  userId: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRADE' | 'FEE' | 'REFERRAL';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bot {
  id: number;
  accountName: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  maxConcurrentTrades: number;
  currentTrades: number;
  lastLoginAt?: Date;
}

/**
 * API Client class for E2E testing
 */
export class ApiClient {
  private baseUrl: string;
  private authToken?: string;
  private refreshToken?: string;
  private userAgent: string = 'E2E-Test-Client/1.0';

  constructor(baseUrl: string = testConfig.apiUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set authentication token
   */
  setAuth(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    this.authToken = undefined;
    this.refreshToken = undefined;
  }

  /**
   * Make HTTP request with automatic retry and logging
   */
  private async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any,
    options: { retries?: number; timeout?: number } = {}
  ): Promise<any> {
    const {
      retries = testConfig.retry.maxRetries,
      timeout = testConfig.timeouts.api
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const req = request(this.baseUrl)
          [method.toLowerCase()](endpoint)
          .set('User-Agent', this.userAgent)
          .set('Accept', 'application/json')
          .timeout(timeout);

        // Add auth header if available
        if (this.authToken) {
          req.set('Authorization', `Bearer ${this.authToken}`);
        }

        // Add request data for non-GET requests
        if (data && method !== 'GET') {
          req.send(data)
            .set('Content-Type', 'application/json');
        }

        const response = await req;

        // Log request details
        this.logRequest(method, endpoint, response.status, attempt);

        return response;

      } catch (error) {
        lastError = error as Error;

        this.logError(method, endpoint, error, attempt);

        // Don't retry on 4xx client errors (except 401/403)
        if (error.status >= 400 && error.status < 500 &&
            error.status !== 401 && error.status !== 403) {
          break;
        }

        // Wait before retry with exponential backoff
        if (attempt < retries) {
          const delay = testConfig.retry.baseDelay * Math.pow(2, attempt - 1);
          await this.delay(Math.min(delay, testConfig.retry.maxDelay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Authentication endpoints
   */
  async steamLogin(): Promise<any> {
    return this.makeRequest('GET', '/auth/steam');
  }

  async steamCallback(steamId: string = testConfig.users.regular.steamId): Promise<any> {
    const params = new URLSearchParams({
      'openid.claimed_id': `http://steamcommunity.com/profiles/${steamId}`,
      'openid.identity': `http://steamcommunity.com/profiles/${steamId}`,
      'openid.mode': 'id_res',
      'openid.ns': 'http://specs.openid.net/auth/2.0'
    });

    return this.makeRequest('GET', `/auth/steam/return?${params}`);
  }

  async getMe(): Promise<ApiResponse<User>> {
    return this.makeRequest('GET', '/auth/me');
  }

  async updateTradeUrl(tradeUrl: string): Promise<ApiResponse> {
    return this.makeRequest('PATCH', '/auth/trade-url', { tradeUrl });
  }

  async refreshToken(): Promise<ApiResponse> {
    return this.makeRequest('POST', '/auth/refresh');
  }

  async logout(): Promise<ApiResponse> {
    return this.makeRequest('POST', '/auth/logout');
  }

  /**
   * Inventory endpoints
   */
  async getInventory(options: { appId?: number; limit?: number; offset?: number } = {}): Promise<ApiResponse<Item[]>> {
    const params = new URLSearchParams();
    if (options.appId) params.append('appId', options.appId.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    return this.makeRequest('GET', `/inventory${queryString ? '?' + queryString : ''}`);
  }

  async syncInventory(): Promise<ApiResponse> {
    return this.makeRequest('POST', '/inventory/sync');
  }

  async getSyncStatus(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/inventory/sync-status');
  }

  async getInventoryStatistics(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/inventory/statistics');
  }

  /**
   * Trading endpoints
   */
  async createTrade(data: {
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRADE';
    offerItems: any[];
    requestItems?: any[];
    depositAmount?: number;
    withdrawAmount?: number;
  }): Promise<ApiResponse<Trade>> {
    return this.makeRequest('POST', '/trades', data);
  }

  async getTrades(options: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<Trade[]>> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });

    const queryString = params.toString();
    return this.makeRequest('GET', `/trades${queryString ? '?' + queryString : ''}`);
  }

  async getTrade(id: number): Promise<ApiResponse<Trade>> {
    return this.makeRequest('GET', `/trades/${id}`);
  }

  async cancelTrade(id: number): Promise<ApiResponse> {
    return this.makeRequest('POST', `/trades/${id}/cancel`);
  }

  async getTradeStatus(id: number): Promise<ApiResponse<Trade>> {
    return this.makeRequest('GET', `/trades/${id}/status`);
  }

  async getTradingStatistics(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/trades/statistics');
  }

  /**
   * Pricing endpoints
   */
  async getItemPrice(itemId: string): Promise<ApiResponse<Price>> {
    return this.makeRequest('GET', `/pricing/item/${itemId}`);
  }

  async getPriceHistory(itemId: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/pricing/history/${itemId}`);
  }

  async getPriceTrends(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/pricing/trends');
  }

  async calculateProfit(offerItems: any[], requestItems: any[]): Promise<ApiResponse> {
    return this.makeRequest('POST', '/pricing/calculate-profit', { offerItems, requestItems });
  }

  /**
   * Wallet endpoints
   */
  async getBalance(): Promise<ApiResponse<Balance>> {
    return this.makeRequest('GET', '/wallet/balance');
  }

  async createDeposit(data: {
    amount: number;
    paymentMethod: 'stripe' | 'paypal' | 'crypto';
    currency?: string;
  }): Promise<ApiResponse<Transaction>> {
    return this.makeRequest('POST', '/wallet/deposits', data);
  }

  async createWithdrawal(data: {
    amount: number;
    paymentMethod: 'stripe' | 'paypal' | 'crypto';
    currency?: string;
  }): Promise<ApiResponse<Transaction>> {
    return this.makeRequest('POST', '/wallet/withdrawals', data);
  }

  async getTransactions(options: {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<Transaction[]>> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });

    const queryString = params.toString();
    return this.makeRequest('GET', `/wallet/transactions${queryString ? '?' + queryString : ''}`);
  }

  async applyReferralCode(code: string): Promise<ApiResponse> {
    return this.makeRequest('POST', '/wallet/referrals/apply', { code });
  }

  /**
   * Admin endpoints
   */
  async getAdminDashboard(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/admin/dashboard');
  }

  async getUsers(options: {
    search?: string;
    role?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });

    const queryString = params.toString();
    return this.makeRequest('GET', `/admin/users${queryString ? '?' + queryString : ''}`);
  }

  async getUserDetails(id: number): Promise<ApiResponse> {
    return this.makeRequest('GET', `/admin/users/${id}`);
  }

  async updateUserRole(id: number, role: string): Promise<ApiResponse> {
    return this.makeRequest('PATCH', `/admin/users/${id}/role`, { role });
  }

  async banUser(id: number, reason: string, duration?: number): Promise<ApiResponse> {
    return this.makeRequest('POST', `/admin/users/${id}/ban`, { reason, duration });
  }

  async getBots(): Promise<ApiResponse<Bot[]>> {
    return this.makeRequest('GET', '/admin/bots');
  }

  async createBot(data: {
    accountName: string;
    password: string;
    sharedSecret: string;
    identitySecret: string;
    maxConcurrentTrades: number;
  }): Promise<ApiResponse<Bot>> {
    return this.makeRequest('POST', '/admin/bots', data);
  }

  async updateBotStatus(id: number, status: string): Promise<ApiResponse> {
    return this.makeRequest('PATCH', `/admin/bots/${id}/status`, { status });
  }

  async getTradesForAdmin(options: {
    status?: string;
    userId?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });

    const queryString = params.toString();
    return this.makeRequest('GET', `/admin/trades${queryString ? '?' + queryString : ''}`);
  }

  async forceCompleteTrade(id: number, reason: string): Promise<ApiResponse> {
    return this.makeRequest('POST', `/admin/trades/${id}/force-complete`, { reason });
  }

  async getConfig(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/admin/config');
  }

  async updateConfig(key: string, value: any): Promise<ApiResponse> {
    return this.makeRequest('PATCH', `/admin/config/${key}`, { value });
  }

  async getAuditLogs(options: {
    userId?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });

    const queryString = params.toString();
    return this.makeRequest('GET', `/admin/audit-logs${queryString ? '?' + queryString : ''}`);
  }

  // Helper methods

  /**
   * Assert successful response
   */
  assertSuccess(response: any, expectedStatus: number = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(true);
  }

  /**
   * Assert error response
   */
  assertError(response: any, expectedStatus: number, expectedError?: string): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(false);
    if (expectedError) {
      expect(response.body.error).toContain(expectedError);
    }
  }

  /**
   * Assert validation error
   */
  assertValidationError(response: any, field: string): void {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[field]).toBeDefined();
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log request details
   */
  private logRequest(method: string, endpoint: string, status: number, attempt: number): void {
    console.log(`API ${method} ${endpoint} - ${status} (attempt ${attempt})`);
  }

  /**
   * Log request error
   */
  private logError(method: string, endpoint: string, error: any, attempt: number): void {
    console.error(`API ${method} ${endpoint} - ERROR (attempt ${attempt}):`, error.message);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();