/**
 * Security Event Model - События безопасности
 * ===========================================
 */

const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      // Authentication events
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT_SUCCESS',
      'LOGOUT_FAILED',
      'PASSWORD_CHANGE',
      'PASSWORD_CHANGE_FAILED',
      'EMAIL_CHANGE',
      'EMAIL_CHANGE_FAILED',
      'EMAIL_VERIFICATION_SENT',
      'EMAIL_VERIFIED',
      'EMAIL_VERIFICATION_FAILED',
      'TWO_FA_ENABLED',
      'TWO_FA_DISABLED',
      'TWO_FA_VERIFICATION_SENT',
      'TWO_FA_VERIFICATION_FAILED',

      // Suspicious activity
      'SUSPICIOUS_LOGIN',
      'MULTIPLE_FAILED_ATTEMPTS',
      'UNUSUAL_ACTIVITY',
      'GEOGRAPHIC_ANOMALY',
      'TIME_BASED_ANOMALY',
      'DEVICE_CHANGE',
      'NEW_DEVICE_LOGIN',
      'CONCURRENT_SESSIONS',

      // Security breaches
      'PASSWORD_BREACH',
      'ACCOUNT_TAKEOVER_ATTEMPT',
      'BRUTE_FORCE_ATTACK',
      'SQL_INJECTION_ATTEMPT',
      'XSS_ATTEMPT',
      'CSRF_ATTEMPT',
      'DIRECTORY_TRAVERSAL_ATTEMPT',

      // Rate limiting
      'RATE_LIMIT_EXCEEDED',
      'API_ABUSE_DETECTED',
      'BURST_REQUEST_DETECTED',
      'BOT_DETECTED',

      // System events
      'UNAUTHORIZED_ACCESS',
      'PRIVILEGE_ESCALATION_ATTEMPT',
      'ADMIN_ACTION_PERFORMED',
      'CONFIGURATION_CHANGE',
      'DATA_EXPORT',
      'DATA_IMPORT',
      'BACKUP_PERFORMED',
      'BACKUP_FAILED',

      // Trade-related security
      'SUSPICIOUS_TRADE',
      'TRADE_OFFER_FLOOD',
      'HIGH_VALUE_TRADE',
      'TRADE_FROM_NEW_LOCATION',

      // Financial security
      'SUSPICIOUS_DEPOSIT',
      'LARGE_WITHDRAWAL',
      'MULTIPLE_PAYMENT_FAILURES',
      'CHARGEBACK_DETECTED',

      // Malware & threats
      'MALWARE_DETECTED',
      'PHISHING_ATTEMPT',
      'TROJAN_DETECTED',
      'RANSOMWARE_ATTEMPT',

      // Investigation
      'MANUAL_REVIEW_REQUIRED',
      'INVESTIGATION_STARTED',
      'INVESTIGATION_COMPLETED',
      'FALSE_POSITIVE',

      // Response actions
      'IP_BLOCKED',
      'ACCOUNT_SUSPENDED',
      'ACCOUNT_BANNED',
      'SESSION_TERMINATED',
      'REQUIRED_2FA',
      'FORCED_PASSWORD_RESET',
      'EMAIL_ALERT_SENT',
      'ADMIN_NOTIFIED'
    ],
    index: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['P1', 'P2', 'P3', 'P4'],
    default: 'P3',
    index: true
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'FALSE_POSITIVE', 'IGNORED'],
    default: 'OPEN',
    index: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
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
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  location: {
    country: String,
    city: String,
    region: String,
    latitude: Number,
    longitude: Number,
    timezone: String,
    isp: String,
    asn: String
  },
  deviceInfo: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'api', 'unknown']
    },
    os: String,
    browser: String,
    browserVersion: String,
    platform: String,
    device: String,
    isBot: Boolean,
    isTor: Boolean,
    isProxy: Boolean,
    isVpn: Boolean
  },
  sessionInfo: {
    sessionId: String,
    previousLogin: Date,
    loginStreak: Number,
    concurrentSessions: Number
  },
  relatedEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SecurityEvent'
  }],
  tags: [{
    type: String,
    maxlength: 50
  }],
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  resolution: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  falsePositive: {
    type: Boolean,
    default: false
  },
  falsePositiveReason: {
    type: String,
    maxlength: 500
  },
  actionsTaken: [{
    type: {
      type: String,
      enum: ['NONE', 'BLOCKED_IP', 'SUSPENDED_ACCOUNT', 'REQUIRED_2FA', 'LOGGED_OUT_ALL_SESSIONS', 'SENT_ALERT', 'CREATED_TICKET']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String,
    successful: {
      type: Boolean,
      default: true
    }
  }],
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  autoResolved: {
    type: Boolean,
    default: false
  },
  escalated: {
    type: Boolean,
    default: false
  },
  escalatedAt: Date,
  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  // TTL index to auto-delete old security events after 2 years
  expireAfterSeconds: 2 * 365 * 24 * 60 * 60
});

// Indexes for performance
securityEventSchema.index({ userId: 1, createdAt: -1 });
securityEventSchema.index({ severity: 1, status: 1, createdAt: -1 });
securityEventSchema.index({ type: 1, createdAt: -1 });
securityEventSchema.index({ ipAddress: 1, createdAt: -1 });
securityEventSchema.index({ status: 1, priority: 1 });
securityEventSchema.index({ resolvedBy: 1, resolvedAt: -1 });
securityEventSchema.index({ riskScore: -1, createdAt: -1 });
securityEventSchema.index({ autoResolved: 1, createdAt: -1 });

// Text index for searching
securityEventSchema.index({
  description: 'text',
  type: 'text',
  'details.description': 'text',
  tags: 'text'
});

