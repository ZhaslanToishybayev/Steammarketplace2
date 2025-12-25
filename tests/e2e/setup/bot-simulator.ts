/**
 * Steam Bot Simulator
 * Simulates Steam bot behavior for testing trade flows without requiring live Steam accounts
 */

import { EventEmitter } from 'events';
import { testConfig } from './test-config';

export interface TradeOffer {
  id: string;
  partner: string;
  itemsFromMe: any[];
  itemsFromThem: any[];
  message: string;
  state: TradeOfferState;
  created: Date;
  updated: Date;
}

export enum TradeOfferState {
  Invalid = 1,
  Active = 2,
  Accepted = 3,
  Countered = 4,
  Expired = 5,
  Canceled = 6,
  Declined = 7,
  InvalidItems = 8,
  CreatedNeedsConfirmation = 9,
  CanceledByUser = 10,
  Queued = 11,
}

export interface BotCredentials {
  accountName: string;
  sharedSecret: string;
  identitySecret: string;
  steamId: string;
  sessionId: string;
  cookies: any[];
}

export interface MobileAuthenticator {
  deviceID: string;
  identitySecret: string;
  sharedSecret: string;
  revocationCode: string;
  uri: string;
}

export class BotSimulator extends EventEmitter {
  private credentials: BotCredentials;
  private authenticator: MobileAuthenticator;
  private isOnline: boolean = false;
  private currentTrades: Map<string, TradeOffer> = new Map();
  private loginDelay: number = 2000;
  private tradeAcceptanceDelay: number = 1000;
  private failureRate: number = 0.1; // 10% failure rate for resilience testing
  private logger: Console;

  constructor(credentials: Partial<BotCredentials> = {}) {
    super();

    this.credentials = {
      accountName: credentials.accountName || 'testbot',
      sharedSecret: credentials.sharedSecret || 'test-shared-secret',
      identitySecret: credentials.identitySecret || 'test-identity-secret',
      steamId: credentials.steamId || '76561198012345678',
      sessionId: credentials.sessionId || 'test-session-id',
      cookies: credentials.cookies || [],
    };

    this.authenticator = {
      deviceID: 'test-device-id',
      identitySecret: this.credentials.identitySecret,
      sharedSecret: this.credentials.sharedSecret,
      revocationCode: 'test-revocation-code',
      uri: `otpauth://totp/Steam:${this.credentials.accountName}?secret=${this.credentials.sharedSecret}&issuer=Steam&custom_label=Test%20Bot&deviceid=${this.authenticator.deviceID}`,
    };

    this.logger = new Console({
      stdout: process.stdout,
      stderr: process.stderr,
    });
  }

