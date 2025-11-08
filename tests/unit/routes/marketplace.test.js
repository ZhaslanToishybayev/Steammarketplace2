describe('Marketplace Routes', () => {
  describe('GET /', () => {
    test('should return listings with filters', () => {
      const marketplaceRoutes = require('../../../routes/marketplace');
      const MarketListing = require('../../../models/MarketListing');

      const mockListings = [
        {
          _id: '1',
          name: 'AK-47 | Redline',
          price: 100,
          status: 'active'
        },
        {
          _id: '2',
          name: 'AWP | Dragon Lore',
          price: 500,
          status: 'active'
        }
      ];

      MarketListing.find = jest.fn().mockReturnThis();
      MarketListing.populate = jest.fn().mockReturnThis();
      MarketListing.exec = jest.fn().mockResolvedValue(mockListings);

      const req = { query: { status: 'active' } };
      const res = {
        json: jest.fn()
      };

      marketplaceRoutes.getListings(req, res);

      expect(MarketListing.find).toHaveBeenCalledWith({ status: 'active' });
      expect(MarketListing.populate).toHaveBeenCalledWith('seller', 'username steamId');
      expect(res.json).toHaveBeenCalledWith(mockListings);
    });

    test('should handle errors', () => {
      const marketplaceRoutes = require('../../../routes/marketplace');
      const MarketListing = require('../../../models/MarketListing');

      MarketListing.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      marketplaceRoutes.getListings(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to fetch listings'
      });
    });
  });

  describe('POST /purchase', () => {
    test('should purchase listing successfully', async () => {
      const marketplaceRoutes = require('../../../routes/marketplace');
      const MarketListing = require('../../../models/MarketListing');
      const User = require('../../../models/User');

      const mockListing = {
        _id: 'listing123',
        price: 100,
        status: 'active',
        seller: 'seller123',
        save: jest.fn().mockResolvedValue(true)
      };

      const mockBuyer = {
        _id: 'buyer123',
        wallet: { balance: 500, pendingBalance: 0 },
        save: jest.fn().mockResolvedValue(true)
      };

      MarketListing.findById = jest.fn().mockResolvedValue(mockListing);
      User.findById = jest.fn().mockResolvedValue(mockBuyer);
      User.findOne = jest.fn().mockResolvedValue(null);

      const req = {
        body: { listingId: 'listing123' },
        user: { userId: 'buyer123' }
      };
      const res = {
        json: jest.fn()
      };

      await marketplaceRoutes.purchaseListing(req, res);

      expect(mockBuyer.wallet.pendingBalance).toBe(100);
      expect(mockListing.status).toBe('pending_trade');
      expect(res.json).toHaveBeenCalled();
    });

    test('should return error when listing not found', async () => {
      const marketplaceRoutes = require('../../../routes/marketplace');
      const MarketListing = require('../../../models/MarketListing');

      MarketListing.findById = jest.fn().mockResolvedValue(null);

      const req = {
        body: { listingId: 'nonexistent' },
        user: { userId: 'buyer123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await marketplaceRoutes.purchaseListing(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Listing not found'
      });
    });

    test('should return error when insufficient balance', async () => {
      const marketplaceRoutes = require('../../../routes/marketplace');
      const MarketListing = require('../../../models/MarketListing');
      const User = require('../../../models/User');

      const mockListing = {
        _id: 'listing123',
        price: 1000,
        status: 'active'
      };

      const mockBuyer = {
        _id: 'buyer123',
        wallet: { balance: 500 }
      };

      MarketListing.findById = jest.fn().mockResolvedValue(mockListing);
      User.findById = jest.fn().mockResolvedValue(mockBuyer);

      const req = {
        body: { listingId: 'listing123' },
        user: { userId: 'buyer123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await marketplaceRoutes.purchaseListing(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Insufficient balance'
      });
    });
  });
});
