/**
 * Audit Log Model - Система аудита действий пользователей
 * ======================================================
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED',
      'LOGOUT_FAILED',
      'CREATE_LISTING',
      'UPDATE_LISTING',
      'DELETE_LISTING',
      'BUY_ITEM',
      'SELL_ITEM',
      'DEPOSIT',
      'WITHDRAW',
      'TRANSFER',
      'BAN_USER',
      'UNBAN_USER',
      'UPDATE_BALANCE',
      'UPDATE_PROFILE',
      'ENABLE_2FA',
      'DISABLE_2FA',
      'FAILED_LOGIN_ATTEMPT',
      'PASSWORD_CHANGE',
      'EMAIL_VERIFY',
      'ADMIN_GRANT',
      'ADMIN_REVOKE',
      'TRADE_OFFER_CREATED',
      'TRADE_OFFER_ACCEPTED',
      'TRADE_OFFER_DECLINED',
      'TRADE_OFFER_CANCELLED',
      'DISPUTE_OPENED',
      'DISPUTE_RESOLVED',
      'REFUND_PROCESSED',
      'SYSTEM_BACKUP',
      'SYSTEM_RESTORE',
      'SECURITY_EVENT',
      'PERMISSION_DENIED',
      'API_ACCESS',
      'RATE_LIMIT_EXCEEDED'
    ],
    index: true
  },
  entityType: {
    type: String,
    enum: ['USER', 'LISTING', 'TRANSACTION', 'BALANCE', 'ADMIN', 'SYSTEM', 'AUTH', 'API', 'SECURITY'],
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    maxlength: 1000
  },
  sessionId: {
    type: String,
    index: true
  },
  risk: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW',
    index: true
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'BLOCKED', 'PENDING', 'REVIEWED'],
    default: 'SUCCESS',
    index: true
  },
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
    default: 'INFO',
    index: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  location: {
    country: String,
    city: String,
    region: String,
    latitude: Number,
    longitude: Number,
    timezone: String
  },
  deviceInfo: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'api', 'unknown']
    },
    os: String,
    browser: String,
    platform: String,
    isBot: Boolean
  },
  previousActivity: {
    lastLogin: Date,
    lastAction: String,
    actionCount: {
      type: Number,
      default: 1
    }
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNotes: {
    type: String,
    maxlength: 1000
  },
  tags: [{
    type: String,
    maxlength: 50
  }]
}, {
  timestamps: true,
  // TTL index to automatically delete old audit logs after 1 year
  expireAfterSeconds: 365 * 24 * 60 * 60
});

// Compound indexes for better query performance
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ risk: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ status: 1, severity: 1 });
auditLogSchema.index({ createdAt: -1, risk: 1 });

// Text index for searching
auditLogSchema.index({
  action: 'text',
  'metadata.description': 'text',
  tags: 'text'
});

// Virtual for time since event
auditLogSchema.virtual('timeSince').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for formatted timestamp
auditLogSchema.virtual('formattedTimestamp').get(function() {
  return this.createdAt.toISOString();
});

// Method to add review
auditLogSchema.methods.addReview = function(reviewerId, notes) {
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  return this.save();
};

// Method to check if this is a high-risk event
auditLogSchema.methods.isHighRisk = function() {
  const highRiskActions = [
    'BAN_USER',
    'UPDATE_BALANCE',
    'ADMIN_GRANT',
    'ADMIN_REVOKE',
    'SYSTEM_BACKUP',
    'SYSTEM_RESTORE',
    'RATE_LIMIT_EXCEEDED'
  ];
  return highRiskActions.includes(this.action) || this.risk === 'HIGH' || this.risk === 'CRITICAL';
};

// Static method to get audit trail for user
auditLogSchema.statics.getUserAuditTrail = function(userId, options = {}) {
  const {
    startDate,
    endDate,
    action,
    risk,
    limit = 50,
    skip = 0
  } = options;

  const query = { userId };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (action) query.action = action;
  if (risk) query.risk = risk;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('reviewedBy', 'username');
};

// Static method to get security events
auditLogSchema.statics.getSecurityEvents = function(options = {}) {
  const {
    startDate,
    endDate,
    severity,
    risk,
    limit = 100
  } = options;

  const query = {
    action: {
      $in: [
        'LOGIN_FAILED',
        'FAILED_LOGIN_ATTEMPT',
        'SECURITY_EVENT',
        'RATE_LIMIT_EXCEEDED',
        'PERMISSION_DENIED'
      ]
    }
  };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (severity) query.severity = severity;
  if (risk) query.risk = risk;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username steamId');
};

// Static method to get IP activity
auditLogSchema.statics.getIPActivity = function(ipAddress, options = {}) {
  const {
    startDate = Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
    endDate = Date.now(),
    limit = 50
  } = options;

  return this.find({
    ipAddress,
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username steamId');
};

// Pre-save middleware
auditLogSchema.pre('save', function(next) {
  // Automatically set severity based on action and risk
  if (!this.severity || this.severity === 'INFO') {
    if (this.action.includes('FAILED') || this.action.includes('BLOCKED')) {
      this.severity = 'ERROR';
    }
    if (this.risk === 'HIGH' || this.risk === 'CRITICAL') {
      this.severity = 'CRITICAL';
    }
  }

  // Add tags based on action
  if (!this.tags || this.tags.length === 0) {
    if (this.action.includes('LOGIN')) this.tags.push('auth');
    if (this.action.includes('TRADE')) this.tags.push('trading');
    if (this.action.includes('ADMIN')) this.tags.push('admin');
    if (this.action.includes('PAYMENT')) this.tags.push('payment');
  }

  next();
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