// Virtual for isOpen
securityEventSchema.virtual('isOpen').get(function() {
  return this.status === 'OPEN' || this.status === 'IN_PROGRESS';
});

// Virtual for age in hours
securityEventSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});

// Virtual for isHighRisk
securityEventSchema.virtual('isHighRisk').get(function() {
  return this.riskScore >= 70 || this.severity === 'CRITICAL';
});

// Method to resolve event
securityEventSchema.methods.resolve = function(userId, resolution = '', falsePositive = false) {
  this.status = 'RESOLVED';
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  this.resolution = resolution;
  this.falsePositive = falsePositive;

  if (falsePositive) {
    this.status = 'FALSE_POSITIVE';
    this.falsePositiveReason = resolution;
  }

  return this.save();
};

// Method to escalate event
securityEventSchema.methods.escalate = function(userId) {
  this.escalated = true;
  this.escalatedAt = new Date();
  this.escalatedTo = userId;
  return this.save();
};

// Method to add action taken
securityEventSchema.methods.addAction = function(action, userId, details = '', successful = true) {
  this.actionsTaken.push({
    type: action,
    performedBy: userId,
    timestamp: new Date(),
    details: details,
    successful: successful
  });

  return this.save();
};

// Method to calculate risk score
securityEventSchema.methods.calculateRiskScore = function() {
  let score = 0;

  // Base score by type
  const typeScores = {
    'BRUTE_FORCE_ATTACK': 90,
    'ACCOUNT_TAKEOVER_ATTEMPT': 85,
    'SUSPICIOUS_LOGIN': 70,
    'MALWARE_DETECTED': 80,
    'DATA_EXPORT': 75,
    'PRIVILEGE_ESCALATION_ATTEMPT': 85,
    'UNAUTHORIZED_ACCESS': 60,
    'RATE_LIMIT_EXCEEDED': 40,
    'LOGIN_FAILED': 30
  };

  score = typeScores[this.type] || 50;

  // Adjust by severity
  const severityMultipliers = {
    'LOW': 0.7,
    'MEDIUM': 1.0,
    'HIGH': 1.3,
    'CRITICAL': 1.5
  };

  score *= severityMultipliers[this.severity] || 1.0;

  // Check if from new location
  if (this.details.newLocation) {
    score += 10;
  }

  // Check if multiple failed attempts
  if (this.details.attemptCount && this.details.attemptCount > 5) {
    score += 20;
  }

  // Ensure score is within bounds
  this.riskScore = Math.min(100, Math.max(0, Math.round(score)));

  return this.riskScore;
};

// Static method to get events by severity
securityEventSchema.statics.getEventsBySeverity = function(severity, options = {}) {
  const {
    startDate,
    endDate,
    limit = 100
  } = options;

  const query = { severity };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username steamId')
    .populate('resolvedBy', 'username');
};

// Static method to get open events
securityEventSchema.statics.getOpenEvents = function(limit = 50) {
  return this.find({
    status: { $in: ['OPEN', 'IN_PROGRESS'] }
  })
    .sort({ priority: 1, createdAt: 1 })
    .limit(limit)
    .populate('userId', 'username steamId');
};

// Static method to get events by IP
securityEventSchema.statics.getEventsByIP = function(ipAddress, limit = 100) {
  return this.find({ ipAddress })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username steamId');
};

// Static method to get statistics
securityEventSchema.statics.getStatistics = function(timeframe = 30 * 24 * 60 * 60 * 1000) {
  const startDate = new Date(Date.now() - timeframe);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$severity',
        count: { $sum: 1 },
        avgRiskScore: { $avg: '$riskScore' },
        resolvedCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0]
          }
        },
        falsePositiveCount: {
          $sum: {
            $cond: [{ $eq: ['$falsePositive', true] }, 1, 0]
          }
        }
      }
    }
  ]);
};

// Static method to detect patterns
securityEventSchema.statics.detectPatterns = function() {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
        status: { $ne: 'FALSE_POSITIVE' }
      }
    },
    {
      $group: {
        _id: {
          ipAddress: '$ipAddress',
          type: '$type'
        },
        count: { $sum: 1 },
        users: { $addToSet: '$userId' },
        firstEvent: { $min: '$createdAt' },
        lastEvent: { $max: '$createdAt' }
      }
    },
    {
      $match: {
        count: { $gte: 10 }, // More than 10 events
        users: { $size: { $gt: 1 } } // Multiple users affected
      }
    }
  ]);
};

// Pre-save middleware
securityEventSchema.pre('save', function(next) {
  // Auto-calculate risk score if not set
  if (!this.riskScore || this.isModified('severity') || this.isModified('type')) {
    this.calculateRiskScore();
  }

  // Auto-set priority based on severity and risk score
  if (this.severity === 'CRITICAL' || this.riskScore >= 80) {
    this.priority = 'P1';
  } else if (this.severity === 'HIGH' || this.riskScore >= 60) {
    this.priority = 'P2';
  } else if (this.severity === 'MEDIUM') {
    this.priority = 'P3';
  } else {
    this.priority = 'P4';
  }

  // Auto-add tags based on type
  if (!this.tags || this.tags.length === 0) {
    if (this.type.includes('LOGIN')) this.tags.push('authentication');
    if (this.type.includes('TRADE')) this.tags.push('trading');
    if (this.type.includes('PAYMENT') || this.type.includes('DEPOSIT') || this.type.includes('WITHDRAWAL')) {
      this.tags.push('financial');
    }
    if (this.type.includes('ADMIN')) this.tags.push('admin');
  }

  next();
});

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
