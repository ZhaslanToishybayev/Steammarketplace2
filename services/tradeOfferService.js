/**
 * Trade Offer Service
 * Управление Steam Trade Offers для торговли
 */

const TradeOfferManager = require('steam-tradeoffer-manager');
const SteamUser = require('steam-user');
const logger = require('../utils/logger');
const { Sentry } = require('../config/sentry');
const User = require('../models/User');
const MarketListing = require('../models/MarketListing');
const Transaction = require('../models/Transaction');
const TradeOffer = require('../models/TradeOffer');

class TradeOfferService {
  constructor(botManager, io = null) {
    this.botManager = botManager;
    this.activeOffers = new Map();
    this.io = io; // Socket.io instance for notifications
  }

  /**
   * Создать trade offer от бота к пользователю
   */
  async createOffer(bot, partnerSteamId, myAssetIds, theirAssetIds = [], listingId = null) {
    return new Promise((resolve, reject) => {
      try {
        // Используем manager для создания trade offer (правильный способ)
        const offer = bot.manager.createOffer(partnerSteamId);

        logger.info(`Creating trade offer for partner: ${partnerSteamId}, items: ${myAssetIds.length}`);

        // Добавляем предметы от бота
        myAssetIds.forEach(assetId => {
          const item = bot.client.inventory.assets.get(assetId);
          if (item) {
            offer.addMyItem(item);
            logger.info(`Added bot item to trade offer: ${item.name} (${assetId})`);
          } else {
            logger.warn(`Item ${assetId} not found in bot inventory`);
          }
        });

        // Добавляем требования от пользователя (обычно пусто для marketplace)
        // Проверяем, что partnerInventory загружен
        if (offer.partnerInventory && theirAssetIds.length > 0) {
          theirAssetIds.forEach(assetId => {
            const item = offer.partnerInventory.getAsset(assetId);
            if (item) {
              offer.addTheirItem(item);
              logger.info(`Added partner item to trade offer: ${item.name}`);
            } else {
              logger.warn(`Partner item ${assetId} not found in partner inventory`);
            }
          });
        } else if (theirAssetIds.length > 0) {
          logger.warn('Partner inventory not loaded, skipping theirAssetIds');
        }

        // Сохраняем предложение
        offer.send((err) => {
          if (err) {
            logger.error('Error sending trade offer:', err);
            if (Sentry) {
              Sentry.captureException(err, {
                tags: {
                  service: 'tradeOfferService',
                  action: 'createOffer',
                  partnerSteamId: partnerSteamId
                },
                extra: {
                  myAssetIds,
                  theirAssetIds,
                  listingId
                }
              });
            }
            return reject(err);
          }

          const offerId = offer.id;

          // Сохраняем в базу данных
          const tradeOfferDoc = new TradeOffer({
            offerId: offerId,
            steamId: partnerSteamId,
            botId: bot.id || 'unknown',
            itemsGiven: myAssetIds,
            itemsReceived: theirAssetIds,
            status: 'sent',
            createdAt: new Date(),
            metadata: {
              source: 'api',
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            }
          });

          tradeOfferDoc.save()
            .then(() => {
              logger.info(`Trade offer ${offerId} saved to database`);
            })
            .catch((err) => {
              logger.error(`Failed to save trade offer ${offerId} to database:`, err);
            });

          this.activeOffers.set(offerId, {
            offer,
            partnerSteamId,
            myAssetIds,
            theirAssetIds,
            listingId,
            status: 'sent',
            createdAt: new Date()
          });

          logger.info(`Trade offer ${offerId} sent to ${partnerSteamId}`);

          // Настраиваем обработчики событий
          offer.on('pending', () => {
            logger.info(`Trade offer ${offerId} is pending acceptance`);
            this.updateOfferStatus(offerId, 'pending');
          });

          offer.on('accepted', () => {
            logger.info(`Trade offer ${offerId} accepted by user`);
            this.updateOfferStatus(offerId, 'completed');
            this.handleTradeCompleted(offerId);
            this.activeOffers.delete(offerId);
          });

          offer.on('declined', () => {
            logger.info(`Trade offer ${offerId} declined by user`);
            this.updateOfferStatus(offerId, 'declined');
            this.handleTradeDeclined(offerId);
            this.activeOffers.delete(offerId);
          });

          offer.on('cancelled', () => {
            logger.info(`Trade offer ${offerId} cancelled`);
            this.updateOfferStatus(offerId, 'cancelled');
            this.handleTradeCancelled(offerId);
            this.activeOffers.delete(offerId);
          });

          offer.on('error', (err) => {
            logger.error(`Trade offer ${offerId} error:`, err);
            if (Sentry) {
              Sentry.captureException(err, {
                tags: {
                  service: 'tradeOfferService',
                  action: 'offerError',
                  offerId: offerId
                }
              });
            }
            this.updateOfferStatus(offerId, 'error');
          });

          resolve({
            offerId,
            status: 'sent',
            offer,
            message: 'Trade offer created and sent'
          });
        });
      } catch (error) {
        logger.error('Error in createOffer:', error);
        if (Sentry) {
          Sentry.captureException(error, {
            tags: {
              service: 'tradeOfferService',
              action: 'createOffer',
              partnerSteamId: partnerSteamId
            }
          });
        }
        reject(error);
      }
    });
  }

