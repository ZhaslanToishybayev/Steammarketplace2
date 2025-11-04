// In-memory marketplace service for MVP demo (no MongoDB required)

class MarketplaceService {
  constructor(mongoConnection) {
    this.db = mongoConnection;
    this.MarketListing = this.createMockModel();
    this.Transaction = this.createMockModel();
    this.listings = [...this.getSampleListings()];
    this.transactions = [];
    this.initializeSampleData();
  }

  createMockModel() {
    const parent = this; // Capture parent context
    return class MockModel {
      constructor(data) {
        Object.assign(this, data);
        this._id = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.createdAt = new Date();
        this.updatedAt = new Date();
      }

      static get listings() {
        return parent.listings;
      }

      static get transactions() {
        return parent.transactions;
      }

      static async countDocuments(query = {}) {
        return this.filterByQuery(this.listings, query).length;
      }

      static async find(query = {}, sort = {}) {
        let results = this.filterByQuery(this.listings, query);
        if (sort.createdAt === -1) {
          results = results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sort.price === 1) {
          results = results.sort((a, b) => a.price - b.price);
        }
        return results;
      }

      static async findById(id) {
        return this.listings.find(l => l._id === id) || null;
      }

      static async aggregate(pipeline) {
        // Simplified aggregation for demo
        return this.transactions.reduce((acc, transaction) => {
          const existing = acc.find(item => item._id === transaction.status);
          if (existing) {
            existing.total += transaction.price;
          } else {
            acc.push({ _id: transaction.status, total: transaction.price });
          }
          return acc;
        }, []);
      }

      static insertMany(docs) {
        const instances = docs.map(doc => new this(doc));
        this.listings.push(...instances);
        return instances;
      }

      static filterByQuery(data, query) {
        if (!query || Object.keys(query).length === 0) return data;
        return data.filter(item => {
          for (const key in query) {
            if (query[key] !== undefined && item[key] !== query[key]) {
              return false;
            }
          }
          return true;
        });
      }

      async save() {
        if (!this._id) {
          this._id = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          this.constructor.listings.push(this);
        } else {
          const index = this.constructor.listings.findIndex(l => l._id === this._id);
          if (index !== -1) {
            this.constructor.listings[index] = this;
          }
        }
        return this;
      }
    };
  }

  getSampleListings() {
    return [
      {
        _id: '1',
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
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '2',
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
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '3',
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
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '4',
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
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '5',
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
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: '6',
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
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  async initializeSampleData() {
    console.log('✅ Sample marketplace data initialized (In-Memory)');
  }

  // Get all active listings with filters
  async getListings(filters = {}) {
    try {
      const query = { status: 'active', ...filters };
      const listings = await this.MarketListing.find(query, { createdAt: -1 });
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
      }, { price: 1 });
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
        status: 'active'
      }, { price: 1 });

      const searchRegex = new RegExp(searchTerm, 'i');
      return listings.filter(listing =>
        searchRegex.test(listing.skinName) ||
        searchRegex.test(listing.itemName) ||
        searchRegex.test(listing.weaponType)
      );
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
        tradeOfferId: `demo_${Date.now()}`,
        createdAt: new Date(),
        completedAt: new Date()
      });

      this.transactions.push(transaction);

      // Update listing status
      listing.status = 'sold';
      // Find and update the listing in the parent array
      const index = parent.listings.findIndex(l => l._id === listing._id);
      if (index !== -1) {
        parent.listings[index] = listing;
      }

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
      const transactions = this.transactions.filter(
        t => t.buyerId === userId || t.sellerId === userId
      ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
      const totalTrades = this.transactions.filter(t => t.status === 'completed').length;

      const totalVolume = this.transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.price, 0);

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
