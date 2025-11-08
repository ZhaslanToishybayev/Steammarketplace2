/**
 * Rate Limit Model - Интеллектуальный rate limiting
 * ================================================
 */

const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true, // IP address or userId
    index: true
  },
  type: {
    type: String,
    enum: ['IP', 'USER', 'API_KEY'],
    required: true,
    index: true
  },
  endpoint: {
    type: String,
    required: true,
    index: true
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    default: 'POST'
  },
  count: {
    type: Number,
    default: 0,
    min: 0
  },
  windowStart: {
    type: Date,
    required: true,
    index: true
  },
  blockedUntil: {
    type: Date,
    index: true
  },
  lastRequest: {
    type: Date,
    default: Date.now
  },
  requestHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    statusCode: Number,
    endpoint: String,
    method: String,
    userAgent: String,
    ipAddress: String
  }],
  maxRequests: {
    type: Number,
    default: 100
  },
  windowMs: {
    type: Number,
    default: 15 * 60 * 1000 // 15 minutes
  },
  burstLimit: {
    type: Number,
    default: 150
  },
  blockedReason: {
    type: String,
    maxlength: 500
  },
  unblockRequested: {
    type: Boolean,
    default: false
  },
  unblockRequestedAt: {
    type: Date
  },
  unblockReason: {
    type: String,
    maxlength: 500
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
rateLimitSchema.index({ identifier: 1, endpoint: 1, method: 1 });
rateLimitSchema.index({ blockedUntil: 1, blockedUntil: { $gt: new Date() } });
rateLimitSchema.index({ windowStart: -1 });
rateLimitSchema.index({ lastRequest: -1 });

// Virtual for isBlocked
rateLimitSchema.virtual('isBlocked').get(function() {
  return this.blockedUntil && this.blockedUntil > new Date();
});

// Virtual for remaining requests
rateLimitSchema.virtual('remainingRequests').get(function() {
  return Math.max(0, this.maxRequests - this.count);
});

// Virtual for reset time
rateLimitSchema.virtual('resetTime').get(function() {
  return new Date(this.windowStart.getTime() + this.windowMs);
});

// Virtual for isWindowExpired
rateLimitSchema.virtual('isWindowExpired').get(function() {
  return Date.now() > (this.windowStart.getTime() + this.windowMs);
});

// Method to add request
rateLimitSchema.methods.addRequest = function(options = {}) {
  this.count += 1;
  this.lastRequest = new Date();

  // Add to request history (keep last 100 requests)
  this.requestHistory.push({
    timestamp: new Date(),
    statusCode: options.statusCode || 200,
    endpoint: options.endpoint || this.endpoint,
    method: options.method || this.method,
    userAgent: options.userAgent,
    ipAddress: options.ipAddress
  });

  // Trim request history to last 100 requests
  if (this.requestHistory.length > 100) {
    this.requestHistory = this.requestHistory.slice(-100);
  }

  // Reset window if expired
  if (this.isWindowExpired) {
    this.windowStart = new Date();
    this.count = 1;
  }

  return this.save();
};

// Method to check if request should be blocked
rateLimitSchema.methods.shouldBlock = function() {
  if (this.isBlocked) return true;

  // Check if burst limit exceeded
  if (this.count > this.burstLimit) {
    return true;
  }

  return false;
};

// Method to block
rateLimitSchema.methods.block = function(durationMs = 60 * 60 * 1000, reason = 'Rate limit exceeded') {
  this.blockedUntil = new Date(Date.now() + durationMs);
  this.blockedReason = reason;
  return this.save();
};

// Method to unblock
rateLimitSchema.methods.unblock = function(reason = 'Manually unblocked') {
  this.blockedUntil = undefined;
  this.blockedReason = undefined;
  this.unblockRequested = false;
  this.unblockRequestedAt = undefined;
  this.unblockReason = reason;
  return this.save();
};

// Method to reset
rateLimitSchema.methods.reset = function() {
  this.windowStart = new Date();
  this.count = 0;
  this.requestHistory = [];
  this.blockedUntil = undefined;
  this.blockedReason = undefined;
  return this.save();
};

// Method to get request frequency (requests per minute)
rateLimitSchema.methods.getFrequency = function() {
  const windowMinutes = this.windowMs / (60 * 1000);
  return (this.count / windowMinutes).toFixed(2);
};

// Static method to get rate limit for identifier and endpoint
rateLimitSchema.statics.getRateLimit = function(identifier, endpoint, method = 'POST') {
  const windowStart = new Date(Date.now() - (15 * 60 * 1000)); // 15 minutes

  return this.findOne({
    identifier,
    endpoint,
    method,
    windowStart: { $gte: windowStart }
  });
};

// Static method to increment rate limit
rateLimitSchema.statics.increment = function(identifier, endpoint, method = 'POST', options = {}) {
  return this.findOneAndUpdate(
    {
      identifier,
      endpoint,
      method,
      windowStart: { $gte: new Date(Date.now() - (15 * 60 * 1000)) }
    },
    {
      $inc: { count: 1 },
      $set: {
        lastRequest: new Date(),
        'requestHistory': {
          timestamp: new Date(),
          statusCode: options.statusCode || 200,
          endpoint,
          method,
          userAgent: options.userAgent,
          ipAddress: options.ipAddress
        }
      }
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

// Static method to get top offenders
rateLimitSchema.statics.getTopOffenders = function(limit = 10, timeframe = 24 * 60 * 60 * 1000) {
  const startDate = new Date(Date.now() - timeframe);

  return this.aggregate([
    {
      $match: {
        lastRequest: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$identifier',
        totalRequests: { $sum: '$count' },
        maxRequests: { $max: '$count' },
        blockedCount: {
          $sum: {
            $cond: [{ $gt: ['$blockedUntil', new Date()] }, 1, 0]
          }
        },
        lastRequest: { $max: '$lastRequest' }
      }
    },
    {
      $sort: { totalRequests: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Static method to get endpoint statistics
rateLimitSchema.statics.getEndpointStats = function(endpoint, timeframe = 24 * 60 * 60 * 1000) {
  const startDate = new Date(Date.now() - timeframe);

  return this.aggregate([
    {
      $match: {
        endpoint,
        lastRequest: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: '$count' },
        uniqueIdentifiers: { $addToSet: '$identifier' },
        blockedRequests: {
          $sum: {
            $cond: [{ $gt: ['$blockedUntil', new Date()] }, '$count', 0]
          }
        },
        avgRequestsPerWindow: { $avg: '$count' },
        maxRequestsInWindow: { $max: '$count' }
      }
    }
  ]);
};

// Static method to clean up old records
rateLimitSchema.statics.cleanup = function(daysOld = 7) {
  const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));

  return this.deleteMany({
    lastRequest: { $lt: cutoffDate },
    blockedUntil: { $lt: new Date() }
  });
};

// Static method to get rate limiting analytics
rateLimitSchema.statics.getAnalytics = function(timeframe = 7 * 24 * 60 * 60 * 1000) {
  const startDate = new Date(Date.now() - timeframe);

  return this.aggregate([
    {
      $match: {
        lastRequest: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$lastRequest' } },
          hour: { $hour: '$lastRequest' }
        },
        totalRequests: { $sum: '$count' },
        uniqueIdentifiers: { $addToSet: '$identifier' },
        blockedRequests: {
          $sum: {
            $cond: [{ $gt: ['$blockedUntil', new Date()] }, '$count', 0]
          }
        }
      }
    },
    {
      $sort: { '_id.date': 1, '_id.hour': 1 }
    }
  ]);
};

// Pre-save middleware
rateLimitSchema.pre('save', function(next) {
  // Trim request history if too long
  if (this.requestHistory && this.requestHistory.length > 100) {
    this.requestHistory = this.requestHistory.slice(-100);
  }

  // Set defaults
  if (!this.windowStart) {
    this.windowStart = new Date();
  }

  // Auto-reset if window expired
  if (this.isWindowExpired) {
    this.windowStart = new Date();
    this.count = 0;
    this.requestHistory = [];
  }

  next();
});

module.exports = mongoose.model('RateLimit', rateLimitSchema);
