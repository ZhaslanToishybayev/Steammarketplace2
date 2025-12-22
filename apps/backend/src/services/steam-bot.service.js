/**
 * Steam Bot Service (Enhanced)
 * With session persistence to bypass rate limits
 */

const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamTotp = require('steam-totp');
const EventEmitter = require('events');
const { sessionService } = require('./bot-session.service');

class SteamBot extends EventEmitter {
  constructor(config) {
    super();

    this.config = {
      accountName: config.accountName,
      password: config.password,
      sharedSecret: config.sharedSecret,
      identitySecret: config.identitySecret,
      steamId: config.steamId,
      ...config
    };

    this.isOnline = false;
    this.isReady = false;
    this.activeTrades = 0;
    this.inventoryCount = 0;
    this.lastLoginAt = null;

    // Initialize Steam Community
    this.community = new SteamCommunity();

    // Initialize Trade Offer Manager with Steam API Key
    this.manager = new TradeOfferManager({
      community: this.community,
      language: 'en',
      pollInterval: 10000,
      cancelTime: 600000,
      steam: null, // Not using steam-user
      domain: 'localhost',
      apiKey: process.env.STEAM_API_KEY, // Steam Web API Key for trade offers
    });

    this._setupEventHandlers();
  }

  /**
   * Initialize bot - try session restore first, then login
   */
  async initialize() {
    console.log(`[Bot ${this.config.accountName}] Initializing...`);

    // Try to restore session first
    const restored = await this.restoreSession();

    if (restored) {
      console.log(`[Bot ${this.config.accountName}] Session restored, no login needed`);
      return true;
    }

    // No valid session, need to login (with queue to avoid rate limits)
    console.log(`[Bot ${this.config.accountName}] No session found, queueing login...`);

    try {
      await sessionService.queueLogin(() => this.login());
      return this.isReady;
    } catch (err) {
      console.error(`[Bot ${this.config.accountName}] Init failed:`, err.message);
      return false;
    }
  }

  /**
   * Restore session from Redis
   */
  async restoreSession() {
    try {
      const session = await sessionService.getSession(this.config.accountName);

      if (!session || !session.cookies) {
        return false;
      }

      console.log(`[Bot ${this.config.accountName}] Restoring saved session...`);

      // Set cookies directly without logging in
      return new Promise((resolve) => {
        this.manager.setCookies(session.cookies, (err) => {
          if (err) {
            console.warn(`[Bot ${this.config.accountName}] Session restore failed:`, err.message);
            resolve(false);
            return;
          }

          // Auto-detect SteamID if missing
          if (!this.config.steamId && this.community.steamID) {
            this.config.steamId = this.community.steamID.getSteamID64();
            console.log(`[Bot ${this.config.accountName}] Detected SteamID: ${this.config.steamId}`);
          }

          this.isOnline = true;
          this.isReady = true;
          this.lastLoginAt = new Date(session.savedAt);

          this.emit('ready');
          console.log(`[Bot ${this.config.accountName}] Session restored successfully`);

          // Explicitly start polling for trade offer changes
          console.log(`[Bot ${this.config.accountName}] Starting trade offer polling...`);
          this.manager.doPoll();

          // Schedule session refresh
          this._scheduleRefresh();

          resolve(true);
        });
      });
    } catch (err) {
      console.error(`[Bot ${this.config.accountName}] Session restore error:`, err.message);
      return false;
    }
  }