  /**
   * Отменить trade offer
   */
  cancelOffer(offerId) {
    return new Promise((resolve, reject) => {
      const offerData = this.activeOffers.get(offerId);
      if (!offerData) {
        return reject(new Error('Trade offer not found'));
      }

      offerData.offer.cancel((err) => {
        if (err) {
          logger.error('Error cancelling trade offer:', err);
          return reject(err);
        }

        logger.info(`Trade offer ${offerId} cancelled`);
        this.activeOffers.delete(offerId);
        resolve({ success: true, message: 'Trade offer cancelled' });
      });
    });
  }

  /**
   * Получить информацию о trade offer
   */
  getOffer(offerId) {
    return this.activeOffers.get(offerId);
  }

  /**
   * Получить все активные trade offers
   */
  getActiveOffers(partnerSteamId = null) {
    const offers = Array.from(this.activeOffers.entries()).map(([id, data]) => ({
      offerId: id,
      partnerSteamId: data.partnerSteamId,
      myAssetIds: data.myAssetIds,
      theirAssetIds: data.theirAssetIds,
      status: data.status,
      createdAt: data.createdAt
    }));

    if (partnerSteamId) {
      return offers.filter(offer => offer.partnerSteamId === partnerSteamId);
    }

    return offers;
  }

  /**
   * Обновить статус trade offer
   */
  async updateOfferStatus(offerId, status) {
    const offerData = this.activeOffers.get(offerId);
    if (offerData) {
      offerData.status = status;
      offerData.updatedAt = new Date();

      // Обновляем статус в базе данных
      try {
        await TradeOffer.findOneAndUpdate(
          { offerId: offerId },
          {
            status: status,
            updatedAt: new Date(),
            ...(status === 'accepted' && { completedAt: new Date() })
          },
          { new: true }
        );
        logger.info(`Trade offer ${offerId} status updated to ${status} in database`);
      } catch (error) {
        logger.error(`Failed to update trade offer ${offerId} status in database:`, error);
      }
    }
  }

  /**
   * Обработка принятого trade offer
   */
  async handleTradeCompleted(offerId) {
    try {
      const offerData = this.activeOffers.get(offerId);
      if (!offerData) return;

      logger.info(`Processing completed trade offer ${offerId}`);

      // Если это была marketplace покупка, зачисляем деньги продавцу
      if (offerData.listingId) {
        const listing = await MarketListing.findById(offerData.listingId).populate('seller buyer');
        if (listing && listing.seller) {
          const seller = await User.findById(listing.seller._id);
          if (seller) {
            // Зачисляем деньги продавцу (минус комиссия 5%)
            const commission = listing.price * 0.05;
            const sellerAmount = listing.price - commission;

            seller.wallet.balance += sellerAmount;
            await seller.save();

            // Создаем транзакцию для продавца
            await Transaction.create({
              type: 'sale',
              user: seller._id,
              amount: sellerAmount,
              marketListing: listing._id,
              status: 'completed',
              description: `Sale of ${listing.item.marketName} (Trade offer: ${offerId})`
            });

            // Создаем транзакцию для комиссии
            await Transaction.create({
              type: 'fee',
              amount: -commission,
              marketListing: listing._id,
              status: 'completed',
              description: `Commission fee for trade offer ${offerId}`
            });

            // Обновляем статус listing
            listing.status = 'sold';
            await listing.save();

            logger.info(`Seller ${seller.steamId} received $${sellerAmount} for listing ${offerData.listingId}`);

            // Отправляем WebSocket уведомление продавцу
            if (this.io) {
              this.io.to(`user-${seller._id}`).emit('trade-completed', {
                type: 'sale',
                listingId: listing._id,
                itemName: listing.item.marketName,
                amount: sellerAmount,
                commission: commission,
                message: `Your item ${listing.item.marketName} has been sold for $${sellerAmount.toFixed(2)}!`
              });

              // Уведомление покупателю
              if (listing.buyer) {
                this.io.to(`user-${listing.buyer._id}`).emit('trade-completed', {
                  type: 'purchase',
                  listingId: listing._id,
                  itemName: listing.item.marketName,
                  message: `Your purchase of ${listing.item.marketName} is complete!`
                });
              }
            }
          }
        }
      }

    } catch (error) {
      logger.error(`Error handling trade completion for ${offerId}:`, error);
      if (Sentry) {
        Sentry.captureException(error, {
          tags: {
            service: 'tradeOfferService',
            action: 'handleTradeCompleted',
            offerId: offerId
          }
        });
      }
    }
  }

