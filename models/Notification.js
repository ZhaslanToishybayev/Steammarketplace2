/**
 * Notification Model - Система уведомлений
 * =======================================
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      // Transaction notifications
      'DEPOSIT_SUCCESSFUL',
      'DEPOSIT_FAILED',
      'WITHDRAWAL_REQUESTED',
      'WITHDRAWAL_PROCESSED',
      'WITHDRAWAL_FAILED',
      'PAYMENT_RECEIVED',
      'PAYMENT_FAILED',

      // Trade notifications
      'TRADE_OFFER_RECEIVED',
      'TRADE_OFFER_ACCEPTED',
      'TRADE_OFFER_DECLINED',
      'TRADE_OFFER_CANCELLED',
      'TRADE_COMPLETED',
      'ITEM_SOLD',
      'ITEM_PURCHASED',
      'TRADE_FAILED',

      // Listing notifications
      'LISTING_CREATED',
      'LISTING_UPDATED',
      'LISTING_SOLD',
      'LISTING_EXPIRED',
      'PRICE_DROP_ALERT',

      // System notifications
      'ACCOUNT_SUSPENDED',
      'ACCOUNT_REACTIVATED',
      'ACCOUNT_BANNED',
      'ACCOUNT_UNBANNED',
      'PROFILE_UPDATED',
      'EMAIL_VERIFIED',
      'EMAIL_CHANGED',

      // Security notifications
      'SECURITY_ALERT',
      'SUSPICIOUS_LOGIN',
      'PASSWORD_CHANGED',
      'TWO_FA_ENABLED',
      'TWO_FA_DISABLED',
      'NEW_DEVICE_LOGIN',

      // Support notifications
      'DISPUTE_OPENED',
      'DISPUTE_RESOLVED',
      'TICKET_CREATED',
      'TICKET_REPLIED',
      'TICKET_CLOSED',

      // General notifications
      'ANNOUNCEMENT',
      'PROMOTION',
      'REFERRAL_BONUS',
      'LOYALTY_REWARD',
      'SYSTEM_MAINTENANCE',
      'NEW_FEATURE'
    ],
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  emailSent: {
    type: Boolean,
    default: false,
    index: true
  },
  emailSentAt: {
    type: Date
  },
  pushSent: {
    type: Boolean,
    default: false,
    index: true
  },
  pushSentAt: {
    type: Date
  },
  smsSent: {
    type: Boolean,
    default: false,
    index: true
  },
  smsSentAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL',
    index: true
  },
  channel: {
    type: String,
    enum: ['in-app', 'email', 'push', 'sms', 'all'],
    default: 'in-app',
    index: true
  },
  category: {
    type: String,
    enum: [
      'transaction',
      'trade',
      'listing',
      'account',
      'security',
      'support',
      'system',
      'marketing'
    ],
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  actionUrl: {
    type: String,
    maxlength: 500
  },
  actionText: {
    type: String,
    maxlength: 50
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
    default: 'pending',
    index: true
  },
  deliveryError: {
    type: String,
    maxlength: 500
  },
  templateId: {
    type: String,
    maxlength: 100
  },
  scheduledFor: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  // TTL index to auto-delete old notifications
  expireAfterSeconds: 30 * 24 * 60 * 60 // 30 days
});

// Indexes for performance
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });
notificationSchema.index({ category: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ emailSent: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, deliveryStatus: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Text index for searching
notificationSchema.index({
  title: 'text',
  message: 'text'
});

// Virtual for isRead
notificationSchema.virtual('isRead').get(function() {
  return this.read;
});

// Virtual for isExpired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for isScheduled
notificationSchema.virtual('isScheduled').get(function() {
  return this.scheduledFor && this.scheduledFor > new Date();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Method to mark as unread
notificationSchema.methods.markAsUnread = function() {
  this.read = false;
  this.readAt = undefined;
  return this.save();
};

// Method to mark as delivered
notificationSchema.methods.markAsDelivered = function(channel) {
  this.deliveryStatus = 'delivered';

  if (channel === 'email') {
    this.emailSent = true;
    this.emailSentAt = new Date();
  } else if (channel === 'push') {
    this.pushSent = true;
    this.pushSentAt = new Date();
  } else if (channel === 'sms') {
    this.smsSent = true;
    this.smsSentAt = new Date();
  }

  return this.save();
};

// Method to mark delivery failed
notificationSchema.methods.markDeliveryFailed = function(error) {
  this.deliveryStatus = 'failed';
  this.deliveryError = error;
  this.retryCount += 1;

  return this.save();
};

// Method to reschedule
notificationSchema.methods.reschedule = function(date) {
  this.scheduledFor = date;
  this.deliveryStatus = 'pending';
  return this.save();
};

// Static method to get unread notifications for user
notificationSchema.statics.getUnreadNotifications = function(userId, limit = 20) {
  return this.find({
    userId,
    read: false,
    $or: [
      { expiresAt: { $gt: new Date() } },
      { expiresAt: { $exists: false } }
    ]
  })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
};

// Static method to get notifications by category
notificationSchema.statics.getNotificationsByCategory = function(userId, category, limit = 50) {
  return this.find({
    userId,
    category,
    $or: [
      { expiresAt: { $gt: new Date() } },
      { expiresAt: { $exists: false } }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    userId,
    read: false,
    $or: [
      { expiresAt: { $gt: new Date() } },
      { expiresAt: { $exists: false } }
    ]
  });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      userId,
      read: false
    },
    {
      read: true,
      readAt: new Date()
    }
  );
};

// Static method to delete expired notifications
notificationSchema.statics.deleteExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Static method to create notification
notificationSchema.statics.createNotification = function(userId, type, title, message, options = {}) {
  return this.create({
    userId,
    type,
    title,
    message,
    data: options.data || {},
    priority: options.priority || 'NORMAL',
    channel: options.channel || 'in-app',
    category: options.category || 'system',
    actionUrl: options.actionUrl,
    actionText: options.actionText,
    expiresAt: options.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    scheduledFor: options.scheduledFor
  });
};

// Static method to create bulk notifications
notificationSchema.statics.createBulkNotifications = function(userIds, type, title, message, options = {}) {
  const notifications = userIds.map(userId => ({
    userId,
    type,
    title,
    message,
    data: options.data || {},
    priority: options.priority || 'NORMAL',
    channel: options.channel || 'in-app',
    category: options.category || 'system',
    actionUrl: options.actionUrl,
    actionText: options.actionText,
    expiresAt: options.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }));

  return this.insertMany(notifications);
};

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Auto-set category based on type
  if (!this.category) {
    if (this.type.includes('TRADE') || this.type.includes('ITEM')) {
      this.category = 'trade';
    } else if (this.type.includes('DEPOSIT') || this.type.includes('WITHDRAWAL') || this.type.includes('PAYMENT')) {
      this.category = 'transaction';
    } else if (this.type.includes('LISTING')) {
      this.category = 'listing';
    } else if (this.type.includes('SECURITY') || this.type.includes('LOGIN')) {
      this.category = 'security';
    } else if (this.type.includes('ACCOUNT')) {
      this.category = 'account';
    } else {
      this.category = 'system';
    }
  }

  // Set default expiration
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }

  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