  /**
   * Simulate bot login
   */
  async login(): Promise<boolean> {
    this.logger.log(`🤖 [${this.credentials.accountName}] Logging in...`);

    try {
      // Simulate login delay
      await this.delay(this.loginDelay);

      // Simulate potential login failure
      if (Math.random() < this.failureRate) {
        this.logger.error(`❌ [${this.credentials.accountName}] Login failed`);
        this.emit('error', new Error('Simulated login failure'));
        return false;
      }

      this.isOnline = true;
      this.logger.log(`✅ [${this.credentials.accountName}] Login successful`);

      // Emit login event
      this.emit('login', {
        accountName: this.credentials.accountName,
        steamId: this.credentials.steamId,
        sessionId: this.credentials.sessionId,
      });

      return true;
    } catch (error) {
      this.logger.error(`❌ [${this.credentials.accountName}] Login error:`, error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Simulate bot logout
   */
  async logout(): Promise<void> {
    this.logger.log(`👋 [${this.credentials.accountName}] Logging out...`);

    this.isOnline = false;

    // Cancel all pending trades
    for (const [tradeId, trade] of this.currentTrades) {
      if (trade.state === TradeOfferState.Active) {
        await this.cancelTrade(tradeId);
      }
    }

    this.logger.log(`✅ [${this.credentials.accountName}] Logout successful`);
    this.emit('logout', { accountName: this.credentials.accountName });
  }

  /**
   * Create a new trade offer
   */
  async createTradeOffer(offerData: {
    partner: string;
    itemsFromMe: any[];
    itemsFromThem: any[];
    message?: string;
  }): Promise<string> {
    if (!this.isOnline) {
      throw new Error('Bot is not online');
    }

    const tradeId = this.generateTradeId();
    const tradeOffer: TradeOffer = {
      id: tradeId,
      partner: offerData.partner,
      itemsFromMe: offerData.itemsFromMe,
      itemsFromThem: offerData.itemsFromThem,
      message: offerData.message || 'Trade offer from test bot',
      state: TradeOfferState.Active,
      created: new Date(),
      updated: new Date(),
    };

    this.currentTrades.set(tradeId, tradeOffer);

    this.logger.log(`📨 [${this.credentials.accountName}] Created trade offer ${tradeId} to ${offerData.partner}`);

    // Emit trade offer created event
    this.emit('tradeOfferSent', tradeOffer);

    // Simulate trade acceptance after delay
    this.simulateTradeAcceptance(tradeId);

    return tradeId;
  }

  /**
   * Get trade offer status
   */
  async getTradeOfferStatus(tradeId: string): Promise<TradeOffer | null> {
    return this.currentTrades.get(tradeId) || null;
  }

  /**
   * Cancel a trade offer
   */
  async cancelTrade(tradeId: string): Promise<boolean> {
    const trade = this.currentTrades.get(tradeId);
    if (!trade) {
      return false;
    }

    trade.state = TradeOfferState.Canceled;
    trade.updated = new Date();

    this.logger.log(`❌ [${this.credentials.accountName}] Cancelled trade offer ${tradeId}`);

    this.emit('tradeOfferCancelled', trade);
    this.currentTrades.delete(tradeId);

    return true;
  }

  /**
   * Decline a trade offer
   */
  async declineTrade(tradeId: string): Promise<boolean> {
    const trade = this.currentTrades.get(tradeId);
    if (!trade) {
      return false;
    }

    trade.state = TradeOfferState.Declined;
    trade.updated = new Date();

    this.logger.log(`拒 [${this.credentials.accountName}] Declined trade offer ${tradeId}`);

    this.emit('tradeOfferDeclined', trade);
    this.currentTrades.delete(tradeId);

    return true;
  }

  /**
   * Get all active trade offers
   */
  getActiveTrades(): TradeOffer[] {
    return Array.from(this.currentTrades.values()).filter(trade => trade.state === TradeOfferState.Active);
  }

  /**
   * Simulate mobile authenticator confirmation
   */
  generateConfirmationHash(tag: string = 'conf'): string {
    const time = Math.floor(Date.now() / 1000);
    const tagBuffer = Buffer.from(tag.padEnd(4, '\0').substring(0, 4), 'utf8');

    // Simplified version of Steam's confirmation hash algorithm
    const hash = `${time}_${tag}_${this.credentials.identitySecret}`;
    return Buffer.from(hash).toString('base64');
  }

  /**
   * Simulate inventory sync
   */
  async simulateInventorySync(appId: number = 730): Promise<any[]> {
    this.logger.log(`📦 [${this.credentials.accountName}] Syncing inventory for app ${appId}`);

    // Simulate inventory items
    const items = [];
    const itemCount = Math.floor(Math.random() * 10) + 5; // 5-15 items

    for (let i = 0; i < itemCount; i++) {
      items.push({
        assetid: `${appId}_${i}_${Date.now()}`,
        appid: appId,
        contextid: '2',
        classid: `class_${i}`,
        instanceid: '0',
        amount: '1',
        name: `Test Item ${i}`,
        market_name: `Test Item ${i}`,
        marketable: 1,
        tradable: 1,
        icon_url: 'https://steamcdn-a.akamaihd.net/test_icon.png',
        descriptions: [
          {
            type: 'html',
            value: 'Test item description'
          }
        ],
        actions: [
          {
            link: `steam://rungame/${appId}/`,
            name: 'View in game'
          }
        ],
        fraudwarnings: [],
        signatures: [],
        tags: [
          {
            category: 'Type',
            internal_name: 'Base_Outfit',
            localized_category_name: 'Type',
            localized_tag_name: 'Base',
            color: '5D8AA8'
          }
        ]
      });
    }

    this.logger.log(`📦 [${this.credentials.accountName}] Inventory sync complete: ${items.length} items`);

    this.emit('inventorySynced', { appId, items });
    return items;
  }

  /**
   * Configure bot behavior
   */
  configure(options: {
    loginDelay?: number;
    tradeAcceptanceDelay?: number;
    failureRate?: number;
  }): void {
    if (options.loginDelay !== undefined) {
      this.loginDelay = options.loginDelay;
    }
    if (options.tradeAcceptanceDelay !== undefined) {
      this.tradeAcceptanceDelay = options.tradeAcceptanceDelay;
    }
    if (options.failureRate !== undefined) {
      this.failureRate = Math.max(0, Math.min(1, options.failureRate)); // Clamp between 0 and 1
    }
  }

  /**
   * Get bot status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      accountName: this.credentials.accountName,
      steamId: this.credentials.steamId,
      activeTrades: this.getActiveTrades().length,
      totalTrades: this.currentTrades.size,
    };
  }

  // Private methods

  private async simulateTradeAcceptance(tradeId: string): Promise<void> {
    const trade = this.currentTrades.get(tradeId);
    if (!trade) return;

    // Simulate acceptance delay
    await this.delay(this.tradeAcceptanceDelay);

    // Simulate random failure
    if (Math.random() < this.failureRate) {
      this.logger.log(`❌ [${this.credentials.accountName}] Trade ${tradeId} failed (simulated)`);
      trade.state = TradeOfferState.InvalidItems;
      trade.updated = new Date();
      this.emit('tradeOfferFailed', trade);
      this.currentTrades.delete(tradeId);
      return;
    }

    // Accept the trade
    trade.state = TradeOfferState.Accepted;
    trade.updated = new Date();

    this.logger.log(`✅ [${this.credentials.accountName}] Accepted trade offer ${tradeId}`);

    this.emit('tradeOfferAccepted', trade);

    // Simulate inventory update after trade completion
    setTimeout(() => {
      this.emit('inventoryUpdated', {
        tradeId,
        itemsReceived: trade.itemsFromThem,
        itemsSent: trade.itemsFromMe,
      });
    }, 1000);
  }

  private generateTradeId(): string {
    return `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Bot Manager for managing multiple bot simulators
 */
export class BotManager {
  private bots: Map<string, BotSimulator> = new Map();
  private logger: Console = new Console({ stdout: process.stdout, stderr: process.stderr });

  /**
   * Add a bot to the manager
   */
  addBot(credentials: Partial<BotCredentials>): BotSimulator {
    const bot = new BotSimulator(credentials);
    this.bots.set(credentials.accountName || 'default', bot);

    // Forward all bot events
    bot.on('*', (eventName: string, ...args: any[]) => {
      this.logger.log(`📡 Bot Event [${credentials.accountName}]: ${eventName}`, ...args);
      this.emit(`bot_${credentials.accountName}_${eventName}`, ...args);
    });

    return bot;
  }

  /**
   * Get a bot by account name
   */
  getBot(accountName: string): BotSimulator | undefined {
    return this.bots.get(accountName);
  }

  /**
   * Get all bots
   */
  getAllBots(): BotSimulator[] {
    return Array.from(this.bots.values());
  }

  /**
   * Start all bots
   */
  async startAll(): Promise<void> {
    this.logger.log('🚀 Starting all bot simulators...');

    const startPromises = Array.from(this.bots.values()).map(async (bot) => {
      try {
        await bot.login();
      } catch (error) {
        this.logger.error(`❌ Failed to start bot:`, error);
      }
    });

    await Promise.allSettled(startPromises);
  }

  /**
   * Stop all bots
   */
  async stopAll(): Promise<void> {
    this.logger.log('🛑 Stopping all bot simulators...');

    const stopPromises = Array.from(this.bots.values()).map(async (bot) => {
      try {
        await bot.logout();
      } catch (error) {
        this.logger.error(`❌ Failed to stop bot:`, error);
      }
    });

    await Promise.allSettled(stopPromises);
    this.bots.clear();
  }

  /**
   * Find available bot for trade
   */
  findAvailableBot(): BotSimulator | undefined {
    return Array.from(this.bots.values()).find(bot => bot.getStatus().isOnline);
  }

  /**
   * Get bot statistics
   */
  getStatistics(): {
    totalBots: number;
    onlineBots: number;
    offlineBots: number;
    totalActiveTrades: number;
  } {
    const bots = this.getAllBots();
    const onlineBots = bots.filter(bot => bot.getStatus().isOnline);

    return {
      totalBots: bots.length,
      onlineBots: onlineBots.length,
      offlineBots: bots.length - onlineBots.length,
      totalActiveTrades: onlineBots.reduce((total, bot) => total + bot.getActiveTrades().length, 0),
    };
  }
}

// Export default bot manager instance
export const botManager = new BotManager();

// CLI usage for testing
if (require.main === module) {
  const manager = new BotManager();

  // Add test bots
  manager.addBot({
    accountName: 'testbot1',
    sharedSecret: 'test-shared-secret-1',
    identitySecret: 'test-identity-secret-1',
  });

  manager.addBot({
    accountName: 'testbot2',
    sharedSecret: 'test-shared-secret-2',
    identitySecret: 'test-identity-secret-2',
  });

  // Start all bots
  manager.startAll()
    .then(() => {
      console.log('Bot simulators started successfully');
      console.log('Statistics:', manager.getStatistics());

      // Test trade creation
      setTimeout(async () => {
        const bot = manager.findAvailableBot();
        if (bot) {
          try {
            const tradeId = await bot.createTradeOffer({
              partner: '76561198012345678',
              itemsFromMe: [{ name: 'Test Item 1', appId: 730 }],
              itemsFromThem: [{ name: 'Test Item 2', appId: 730 }],
              message: 'Test trade from bot simulator',
            });
            console.log('Trade created:', tradeId);
          } catch (error) {
            console.error('Trade creation failed:', error);
          }
        }
      }, 3000);
    })
    .catch(error => {
      console.error('Failed to start bot simulators:', error);
      process.exit(1);
    });
}