  /**
   * Обработка отклоненного trade offer
   */
  async handleTradeDeclined(offerId) {
    try {
      const offerData = this.activeOffers.get(offerId);
      if (!offerData) return;

      logger.info(`Processing declined trade offer ${offerId}`);

      // Возвращаем деньги покупателю
      if (offerData.listingId) {
        const listing = await MarketListing.findById(offerData.listingId).populate('buyer');
        if (listing && listing.buyer) {
          const buyer = await User.findById(listing.buyer._id);
          if (buyer) {
            buyer.wallet.balance += listing.price;
            await buyer.save();

            // Создаем транзакцию возврата
            await Transaction.create({
              type: 'purchase',
              user: buyer._id,
              amount: listing.price,
              marketListing: listing._id,
              status: 'cancelled',
              description: `Refund for ${listing.item.marketName} (Trade declined)`
            });

            // Возвращаем listing в активное состояние
            listing.status = 'active';
            listing.buyer = undefined;
            listing.tradeOfferId = undefined;
            await listing.save();

            logger.info(`Buyer ${buyer.steamId} refunded $${listing.price} for declined trade ${offerId}`);

            // Отправляем WebSocket уведомление покупателю
            if (this.io) {
              this.io.to(`user-${buyer._id}`).emit('trade-declined', {
                type: 'refund',
                listingId: listing._id,
                itemName: listing.item.marketName,
                amount: listing.price,
                message: `Your trade was declined. $${listing.price} has been refunded to your balance.`
              });
            }
          }
        }
      }

    } catch (error) {
      logger.error(`Error handling trade decline for ${offerId}:`, error);
      if (Sentry) {
        Sentry.captureException(error, {
          tags: {
            service: 'tradeOfferService',
            action: 'handleTradeDeclined',
            offerId: offerId
          }
        });
      }
    }
  }

  /**
   * Обработка отмененного trade offer
   */
  async handleTradeCancelled(offerId) {
    try {
      const offerData = this.activeOffers.get(offerId);
      if (!offerData) return;

      logger.info(`Processing cancelled trade offer ${offerId}`);

      // Возвращаем деньги покупателю
      if (offerData.listingId) {
        const listing = await MarketListing.findById(offerData.listingId).populate('buyer');
        if (listing && listing.buyer) {
          const buyer = await User.findById(listing.buyer._id);
          if (buyer) {
            buyer.wallet.balance += listing.price;
            await buyer.save();

            // Возвращаем listing в активное состояние
            listing.status = 'active';
            listing.buyer = undefined;
            listing.tradeOfferId = undefined;
            await listing.save();

            logger.info(`Buyer ${buyer.steamId} refunded $${listing.price} for cancelled trade ${offerId}`);
          }
        }
      }

    } catch (error) {
      logger.error(`Error handling trade cancellation for ${offerId}:`, error);
      if (Sentry) {
        Sentry.captureException(error, {
          tags: {
            service: 'tradeOfferService',
            action: 'handleTradeCancelled',
            offerId: offerId
          }
        });
      }
    }
  }

  /**
   * Проверить, существует ли assetId в инвентаре бота
   */
  async validateAssetId(bot, assetId) {
    return new Promise((resolve) => {
      const item = bot.client.inventory.assets.get(assetId);
      if (item) {
        resolve({
          valid: true,
          item: {
            assetId: item.assetid,
            classId: item.classid,
            instanceId: item.instanceid,
            name: item.name,
            marketName: item.market_name,
            tradable: item.tradable,
            marketable: item.marketable
          }
        });
      } else {
        resolve({
          valid: false,
          error: 'Item not found in bot inventory'
        });
      }
    });
  }

  /**
   * Массовая валидация assetIds
   */
  async validateAssetIds(bot, assetIds) {
    const results = [];
    for (const assetId of assetIds) {
      const validation = await this.validateAssetId(bot, assetId);
      results.push({
        assetId,
        ...validation
      });
    }
    return results;
  }
}

module.exports = TradeOfferService;
