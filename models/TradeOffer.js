const mongoose = require('mongoose');

const tradeOfferSchema = new mongoose.Schema({
  offerId: { type: String, required: true, unique: true },
  steamId: { type: String, required: true },
  botId: { type: String, required: true },

  // Предметы
  itemsGiven: [{
    assetId: String,
    classId: String,
    instanceId: String,
    name: String,
    marketName: String,
    iconUrl: String,
    appId: String,
    contextId: String,
    amount: { type: Number, default: 1 }
  }],

  itemsReceived: [{
    assetId: String,
    classId: String,
    instanceId: String,
    name: String,
    marketName: String,
    iconUrl: String,
    appId: String,
    contextId: String,
    amount: { type: Number, default: 1 }
  }],

  // Статус
  status: {
    type: String,
    enum: ['sent', 'active', 'accepted', 'declined', 'cancelled', 'timeout', 'escrow', 'failed'],
    default: 'sent'
  },

  // Ценность
  valueGiven: { type: Number, default: 0 },
  valueReceived: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },

  // Временные метки
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },

  // Сообщение
  message: { type: String },

  // Steam специфика
  escrowEndTime: { type: Date },
  confirmationRequired: { type: Boolean, default: false },

  // Additional metadata
  partnerName: String,
  partnerAvatar: String,
  tradeType: {
    type: String,
    enum: ['buy', 'sell', 'swap', 'unknown'],
    default: 'unknown'
  },

  // Error details if failed
  errorMessage: String,
  errorCode: String,

  // System fields
  metadata: {
    source: { type: String, default: 'web' },
    ipAddress: String,
    userAgent: String
  }

}, {
  timestamps: true
});

// Индексы для быстрого поиска
tradeOfferSchema.index({ steamId: 1, createdAt: -1 });
tradeOfferSchema.index({ botId: 1, createdAt: -1 });
tradeOfferSchema.index({ status: 1 });
tradeOfferSchema.index({ offerId: 1 });

// Virtual for offer URL
tradeOfferSchema.virtual('tradeUrl').get(function() {
  return `https://steamcommunity.com/tradeoffer/${this.offerId}/`;
});

// Pre-save middleware
tradeOfferSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // Calculate profit
  if (this.isModified('valueGiven') || this.isModified('valueReceived')) {
    this.profit = this.valueGiven - this.valueReceived;
  }

  next();
});

// Method to calculate duration
tradeOfferSchema.methods.getDuration = function() {
  if (this.completedAt) {
    return this.completedAt - this.createdAt;
  }
  return Date.now() - this.createdAt;
};

// Static method to get trade statistics
tradeOfferSchema.statics.getStats = function(steamId, fromDate, toDate) {
  const match = { steamId };
  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = fromDate;
    if (toDate) match.createdAt.$lte = toDate;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$valueGiven' },
        totalProfit: { $sum: '$profit' }
      }
    }
  ]);
};

module.exports = mongoose.model('TradeOffer', tradeOfferSchema);
