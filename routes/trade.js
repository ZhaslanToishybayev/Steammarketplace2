const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateTradeOffer, validateAssetIds } = require('../middleware/validation');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const TradeOfferService = require('../services/tradeOfferService');
const logger = require('../utils/logger');

// Инициализируем TradeOfferService (будет подключен в app.js)
let tradeOfferService;

// Middleware для инициализации сервиса
router.use((req, res, next) => {
  if (!tradeOfferService && req.steamBotManager) {
    tradeOfferService = new TradeOfferService(req.steamBotManager);
  }
  next();
});

// Создать trade offer
router.post('/create', authenticateToken, validateTradeOffer, async (req, res) => {
  try {
    const { myAssetIds, theirAssetIds, message } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем, что у пользователя есть trade URL
    if (!user.tradeUrl) {
      return res.status(400).json({
        error: 'Trade URL not set. Please set your trade URL in settings.'
      });
    }

    // Получаем активного бота
    const botManager = req.steamBotManager;
    if (!botManager || botManager.activeBots.length === 0) {
      return res.status(503).json({ error: 'No active bots available' });
    }

    const bot = botManager.activeBots[0];

    // Валидируем assetIds
    const myAssetValidation = await tradeOfferService.validateAssetIds(bot, myAssetIds);
    const invalidMyAssets = myAssetValidation.filter(v => !v.valid);

    if (invalidMyAssets.length > 0) {
      return res.status(400).json({
        error: 'Some items not found in bot inventory',
        invalidAssets: invalidMyAssets
      });
    }

    // Создаем trade offer
    const result = await tradeOfferService.createOffer(
      bot,
      user.steamId,
      myAssetIds,
      theirAssetIds
    );

    logger.info(`Trade offer created: ${result.offerId} for user ${user.steamId}`);

    res.json({
      success: true,
      offerId: result.offerId,
      status: result.status,
      message: 'Trade offer created successfully',
      partnerSteamId: user.steamId,
      myItems: myAssetValidation.map(v => v.item),
      url: `https://steamcommunity.com/tradeoffer/${result.offerId}/`
    });

  } catch (error) {
    logger.error('Error creating trade offer:', error);
    res.status(500).json({ error: 'Failed to create trade offer' });
  }
});

// Отменить trade offer
router.post('/cancel/:offerId', authenticateToken, async (req, res) => {
  try {
    const { offerId } = req.params;

    const result = await tradeOfferService.cancelOffer(offerId);

    res.json({
      success: true,
      offerId,
      message: 'Trade offer cancelled'
    });

  } catch (error) {
    logger.error('Error cancelling trade offer:', error);
    res.status(500).json({
      error: error.message || 'Failed to cancel trade offer'
    });
  }
});

// Получить информацию о trade offer
router.get('/offer/:offerId', authenticateToken, async (req, res) => {
  try {
    const { offerId } = req.params;
    const offerData = tradeOfferService.getOffer(offerId);

    if (!offerData) {
      return res.status(404).json({ error: 'Trade offer not found' });
    }

    res.json({
      offerId,
      status: offerData.status,
      partnerSteamId: offerData.partnerSteamId,
      myAssetIds: offerData.myAssetIds,
      theirAssetIds: offerData.theirAssetIds,
      createdAt: offerData.createdAt,
      updatedAt: offerData.updatedAt
    });

  } catch (error) {
    logger.error('Error fetching trade offer:', error);
    res.status(500).json({ error: 'Failed to fetch trade offer' });
  }
});

// Получить все активные trade offers
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const offers = tradeOfferService.getActiveOffers(user.steamId);

    res.json({
      count: offers.length,
      offers
    });

  } catch (error) {
    logger.error('Error fetching active offers:', error);
    res.status(500).json({ error: 'Failed to fetch active offers' });
  }
});

// Валидировать assetIds
router.post('/validate', authenticateToken, validateAssetIds, async (req, res) => {
  try {
    const { assetIds } = req.body;

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ error: 'assetIds must be a non-empty array' });
    }

    // Получаем активного бота
    const botManager = req.steamBotManager;
    if (!botManager || botManager.activeBots.length === 0) {
      return res.status(503).json({ error: 'No active bots available' });
    }

    const bot = botManager.activeBots[0];

    // Валидируем assetIds
    const validationResults = await tradeOfferService.validateAssetIds(bot, assetIds);

    const validItems = validationResults.filter(v => v.valid).map(v => v.item);
    const invalidItems = validationResults.filter(v => !v.valid);

    res.json({
      total: assetIds.length,
      valid: validItems.length,
      invalid: invalidItems.length,
      validItems,
      invalidItems
    });

  } catch (error) {
    logger.error('Error validating assetIds:', error);
    res.status(500).json({ error: 'Failed to validate assetIds' });
  }
});

// История trade offers
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Получаем все транзакции типа purchase/sale
    const transactions = await Transaction.find({
      user: user._id,
      type: { $in: ['purchase', 'sale'] }
    })
      .populate('marketListing', 'item.marketName item.iconUrl price')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      count: transactions.length,
      transactions
    });

  } catch (error) {
    logger.error('Error fetching trade history:', error);
    res.status(500).json({ error: 'Failed to fetch trade history' });
  }
});

// Принять trade offer автоматически (для тестирования)
router.post('/accept/:offerId', authenticateToken, async (req, res) => {
  try {
    const { offerId } = req.params;

    // В реальной системе пользователь принимает оффер в Steam
    // Этот endpoint только для отслеживания

    const offerData = tradeOfferService.getOffer(offerId);
    if (!offerData) {
      return res.status(404).json({ error: 'Trade offer not found' });
    }

    // Здесь можно добавить логику автоматического принятия
    // Но Steam требует, чтобы пользователь принял вручную

    res.json({
      success: true,
      message: 'Please accept this trade offer in your Steam mobile app or email',
      offerId,
      offerUrl: `https://steamcommunity.com/tradeoffer/${offerId}/`,
      instructions: 'Check your Steam mobile app or email to accept this trade offer'
    });

  } catch (error) {
    logger.error('Error in accept endpoint:', error);
    res.status(500).json({ error: 'Failed to process accept request' });
  }
});

module.exports = router;
