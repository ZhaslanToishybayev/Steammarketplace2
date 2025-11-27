import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot } from '../entities/bot.entity';
import { BotStatus } from '../entities/bot.entity';
import { TradeStatus } from '../entities/trade.entity';
import * as SteamUser from 'steam-user';
import * as TradeOfferManager from 'steam-tradeoffer-manager';
import * as SteamTotp from 'steam-totp';
import * as SteamCommunity from 'steamcommunity';
import * as crypto from 'crypto';

export interface SteamTradeOffer {
  id: string;
  partner: string;
  itemsToGive: any[];
  itemsToReceive: any[];
  message: string;
  state: number;
  created: Date;
  updated: Date;
}

export interface TradeOfferStatus {
  id: string;
  state: TradeOfferState;
  partner: string;
  itemsToGive: any[];
  itemsToReceive: any[];
  message: string;
  created: Date;
  updated: Date;
  escrowDuration?: number;
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
  CancelledBySecondFactor = 10,
  InEscrow = 11
}

interface BotSession {
  steamUser: SteamUser;
  manager: TradeOfferManager;
  community: SteamCommunity;
  isLoggedIn: boolean;
  lastActivity: Date;
  listeners?: {
    loggedOn: () => void;
    error: (error: any) => void;
    steamGuard: (domain: string, callback: (authCode: string) => void) => void;
    disconnected: (eresult: number, msg: string) => void;
    webSession: (sessionID: string, cookies: any[]) => void;
    sentry: (sentryFile: any) => void;
  };
  loginTimeoutId?: NodeJS.Timeout;
}

@Injectable()
export class SteamTradeService {
  private readonly logger = new Logger(SteamTradeService.name);
  private readonly botEncryptionKey: string;
  private readonly loginTimeout: number;
  private readonly sessionRefreshInterval: number;

  // Active bot sessions
  private botSessions = new Map<string, BotSession>();

  constructor(
    @InjectRepository(Bot)
    private readonly botRepository: Repository<Bot>,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.botEncryptionKey = this.configService.get<string>('BOT_ENCRYPTION_KEY');
    this.loginTimeout = this.configService.get<number>('BOT_LOGIN_TIMEOUT', 30000);
    this.sessionRefreshInterval = this.configService.get<number>('BOT_SESSION_REFRESH_INTERVAL_HOURS', 24) * 3600000; // Convert to milliseconds

    if (!this.botEncryptionKey) {
      throw new Error('BOT_ENCRYPTION_KEY is required for SteamTradeService');
    }
  }

  /**
   * Initialize or get bot session
   */
  async getBotSession(botId: string): Promise<BotSession> {
    if (this.botSessions.has(botId)) {
      const session = this.botSessions.get(botId);
      const timeSinceLastActivity = Date.now() - session.lastActivity.getTime();

      // Check if session needs refresh
      if (timeSinceLastActivity > this.sessionRefreshInterval) {
        this.logger.log(`Refreshing session for bot ${botId}`);
        await this.refreshBotSession(botId);
      }

      session.lastActivity = new Date();
      return session;
    }

    // Create new session
    return await this.createBotSession(botId);
  }

  /**
   * Create new bot session
   */
  public async createBotSession(botId: string): Promise<BotSession> {
    const bot = await this.getBotById(botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }

    const credentials = this.decryptBotCredentials(bot);

    const steamUser = new SteamUser({
      enablePicsCache: true,
      picsCacheMaxSize: 100 * 1024 * 1024
    });

    const manager = new TradeOfferManager({
      domain: 'your-domain.com',
      language: 'en',
      pollInterval: 10000,
      cancelTime: 300000,
      pendingCancelTime: 300000,
      globalAssetCache: true,
      assetCacheMaxSize: 50 * 1024 * 1024
    });

    const community = new SteamCommunity();

    const session: BotSession = {
      steamUser,
      manager,
      community,
      isLoggedIn: false,
      lastActivity: new Date()
    };

    this.botSessions.set(botId, session);

    try {
      await this.loginBot(bot, credentials, session);
      this.logger.log(`Successfully logged in bot ${botId}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to login bot ${botId}:`, error);
      this.botSessions.delete(botId);
      throw error;
    }
  }