  /**
   * Login to Steam (will save session for next time)
   */
  async login() {
    return new Promise((resolve, reject) => {
      console.log(`[Bot ${this.config.accountName}] Logging in...`);

      const loginOptions = {
        accountName: this.config.accountName,
        password: this.config.password,
      };

      // Generate 2FA code
      if (this.config.sharedSecret) {
        loginOptions.twoFactorCode = SteamTotp.generateAuthCode(this.config.sharedSecret);
      }

      this.community.login(loginOptions, async (err, sessionID, cookies) => {
        if (err) {
          console.error(`[Bot ${this.config.accountName}] Login failed:`, err.message);
          this.emit('error', { type: 'login', error: err });
          return reject(err);
        }

        console.log(`[Bot ${this.config.accountName}] Logged in successfully`);

        // Save session to Redis for future restores
        await sessionService.saveSession(
          this.config.accountName,
          cookies,
          this.config.steamId
        );

        // Set cookies for trade manager
        this.manager.setCookies(cookies, (err) => {
          if (err) {
            console.error(`[Bot ${this.config.accountName}] Failed to set cookies:`, err.message);
            return reject(err);
          }

          // Auto-detect SteamID if missing
          if (!this.config.steamId && this.community.steamID) {
            this.config.steamId = this.community.steamID.getSteamID64();
            console.log(`[Bot ${this.config.accountName}] Detected SteamID: ${this.config.steamId}`);
          }

          this.isOnline = true;
          this.isReady = true;
          this.lastLoginAt = new Date();

          this.emit('ready');

          // Schedule session refresh
          this._scheduleRefresh();

          resolve();
        });
      });
    });
  }

  /**
   * Refresh session (re-login to get fresh cookies)
   */
  async refreshSession() {
    console.log(`[Bot ${this.config.accountName}] Refreshing session...`);

    try {
      await this.login();
      console.log(`[Bot ${this.config.accountName}] Session refreshed`);
    } catch (err) {
      console.error(`[Bot ${this.config.accountName}] Session refresh failed:`, err.message);
    }
  }

  /**
   * Schedule automatic session refresh (every 12 hours)
   */
  _scheduleRefresh() {
    const refreshInterval = 12 * 60 * 60 * 1000; // 12 hours

    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
    }

