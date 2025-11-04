const mongoose = require('mongoose');

// Market Listing Schema
const marketListingSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  itemName: { type: String, required: true },
  skinName: { type: String, required: true },
  weaponType: { type: String, required: true },
  rarity: { type: String, required: true },
  price: { type: Number, required: true },
  condition: { type: String, required: true },
  imageUrl: { type: String, required: true },
  sellerId: { type: String, required: true },
  sellerName: { type: String, required: true },
  status: { type: String, enum: ['active', 'sold', 'cancelled'], default: 'active' },
  tradeOfferId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MarketListing = mongoose.models.MarketListing || mongoose.model('MarketListing', marketListingSchema);

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketListing', required: true },
  buyerId: { type: String, required: true },
  buyerName: { type: String, required: true },
  sellerId: { type: String, required: true },
  sellerName: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  tradeOfferId: { type: String },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

// Sample data for MVP
const sampleListings = [
  {
    itemId: '1',
    itemName: 'AK-47 | Redline (Field-Tested)',
    skinName: 'Redline',
    weaponType: 'AK-47',
    rarity: 'Classified',
    price: 45.99,
    condition: 'Field-Tested',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/3563296/300x300',
    sellerId: 'demo_user_1',
    sellerName: 'SkinTrader123',
    status: 'active'
  },
  {
    itemId: '2',
    itemName: 'AWP | Dragon Lore (Factory New)',
    skinName: 'Dragon Lore',
    weaponType: 'AWP',
    rarity: 'Covert',
    price: 1250.00,
    condition: 'Factory New',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/1691135/300x300',
    sellerId: 'demo_user_2',
    sellerName: 'CS2Collector',
    status: 'active'
  },
  {
    itemId: '3',
    itemName: 'M4A4 | Howl (Minimal Wear)',
    skinName: 'Howl',
    weaponType: 'M4A4',
    rarity: 'Covert',
    price: 3500.00,
    condition: 'Minimal Wear',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/1793950/300x300',
    sellerId: 'demo_user_3',
    sellerName: 'RareSkins',
    status: 'active'
  },
  {
    itemId: '4',
    itemName: 'USP-S | Kill Confirmed (Factory New)',
    skinName: 'Kill Confirmed',
    weaponType: 'USP-S',
    rarity: 'Covert',
    price: 89.99,
    condition: 'Factory New',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/1783243/300x300',
    sellerId: 'demo_user_4',
    sellerName: 'PistolPro',
    status: 'active'
  },
  {
    itemId: '5',
    itemName: 'Glock | Fade (Factory New)',
    skinName: 'Fade',
    weaponType: 'Glock',
    rarity: 'Restricted',
    price: 120.50,
    condition: 'Factory New',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/3440094/300x300',
    sellerId: 'demo_user_5',
    sellerName: 'GlockMaster',
    status: 'active'
  },
  {
    itemId: '6',
    itemName: 'M4A1-S | Golden Coil (Minimal Wear)',
    skinName: 'Golden Coil',
    weaponType: 'M4A1-S',
    rarity: 'Covert',
    price: 65.75,
    condition: 'Minimal Wear',
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/1793950/300x300',
    sellerId: 'demo_user_6',
    sellerName: 'M4A1Sniper',
    status: 'active'
  }
];

class MarketplaceService {
  constructor(mongoConnection) {
    this.db = mongoConnection;
    this.MarketListing = MarketListing;
    this.Transaction = Transaction;
    this.initializeSampleData();
  }

  async initializeSampleData() {
    try {
      const count = await this.MarketListing.countDocuments();
      if (count === 0) {
        await this.MarketListing.insertMany(sampleListings);
        console.log('✅ Sample marketplace data initialized');
      }
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  }

  // Get all active listings with filters
  async getListings(filters = {}) {
    try {
      const query = { status: 'active', ...filters };
      const listings = await this.MarketListing.find(query).sort({ createdAt: -1 });
      return listings;
    } catch (error) {
      console.error('Error fetching listings:', error);
      throw error;
    }
  }

  // Get listings by weapon type
  async getListingsByWeapon(weaponType) {
    try {
      const listings = await this.MarketListing.find({
        weaponType: weaponType,
        status: 'active'
      }).sort({ price: 1 });
      return listings;
    } catch (error) {
      console.error('Error fetching listings by weapon:', error);
      throw error;
    }
  }

  // Search listings
  async searchListings(searchTerm) {
    try {
      const listings = await this.MarketListing.find({
        status: 'active',
        $or: [
          { skinName: { $regex: searchTerm, $options: 'i' } },
          { itemName: { $regex: searchTerm, $options: 'i' } },
          { weaponType: { $regex: searchTerm, $options: 'i' } }
        ]
      }).sort({ price: 1 });
      return listings;
    } catch (error) {
      console.error('Error searching listings:', error);
      throw error;
    }
  }

  // Create new listing
  async createListing(listingData) {
    try {
      const listing = new this.MarketListing(listingData);
      await listing.save();
      return listing;
    } catch (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
  }

  // Purchase item (demo)
  async purchaseItem(listingId, buyerId, buyerName) {
    try {
      const listing = await this.MarketListing.findById(listingId);
      if (!listing || listing.status !== 'active') {
        throw new Error('Listing not found or not available');
      }

      // Create transaction
      const transaction = new this.Transaction({
        listingId: listing._id,
        buyerId: buyerId,
        buyerName: buyerName,
        sellerId: listing.sellerId,
        sellerName: listing.sellerName,
        price: listing.price,
        status: 'completed',
        tradeOfferId: `demo_${Date.now()}`
      });

      await transaction.save();

      // Update listing status
      listing.status = 'sold';
      await listing.save();

      return {
        success: true,
        listing: listing,
        transaction: transaction
      };
    } catch (error) {
      console.error('Error purchasing item:', error);
      throw error;
    }
  }

  // Get transactions
  async getTransactions(userId) {
    try {
      const transactions = await this.Transaction.find({
        $or: [{ buyerId: userId }, { sellerId: userId }]
      }).sort({ createdAt: -1 });
      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  // Get marketplace stats
  async getStats() {
    try {
      const totalListings = await this.MarketListing.countDocuments({ status: 'active' });
      const totalSold = await this.MarketListing.countDocuments({ status: 'sold' });
      const totalTrades = await this.Transaction.countDocuments({ status: 'completed' });

      const volumeResult = await this.Transaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ]);

      const totalVolume = volumeResult.length > 0 ? volumeResult[0].total : 0;

      return {
        totalListings,
        totalSold,
        totalTrades,
        totalVolume
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }
}

module.exports = MarketplaceService;