  /**
   * Login bot to Steam
   */
  private async loginBot(bot: Bot, credentials: any, session: BotSession): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Starting login process for bot ${bot.accountName} (${bot.id})`);

    // Clean up any existing event listeners to prevent memory leaks
    this.cleanupEventListeners(session);

    return new Promise((resolve, reject) => {
      const logOnOptions = {
        accountName: credentials.accountName,
        password: credentials.password,
        twoFactorCode: () => SteamTotp.generateAuthCode(credentials.sharedSecret)
      };

      // Log login attempt with masked password
      this.logger.log(`Logging in bot ${bot.accountName} with options:`, {
        accountName: credentials.accountName,
        hasPassword: !!credentials.password,
        hasSharedSecret: !!credentials.sharedSecret,
        apiKey: bot.apiKey ? '***' : 'none'
      });

      session.steamUser.logOn(logOnOptions);

      // Store listeners for cleanup
      const listeners = new Map();

      const loggedOnListener = () => {
        const loginTime = Date.now() - startTime;
        this.logger.log(`✅ Bot ${bot.accountName} logged on successfully (took ${loginTime}ms)`);
        session.isLoggedIn = true;

        // Set online status
        session.steamUser.setPersona(SteamUser.EPersonaState.Online);
        this.logger.log(`Set bot ${bot.accountName} persona to Online`);

        // Initialize TradeOfferManager with API key
        if (bot.apiKey) {
          session.manager.setAPIKey(bot.apiKey);
          this.logger.log(`Set Steam API key for bot ${bot.accountName}`);
        } else {
          this.logger.warn(`No API key found for bot ${bot.accountName}`);
        }

        resolve();
      };

      const errorListener = (error) => {
        const loginTime = Date.now() - startTime;
        this.logger.error(`❌ Steam user error for bot ${bot.accountName} (after ${loginTime}ms):`, {
          error: error.message,
          errorType: error.constructor.name,
          eresult: error.eresult,
          steam_id: error.steam_id
        });
        reject(error);
      };

      const steamGuardListener = (domain, callback) => {
        this.logger.log(`🔒 Steam guard challenge for bot ${bot.accountName} (domain: ${domain})`);
        try {
          const authCode = SteamTotp.generateAuthCode(credentials.sharedSecret);
          this.logger.log(`🔒 Steam Guard code generated for bot ${bot.accountName} (code not logged for security)`);
          callback(authCode);
        } catch (error) {
          this.logger.error(`Failed to generate Steam Guard code:`, error);
          reject(error);
        }
      };

      const disconnectedListener = (eresult, msg) => {
        const loginTime = Date.now() - startTime;
        this.logger.warn(`🔌 Bot ${bot.accountName} disconnected after ${loginTime}ms: eresult=${eresult}, message=${msg}`);
        session.isLoggedIn = false;
      };

      const webSessionListener = (sessionID, cookies) => {
        this.logger.debug(`🌐 Web session established for bot ${bot.accountName}: sessionID=${sessionID}`);
      };

      const sentryListener = (sentryFile) => {
        this.logger.debug(`🛡️ Sentry file received for bot ${bot.accountName}`);
      };

      // Attach event listeners
      session.steamUser.on('loggedOn', loggedOnListener);
      session.steamUser.on('error', errorListener);
      session.steamUser.on('steamGuard', steamGuardListener);
      session.steamUser.on('disconnected', disconnectedListener);
      session.steamUser.on('webSession', webSessionListener);
      session.steamUser.on('sentry', sentryListener);

      // Store listeners for cleanup
      session.listeners = {
        loggedOn: loggedOnListener,
        error: errorListener,
        steamGuard: steamGuardListener,
        disconnected: disconnectedListener,
        webSession: webSessionListener,
        sentry: sentryListener
      };

      // Set timeout
      const timeoutId = setTimeout(() => {
        if (!session.isLoggedIn) {
          const timeoutTime = Date.now() - startTime;
          this.logger.error(`⏰ Login timeout for bot ${bot.accountName} after ${timeoutTime}ms`);
          reject(new Error('Login timeout'));
        }
      }, this.loginTimeout);

      // Store timeout ID for cleanup
      session.loginTimeoutId = timeoutId;
    });
  }

  /**
   * Refresh bot session
   */
  private async refreshBotSession(botId: string): Promise<void> {
    const session = this.botSessions.get(botId);
    if (!session) {
      throw new Error(`No session found for bot ${botId}`);
    }

    session.steamUser.logOff();
    await this.delay(1000); // Wait 1 second before re-login

    const bot = await this.getBotById(botId);
    const credentials = this.decryptBotCredentials(bot);

    await this.loginBot(bot, credentials, session);
  }

  /**
   * Create and send trade offer
   */
  async createTradeOffer(
    botId: string,
    partnerSteamId: string,
    itemsToGive: any[],
    itemsToReceive: any[],
    message: string = ''
  ): Promise<string> {
    const session = await this.getBotSession(botId);
    const offer = session.manager.createOffer(partnerSteamId);

    // Log trade offer creation details
    this.logger.log(`📦 Creating trade offer for bot ${botId} to partner ${partnerSteamId}`);
    this.logger.debug(`📋 Trade offer details:`, {
      botId,
      partnerSteamId,
      message: message || '(no message)',
      itemsToGive: itemsToGive.map(item => ({
        appId: item.appId,
        contextId: item.contextId || '2',
        assetId: item.assetId,
        amount: item.amount || 1
      })),
      itemsToReceive: itemsToReceive.map(item => ({
        appId: item.appId,
        contextId: item.contextId || '2',
        assetId: item.assetId,
        amount: item.amount || 1
      }))
    });

    // Add items to give
    if (itemsToGive.length > 0) {
      offer.itemsToGive = itemsToGive.map(item => ({
        appId: item.appId,
        contextId: item.contextId || '2',
        assetId: item.assetId,
        amount: item.amount || 1
      }));
      this.logger.debug(`📤 Items to give: ${itemsToGive.length} items`);
    }

    // Add items to receive
    if (itemsToReceive.length > 0) {
      offer.itemsToReceive = itemsToReceive.map(item => ({
        appId: item.appId,
        contextId: item.contextId || '2',
        assetId: item.assetId,
        amount: item.amount || 1
      }));
      this.logger.debug(`📥 Items to receive: ${itemsToReceive.length} items`);
    }

    const startTime = Date.now();
    this.logger.log(`🚀 Sending trade offer...`);

    return new Promise((resolve, reject) => {
      offer.send(message, (error, status) => {
        const sendTime = Date.now() - startTime;

        if (error) {
          this.logger.error(`❌ Failed to send trade offer (took ${sendTime}ms):`, {
            error: error.message,
            errorType: error.constructor.name,
            botId,
            partnerSteamId,
            itemsToGiveCount: itemsToGive.length,
            itemsToReceiveCount: itemsToReceive.length
          });
          reject(error);
        } else {
          this.logger.log(`✅ Trade offer ${offer.id} sent successfully (took ${sendTime}ms), status: ${status}`);
          resolve(offer.id);
        }
      });
    });
  }

  /**
   * Accept trade offer
   */
  async acceptTradeOffer(botId: string, tradeOfferId: string): Promise<void> {
    this.logger.log(`🤝 Accepting trade offer ${tradeOfferId} for bot ${botId}`);
    const session = await this.getBotSession(botId);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      session.manager.getOffer(tradeOfferId, (error, offer) => {
        const getOfferTime = Date.now() - startTime;

        if (error) {
          this.logger.error(`❌ Failed to get trade offer ${tradeOfferId} (took ${getOfferTime}ms):`, {
            error: error.message,
            errorType: error.constructor.name,
            botId,
            tradeOfferId
          });
          reject(error);
          return;
        }

        if (!offer) {
          this.logger.error(`🔍 Trade offer ${tradeOfferId} not found for bot ${botId}`);
          reject(new Error(`Trade offer ${tradeOfferId} not found`));
          return;
        }

        this.logger.debug(`📋 Trade offer details:`, {
          id: offer.id,
          state: offer.state,
          partner: offer.partner,
          itemsToGive: offer.itemsToGive?.length || 0,
          itemsToReceive: offer.itemsToReceive?.length || 0
        });

        offer.accept((error, status) => {
          const acceptTime = Date.now() - startTime;

          if (error) {
            this.logger.error(`❌ Failed to accept trade offer ${tradeOfferId} (took ${acceptTime}ms):`, {
              error: error.message,
              errorType: error.constructor.name,
              botId,
              tradeOfferId,
              offerState: offer.state,
              status
            });
            reject(error);
          } else {
            this.logger.log(`✅ Trade offer ${tradeOfferId} accepted successfully (took ${acceptTime}ms), status: ${status}`);
            resolve();
          }
        });
      });
    });
  }

  /**
   * Decline trade offer
   */
  async declineTradeOffer(botId: string, tradeOfferId: string): Promise<void> {
    const session = await this.getBotSession(botId);

    return new Promise((resolve, reject) => {
      session.manager.getOffer(tradeOfferId, (error, offer) => {
        if (error) {
          this.logger.error(`Failed to get trade offer ${tradeOfferId}:`, error);
          reject(error);
          return;
        }

        if (!offer) {
          reject(new Error(`Trade offer ${tradeOfferId} not found`));
          return;
        }

        offer.decline((error) => {
          if (error) {
            this.logger.error(`Failed to decline trade offer ${tradeOfferId}:`, error);
            reject(error);
          } else {
            this.logger.log(`Trade offer ${tradeOfferId} declined successfully`);
            resolve();
          }
        });
      });
    });
  }

  /**
   * Cancel trade offer
   */
  async cancelTradeOffer(botId: string, tradeOfferId: string): Promise<void> {
    const session = await this.getBotSession(botId);

    return new Promise((resolve, reject) => {
      session.manager.getOffer(tradeOfferId, (error, offer) => {
        if (error) {
          this.logger.error(`Failed to get trade offer ${tradeOfferId}:`, error);
          reject(error);
          return;
        }

        if (!offer) {
          reject(new Error(`Trade offer ${tradeOfferId} not found`));
          return;
        }

        offer.cancel((error) => {
          if (error) {
            this.logger.error(`Failed to cancel trade offer ${tradeOfferId}:`, error);
            reject(error);
          } else {
            this.logger.log(`Trade offer ${tradeOfferId} cancelled successfully`);
            resolve();
          }
        });
      });
    });
  }

  /**
   * Get trade offer status
   */
  async getTradeOfferStatus(botId: string, tradeOfferId: string): Promise<TradeOfferStatus> {
    const session = await this.getBotSession(botId);

    return new Promise((resolve, reject) => {
      session.manager.getOffer(tradeOfferId, (error, offer) => {
        if (error) {
          this.logger.error(`Failed to get trade offer status for ${tradeOfferId}:`, error);
          reject(error);
          return;
        }

        if (!offer) {
          reject(new Error(`Trade offer ${tradeOfferId} not found`));
          return;
        }

        resolve({
          id: offer.id,
          state: offer.state,
          partner: offer.partner.toString(),
          itemsToGive: offer.itemsToGive,
          itemsToReceive: offer.itemsToReceive,
          message: offer.message,
          created: offer.created,
          updated: offer.updated,
          escrowDuration: offer.escrowEnd ? Math.floor((offer.escrowEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : undefined
        });
      });
    });
  }

  /**
   * Poll all trade offers for a bot
   */
  async pollTradeOffers(botId: string): Promise<SteamTradeOffer[]> {
    const session = await this.getBotSession(botId);

    return new Promise((resolve, reject) => {
      session.manager.getOffers(2, (error, sent, received) => {
        if (error) {
          this.logger.error(`Failed to poll trade offers for bot ${botId}:`, error);
          reject(error);
          return;
        }

        const allOffers = [...sent, ...received].map(offer => ({
          id: offer.id,
          partner: offer.partner.toString(),
          itemsToGive: offer.itemsToGive,
          itemsToReceive: offer.itemsToReceive,
          message: offer.message,
          state: offer.state,
          created: offer.created,
          updated: offer.updated
        }));

        resolve(allOffers);
      });
    });
  }

  /**
   * Confirm trade offer via mobile authenticator
   */
  async confirmTradeOffer(botId: string, tradeOfferId: string): Promise<void> {
    const bot = await this.getBotById(botId);
    if (!bot || !bot.identitySecret) {
      throw new Error(`Bot ${botId} identity secret not found`);
    }

    const session = await this.getBotSession(botId);

    return new Promise((resolve, reject) => {
      session.community.acceptConfirmationGeneric(
        bot.identitySecret,
        tradeOfferId,
        (error) => {
          if (error) {
            this.logger.error(`Failed to confirm trade offer ${tradeOfferId}:`, error);
            reject(error);
          } else {
            this.logger.log(`Trade offer ${tradeOfferId} confirmed successfully`);
            resolve();
          }
        }
      );
    });
  }

  /**
   * Check if user has trade hold/escrow with specific bot
   *
   * @param botId - The bot UUID to check escrow status for
   * @param userSteamId - The Steam ID of the user to check escrow with
   * @returns Number of days of escrow duration (0 if no escrow)
   */
  async checkTradeHold(botId: string, userSteamId: string): Promise<number> {
    const session = await this.getBotSession(botId);
    const bot = await this.getBotById(botId);

    return new Promise((resolve, reject) => {
      try {
        // Use TradeOfferManager's getEscrowDuration method for accurate escrow detection
        session.manager.getEscrowDuration(userSteamId, (err, daysTheirEscrow, daysMyEscrow) => {
          if (err) {
            this.logger.error(`Failed to get escrow duration for user ${userSteamId} with bot ${botId}:`, err);
            // Return 0 on error to not block trade creation, but log the issue
            resolve(0);
            return;
          }

          // Return the maximum escrow duration between the two parties
          const maxEscrowDays = Math.max(daysTheirEscrow || 0, daysMyEscrow || 0);

          if (maxEscrowDays > 0) {
            this.logger.log(`Escrow detected for bot ${botId} and user ${userSteamId}: ${maxEscrowDays} days (their: ${daysTheirEscrow || 0}d, my: ${daysMyEscrow || 0}d)`);
          } else {
            this.logger.debug(`No escrow for bot ${botId} and user ${userSteamId}`);
          }

          resolve(maxEscrowDays);
        });
      } catch (error) {
        this.logger.error(`Error checking trade hold for bot ${botId} and user ${userSteamId}:`, error);
        // Return 0 on error to not block trade creation
        resolve(0);
      }
    });
  }

  /**
   * Force login a bot (Admin)
   */
  async forceLoginBot(botId: string): Promise<void> {
    const bot = await this.getBotById(botId);

    // Check if bot session exists
    if (this.botSessions.has(botId)) {
      // Refresh existing session
      await this.refreshBotSession(botId);
    } else {
      // Create new session
      await this.createBotSession(botId);
    }

    // Mark bot as online
    await this.botRepository.update(botId, {
      isOnline: true,
      lastLoginAt: new Date()
    });

    this.logger.log(`Forced login for bot ${botId} (${bot.accountName})`);
  }

  /**
   * Get bot by ID
   */
  private async getBotById(botId: string): Promise<Bot> {
    const bot = await this.botRepository.findOne({ where: { id: botId } });
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }
    return bot;
  }

  /**
   * Decrypt bot credentials
   */
  private decryptBotCredentials(bot: Bot): any {
    if (!this.botEncryptionKey) {
      throw new Error('BOT_ENCRYPTION_KEY not configured');
    }

    try {
      // Decrypt password
      const [ivHex, encryptedPassword, authTagHex] = bot.password.split(':');
      if (!ivHex || !encryptedPassword || !authTagHex) {
        throw new Error('Invalid encrypted password format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.scryptSync(this.botEncryptionKey, 'salt', 32); // Derive same 32-byte key
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

      let decryptedPassword = decipher.update(encryptedPassword, 'hex', 'utf8');
      decryptedPassword += decipher.final('utf8');

      // Decrypt sharedSecret
      const [ivHex2, encryptedSharedSecret, authTagHex2] = bot.sharedSecret.split(':');
      if (!ivHex2 || !encryptedSharedSecret || !authTagHex2) {
        throw new Error('Invalid encrypted sharedSecret format');
      }

      const iv2 = Buffer.from(ivHex2, 'hex');
      const decipher2 = crypto.createDecipheriv('aes-256-gcm', key, iv2);
      decipher2.setAuthTag(Buffer.from(authTagHex2, 'hex'));

      let decryptedSharedSecret = decipher2.update(encryptedSharedSecret, 'hex', 'utf8');
      decryptedSharedSecret += decipher2.final('utf8');

      // Decrypt identitySecret
      const [ivHex3, encryptedIdentitySecret, authTagHex3] = bot.identitySecret.split(':');
      if (!ivHex3 || !encryptedIdentitySecret || !authTagHex3) {
        throw new Error('Invalid encrypted identitySecret format');
      }

      const iv3 = Buffer.from(ivHex3, 'hex');
      const decipher3 = crypto.createDecipheriv('aes-256-gcm', key, iv3);
      decipher3.setAuthTag(Buffer.from(authTagHex3, 'hex'));

      let decryptedIdentitySecret = decipher3.update(encryptedIdentitySecret, 'hex', 'utf8');
      decryptedIdentitySecret += decipher3.final('utf8');

      return {
        accountName: bot.accountName,
        password: decryptedPassword,
        sharedSecret: decryptedSharedSecret,
        identitySecret: decryptedIdentitySecret
      };
    } catch (error) {
      this.logger.error('Failed to decrypt bot credentials:', error);
      throw new Error('Failed to decrypt bot credentials');
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up event listeners to prevent memory leaks
   */
  private cleanupEventListeners(session: BotSession): void {
    if (session.listeners) {
      session.steamUser.removeListener('loggedOn', session.listeners.loggedOn);
      session.steamUser.removeListener('error', session.listeners.error);
      session.steamUser.removeListener('steamGuard', session.listeners.steamGuard);
      session.steamUser.removeListener('disconnected', session.listeners.disconnected);
      session.steamUser.removeListener('webSession', session.listeners.webSession);
      session.steamUser.removeListener('sentry', session.listeners.sentry);
    }

    if (session.loginTimeoutId) {
      clearTimeout(session.loginTimeoutId);
      session.loginTimeoutId = undefined;
    }
  }

  /**
   * Cleanup bot session
   */
  async cleanupBotSession(botId: string): Promise<void> {
    const session = this.botSessions.get(botId);
    if (session) {
      this.cleanupEventListeners(session);
      session.steamUser.logOff();
      this.botSessions.delete(botId);
      this.logger.log(`Cleaned up session for bot ${botId}`);
    }
  }

  /**
   * Get all active bot sessions
   */
  getActiveBotSessions(): string[] {
    return Array.from(this.botSessions.keys());
  }
}