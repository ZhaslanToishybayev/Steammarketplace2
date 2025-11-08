const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  steamId: {
    type: String,
    required: true,
    unique: true
  },
  steamName: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    required: true
  },
  profileUrl: {
    type: String,
    required: true
  },
  steamAccessToken: {
    type: String,
    default: null,
    required: false
  },
  steamRefreshToken: {
    type: String,
    default: null,
    required: false
  },
  tradeUrl: {
    type: String,
    default: null
  },
  wallet: {
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingBalance: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  steamInventory: [{
    assetId: String,
    classId: String,
    instanceId: String,
    name: String,
    marketName: String,
    iconUrl: String,
    tradable: Boolean,
    marketable: Boolean,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  userInventory: [{
    assetId: String,
    classId: String,
    instanceId: String,
    appid: Number,
    name: String,
    marketName: String,
    type: String,
    tradable: Boolean,
    marketable: Boolean,
    descriptions: Array,
    tags: Array,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  // Inventory organized by game (CS2, Dota 2, etc.)
  gameInventories: {
    type: Map,
    of: [{
      assetId: String,
      classId: String,
      instanceId: String,
      name: String,
      marketName: String,
      iconUrl: String,
      tradable: Boolean,
      marketable: Boolean,
      type: String,
      rarity: String,
      exterior: String,
      weapon: String,
      quality: String,
      stattrak: Boolean,
      souvenir: Boolean,
      amount: Number,
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    }],
    default: {}
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  reputation: {
    positive: {
      type: Number,
      default: 0
    },
    negative: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  settings: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      browser: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showInventory: {
        type: Boolean,
        default: true
      },
      showTradeHistory: {
        type: Boolean,
        default: false
      }
    }
  }
}, {
  timestamps: true
});

// Virtual for reputation percentage
userSchema.virtual('reputationPercentage').get(function() {
  if (this.reputation.total === 0) return 100;
  return Math.round((this.reputation.positive / this.reputation.total) * 100);
});

// Method to update inventory from Steam
userSchema.methods.updateInventory = async function(steamInventory) {
  this.steamInventory = steamInventory.map(item => ({
    assetId: item.assetid,
    classId: item.classid,
    instanceId: item.instanceid,
    name: item.name,
    marketName: item.market_name,
    iconUrl: item.icon_url,
    tradable: item.tradable === 1,
    marketable: item.marketable === 1,
    lastUpdated: new Date()
  }));
  
  await this.save();
};

// Add indexes for better query performance
userSchema.index({ steamId: 1 }, { unique: true });
userSchema.index({ username: 1 });
userSchema.index({ 'wallet.balance': 1 });
userSchema.index({ isBanned: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);