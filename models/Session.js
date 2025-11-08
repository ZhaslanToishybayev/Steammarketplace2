/**
 * Session Model - Управление сессиями пользователей
 * ================================================
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  refreshTokenHash: {
    type: String,
    index: true
  },
  accessTokenExpiresAt: {
    type: Date,
    required: true,
    index: true
  },
  refreshTokenExpiresAt: {
    type: Date,
    index: true
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
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  deviceInfo: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'api', 'unknown'],
      default: 'unknown'
    },
    os: String,
    browser: String,
    browserVersion: String,
    platform: String,
    isBot: Boolean,
    isMobile: Boolean,
    screenResolution: String
  },
  location: {
    country: String,
    city: String,
    region: String,
    latitude: Number,
    longitude: Number,
    timezone: String,
    isp: String
  },
  securityFlags: {
    geoAnomaly: {
      type: Boolean,
      default: false
    },
    deviceChange: {
      type: Boolean,
      default: false
    },
    timeAnomaly: {
      type: Boolean,
      default: false
    },
    suspiciousActivity: {
      type: Boolean,
      default: false
    }
  },
  refreshCount: {
    type: Number,
    default: 0
  },
  maxRefreshCount: {
    type: Number,
    default: 100
  },
  permissions: {
    type: [String],
    default: ['USER']
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  // TTL index to automatically expire sessions
  expireAfterSeconds: 60 * 60 * 24 * 30 // 30 days
});

// Indexes for performance
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ refreshTokenHash: 1 });
sessionSchema.index({ lastActivity: -1 });
sessionSchema.index({ isActive: 1, lastActivity: -1 });

// Virtual for isExpired
sessionSchema.virtual('isExpired').get(function() {
  return new Date() > this.accessTokenExpiresAt;
});

// Virtual for isRefreshExpired
sessionSchema.virtual('isRefreshExpired').get(function() {
  return new Date() > this.refreshTokenExpiresAt;
});

// Virtual for isValid
sessionSchema.virtual('isValid').get(function() {
  return this.isActive && !this.isExpired && !this.isRefreshExpired;
});

// Static method to create session
sessionSchema.statics.createSession = function(userId, accessToken, refreshToken, options = {}) {
  const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const now = new Date();
  const accessTokenExpiry = new Date(now.getTime() + (15 * 60 * 1000)); // 15 minutes
  const refreshTokenExpiry = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days

  return this.create({
    userId,
    tokenHash,
    refreshTokenHash,
    accessTokenExpiresAt: accessTokenExpiry,
    refreshTokenExpiresAt: refreshTokenExpiry,
    ipAddress: options.ipAddress || 'unknown',
    userAgent: options.userAgent || '',
    deviceInfo: options.deviceInfo || {},
    location: options.location || {},
    securityFlags: options.securityFlags || {},
    permissions: options.permissions || ['USER']
  });
};

// Static method to find session by refresh token
sessionSchema.statics.findByRefreshToken = function(refreshToken) {
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  return this.findOne({
    refreshTokenHash,
    isActive: true,
    refreshTokenExpiresAt: { $gt: new Date() }
  });
};

// Static method to find session by access token
sessionSchema.statics.findByAccessToken = function(accessToken) {
  const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
  return this.findOne({
    tokenHash,
    isActive: true,
    accessTokenExpiresAt: { $gt: new Date() }
  });
};

// Method to refresh tokens
sessionSchema.methods.refreshTokens = function() {
  const newAccessToken = crypto.randomBytes(64).toString('hex');
  const newRefreshToken = crypto.randomBytes(64).toString('hex');

  this.tokenHash = crypto.createHash('sha256').update(newAccessToken).digest('hex');
  this.refreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

  const now = new Date();
  this.accessTokenExpiresAt = new Date(now.getTime() + (15 * 60 * 1000)); // 15 minutes
  this.refreshTokenExpiresAt = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days

  this.refreshCount += 1;
  this.lastActivity = now;

  return this.save().then(() => ({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  }));
};

// Method to invalidate session
sessionSchema.methods.invalidate = function() {
  this.isActive = false;
  return this.save();
};

// Method to update last activity
sessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Method to check security flags
sessionSchema.methods.checkSecurity = function(currentIp, currentUserAgent, currentLocation) {
  const flags = {
    geoAnomaly: false,
    deviceChange: false,
    timeAnomaly: false,
    suspiciousActivity: false
  };

  // Check geo anomaly
  if (this.location.country && currentLocation.country) {
    if (this.location.country !== currentLocation.country) {
      flags.geoAnomaly = true;
    }
  }

  // Check device change
  if (this.deviceInfo.browser || this.deviceInfo.os) {
    if (this.deviceInfo.browser !== currentUserAgent ||
        this.deviceInfo.os !== currentUserAgent) {
      flags.deviceChange = true;
    }
  }

  // Check time anomaly (login at unusual hours)
  const hour = new Date().getHours();
  if (hour < 6 || hour > 23) {
    flags.timeAnomaly = true;
  }

  // Check suspicious activity (too many refreshes)
  if (this.refreshCount > this.maxRefreshCount) {
    flags.suspiciousActivity = true;
  }

  // Update security flags
  this.securityFlags = flags;
  this.lastActivity = new Date();

  return this.save();
};

// Static method to get active sessions for user
sessionSchema.statics.getActiveSessions = function(userId) {
  return this.find({
    userId,
    isActive: true,
    accessTokenExpiresAt: { $gt: new Date() }
  }).sort({ lastActivity: -1 });
};

// Static method to invalidate all sessions for user
sessionSchema.statics.invalidateAllSessions = function(userId) {
  return this.updateMany(
    { userId, isActive: true },
    { isActive: false }
  );
};

// Static method to clean up expired sessions
sessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { accessTokenExpiresAt: { $lt: new Date() } },
      { refreshTokenExpiresAt: { $lt: new Date() } },
      { isActive: false }
    ]
  });
};

// Pre-save middleware
sessionSchema.pre('save', function(next) {
  // Validate refresh count
  if (this.refreshCount > this.maxRefreshCount) {
    this.isActive = false;
  }

  // Set last activity
  if (this.isNew || this.isModified()) {
    this.lastActivity = new Date();
  }

  next();
});

module.exports = mongoose.model('Session', sessionSchema);