    this._refreshTimer = setInterval(() => {
      this.refreshSession();
    }, refreshInterval);
  }

  /**
   * Logout from Steam
   */
  logout() {
    this.isOnline = false;
    this.isReady = false;

    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
    }

    this.manager.shutdown();
    console.log(`[Bot ${this.config.accountName}] Logged out`);
    this.emit('disconnected');
  }

  /**
   * Send a trade offer to user
   */
  async sendTradeOffer(options) {
    return new Promise((resolve, reject) => {
      const { partnerSteamId, partnerTradeUrl, itemsToGive, itemsToReceive, message } = options;

      // MOCK SIMULATION
      const isMock = itemsToGive && itemsToGive.some(i => String(i.assetid).startsWith('mock_'));
      if (isMock) {
        console.log(`[Bot ${this.config.accountName}] Simulating MOCK Trade Offer...`);
        const mockId = `MOCK-${Date.now()}`;

        // Simulate "Trade Sent"
        setTimeout(() => {
          // Simulate "User Accepted" after 5 seconds
          console.log(`[Bot ${this.config.accountName}] Auto-completing MOCK trade ${mockId}`);
          this.emit('sentOfferChanged', {
            id: mockId,
            oldState: TradeOfferManager.ETradeOfferState.Active,
            newState: TradeOfferManager.ETradeOfferState.Accepted,
            stateName: 'Accepted'
          });
        }, 5000);

        return resolve(mockId);
      }

      if (!this.isReady) {
        return reject(new Error('Bot is not ready'));
      }

      const offer = this.manager.createOffer(partnerTradeUrl || partnerSteamId);

      if (itemsToGive && itemsToGive.length > 0) {
        itemsToGive.forEach(item => {
          offer.addMyItem({
            assetid: item.assetId,
            appid: item.appId,
            contextid: item.contextId || '2',
          });
        });
      }

      if (itemsToReceive && itemsToReceive.length > 0) {
        itemsToReceive.forEach(item => {
          offer.addTheirItem({
            assetid: item.assetId,
            appid: item.appId,
            contextid: item.contextId || '2',
          });
        });
      }

      if (message) {
        offer.setMessage(message);
      }

      this.activeTrades++;

      offer.send((err, status) => {
        if (err) {
          this.activeTrades--;
          console.error(`[Bot ${this.config.accountName}] Failed to send trade offer:`, err.message);
          return reject(err);
        }

        console.log(`[Bot ${this.config.accountName}] Trade offer sent: ${offer.id}, status: ${status}`);

        if (status === 'pending') {
          this._confirmOffer(offer.id);
        }

        resolve(offer.id);
      });
    });
  }

  /**
   * Accept an incoming trade offer
   */
  async acceptTradeOffer(offerId) {
    return new Promise((resolve, reject) => {
      this.manager.getOffer(offerId, (err, offer) => {
        if (err) return reject(err);

        offer.accept(false, (err, status) => {
          if (err) {
            console.error(`[Bot ${this.config.accountName}] Failed to accept offer ${offerId}:`, err.message);
            return reject(err);
          }

          console.log(`[Bot ${this.config.accountName}] Accepted offer ${offerId}, status: ${status}`);

          if (status === 'pending') {
            this._confirmOffer(offerId);
          }

          resolve(status);
        });
      });
    });
  }

  /**
   * Cancel a trade offer
   */
  async cancelTradeOffer(offerId) {
    return new Promise((resolve, reject) => {
      // MOCK INTERCEPT
      if (typeof offerId === 'string' && offerId.startsWith('MOCK-')) {
        console.log(`[Bot ${this.config.accountName}] Simulating CANCEL for ${offerId}`);
        return resolve();
      }

      this.manager.getOffer(offerId, (err, offer) => {
        if (err) return reject(err);

        offer.cancel((err) => {
          if (err) return reject(err);

          this.activeTrades = Math.max(0, this.activeTrades - 1);
          console.log(`[Bot ${this.config.accountName}] Cancelled offer ${offerId}`);
          resolve();
        });
      });
    });
  }

  /**
   * Request an item from a user (for P2P trades)
   * Bot sends an offer requesting the specific item from the seller
   * @param {object} options - { sellerTradeUrl, assetId, appId, message }
   */
  async requestItemFromUser(options) {
    return new Promise((resolve, reject) => {
      const { sellerTradeUrl, assetId, appId = 730, message } = options;

      if (!this.isReady) {
        return reject(new Error('Bot is not ready'));
      }

      if (!sellerTradeUrl) {
        return reject(new Error('Seller trade URL is required'));
      }

      if (!assetId) {
        return reject(new Error('Asset ID is required'));
      }

      console.log(`[Bot ${this.config.accountName}] Requesting item ${assetId} from seller via ${sellerTradeUrl}`);

      const offer = this.manager.createOffer(sellerTradeUrl);

      // We want to RECEIVE the item from the seller (not give anything)
      offer.addTheirItem({
        assetid: assetId,
        appid: appId,
        contextid: '2',
      });

      offer.setMessage(message || 'Steam Marketplace P2P Trade - Please accept to complete the sale');

      this.activeTrades++;

      offer.send((err, status) => {
        if (err) {
          this.activeTrades--;
          console.error(`[Bot ${this.config.accountName}] Failed to request item:`, err.message);
          return reject(err);
        }

        console.log(`[Bot ${this.config.accountName}] P2P request sent: ${offer.id}, status: ${status}`);

        if (status === 'pending') {
          this._confirmOffer(offer.id);
        }

        resolve({
          offerId: offer.id,
          status
        });
      });
    });
  }

  /**
   * Get trade offer status
   */
  async getTradeOfferStatus(offerId) {
    return new Promise((resolve, reject) => {
      // MOCK INTERCEPT
      if (typeof offerId === 'string' && offerId.startsWith('MOCK-')) {
        return resolve({
          id: offerId,
          state: 3, // Accepted
          stateName: 'Accepted',
          isOurOffer: true,
          partner: null,
          itemsToGive: [],
          itemsToReceive: [],
          created: new Date(),
          updated: new Date()
        });
      }

      this.manager.getOffer(offerId, (err, offer) => {
        if (err) return reject(err);

        resolve({
          id: offer.id,
          state: offer.state,
          stateName: TradeOfferManager.ETradeOfferState[offer.state],
          isOurOffer: offer.isOurOffer,
          partner: offer.partner.getSteamID64(),
          itemsToGive: offer.itemsToGive,
          itemsToReceive: offer.itemsToReceive,
          created: offer.created,
          updated: offer.updated,
        });
      });
    });
  }

  /**
   * Get bot inventory
   */
  async getInventory(appId, contextId = '2') {
    return new Promise((resolve, reject) => {
      this.manager.getInventoryContents(appId, contextId, true, (err, inventory) => {
        if (err) return reject(err);

        this.inventoryCount = inventory.length;
        resolve(inventory);
      });
    });
  }

  /**
   * Handle changes in sent offers
   */
  async _onSentOfferChanged(offer, oldState) {
    const TradeOfferManager = require('steam-tradeoffer-manager');
    console.log(`[Bot ${this.config.accountName}] Offer ${offer.id} changed: ${TradeOfferManager.ETradeOfferState[oldState]} -> ${TradeOfferManager.ETradeOfferState[offer.state]}`);

    this.emit('sentOfferChanged', {
      id: offer.id,
      oldState,
      newState: offer.state,
      stateName: TradeOfferManager.ETradeOfferState[offer.state]
    });

    // MOCK: If this was a mock offer, we don't have DB logic here usually, handled by external service listening to event.
    // BUT for real integration, we should update the DB here or ensure the listener does it.

    // Check if we need to update DB directly (Service Layer Pattern usually handles this via event)
    // However, to ensure "Bot verifies", let's import the DB query here or emit a specific event the Escrow Service listens to.

    // For now, let's keep it emitting. The EscrowService already monitors 'trade-queue' or similar?
    // Actually, EscrowService needs to listen to these bot events.
    // Let's add direct DB update here to be safe and immediate.

    try {
      const { query } = require('../config/database');

      let newStatus = null;
      if (offer.state === TradeOfferManager.ETradeOfferState.Accepted) {
        newStatus = 'completed'; // For bot sale, accepted means user got item
      } else if (offer.state === TradeOfferManager.ETradeOfferState.Declined) {
        newStatus = 'cancelled';
      } else if (offer.state === TradeOfferManager.ETradeOfferState.Canceled) {
        newStatus = 'cancelled';
      }

      if (newStatus) {
        // Update trade status in DB
        await query(`
                UPDATE escrow_trades 
                SET status = $1, updated_at = NOW()
                WHERE buyer_trade_offer_id = $2
            `, [newStatus, offer.id]);
        console.log(`[Bot ${this.config.accountName}] Updated DB trade status to ${newStatus} for offer ${offer.id}`);

        // === REAL-TIME WEBSOCKET NOTIFICATION ===
        try {
          const { notifyTradeUpdate } = require('./ws-notifier');

          // Get buyer/seller SteamID from DB for targeted notification
          const tradeResult = await query(
            'SELECT buyer_steam_id, seller_steam_id FROM escrow_trades WHERE buyer_trade_offer_id = $1',
            [offer.id]
          );

          if (tradeResult.rows.length > 0) {
            const { buyer_steam_id, seller_steam_id } = tradeResult.rows[0];

            const tradeData = {
              offerId: offer.id,
              status: newStatus,
              stateName: TradeOfferManager.ETradeOfferState[offer.state],
              message: newStatus === 'completed'
                ? 'Trade Accepted! Item delivered successfully.'
                : 'Trade was cancelled or declined.'
            };

            // Notify buyer
            if (buyer_steam_id) {
              await notifyTradeUpdate(buyer_steam_id, tradeData);
              console.log(`[Bot ${this.config.accountName}] Real-time notification sent to buyer: ${buyer_steam_id}`);
            }

            // Notify seller
            if (seller_steam_id) {
              await notifyTradeUpdate(seller_steam_id, tradeData);
              console.log(`[Bot ${this.config.accountName}] Real-time notification sent to seller: ${seller_steam_id}`);
            }
          }
        } catch (wsErr) {
          console.warn(`[Bot ${this.config.accountName}] WebSocket notification failed:`, wsErr.message);
        }
      }
    } catch (err) {
      console.error(`[Bot ${this.config.accountName}] Failed to update DB on offer change:`, err.message);
    }
  }

  /**
   * Confirm a pending trade offer
   */
  _confirmOffer(offerId) {
    if (!this.config.identitySecret) {
      console.warn(`[Bot ${this.config.accountName}] No identity secret, cannot auto-confirm`);
      return;
    }

    this.community.acceptConfirmationForObject(this.config.identitySecret, offerId, (err) => {
      if (err) {
        console.error(`[Bot ${this.config.accountName}] Failed to confirm offer ${offerId}:`, err.message);
        this.emit('confirmationError', { offerId, error: err });
      } else {
        console.log(`[Bot ${this.config.accountName}] Confirmed offer ${offerId}`);
        this.emit('offerConfirmed', { offerId });
      }
    });
  }

  /**
   * Setup event handlers
   */
  _setupEventHandlers() {
    this.manager.on('newOffer', (offer) => {
      console.log(`[Bot ${this.config.accountName}] New offer received: ${offer.id}`);
      this.emit('newOffer', {
        id: offer.id,
        partner: offer.partner.getSteamID64(),
        itemsToGive: offer.itemsToGive,
        itemsToReceive: offer.itemsToReceive,
      });
    });

    this.manager.on('sentOfferChanged', (offer, oldState) => {
      console.log(`[Bot ${this.config.accountName}] Sent offer ${offer.id} changed: ${oldState} -> ${offer.state}`);

      // Decrease active trades when offer completes
      if ([3, 5, 6, 7, 8].includes(offer.state)) { // Accepted, Expired, Canceled, Declined, InvalidItems
        this.activeTrades = Math.max(0, this.activeTrades - 1);
      }

      this.emit('sentOfferChanged', {
        id: offer.id,
        oldState,
        newState: offer.state,
        stateName: TradeOfferManager.ETradeOfferState[offer.state],
      });
    });

    this.manager.on('receivedOfferChanged', (offer, oldState) => {
      console.log(`[Bot ${this.config.accountName}] Received offer ${offer.id} changed: ${oldState} -> ${offer.state}`);
      this.emit('receivedOfferChanged', {
        id: offer.id,
        oldState,
        newState: offer.state,
        stateName: TradeOfferManager.ETradeOfferState[offer.state],
      });
    });

    this.manager.on('pollFailure', (err) => {
      console.error(`[Bot ${this.config.accountName}] Poll failure:`, err.message);
      this.emit('pollError', err);
    });

    this.community.on('sessionExpired', async () => {
      console.log(`[Bot ${this.config.accountName}] Session expired, refreshing...`);
      this.isReady = false;

      // Clear old session and re-login
      await sessionService.clearSession(this.config.accountName);

      try {
        await sessionService.queueLogin(() => this.login());
      } catch (err) {
        console.error(`[Bot ${this.config.accountName}] Re-login failed:`, err.message);
      }
    });
  }

  /**
   * Get bot status
   */
  getStatus() {
    return {
      accountName: this.config.accountName,
      steamId: this.config.steamId,
      isOnline: this.isOnline,
      isReady: this.isReady,
      activeTrades: this.activeTrades,
      inventoryCount: this.inventoryCount,
      lastLoginAt: this.lastLoginAt,
    };
  }
}

SteamBot.TradeOfferState = TradeOfferManager.ETradeOfferState;

module.exports = SteamBot;
