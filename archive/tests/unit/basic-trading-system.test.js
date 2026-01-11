// Unit tests for Basic Trading System
const BasicTradingSystem = require('../../basic-trading-system');

describe('BasicTradingSystem', () => {
  let tradingSystem;

  beforeEach(() => {
    tradingSystem = BasicTradingSystem;
    // Clear all data before each test
    tradingSystem.trades.clear();
    tradingSystem.offers.clear();
    tradingSystem.listings.clear();
    tradingSystem.tradeCounter = 1;
    tradingSystem.offerCounter = 1;
    tradingSystem.listingCounter = 1;
  });

  describe('constructor', () => {
    test('should initialize with correct counters and fee percentage', () => {
      expect(tradingSystem.tradeCounter).toBe(1);
      expect(tradingSystem.offerCounter).toBe(1);
      expect(tradingSystem.listingCounter).toBe(1);
      expect(tradingSystem.feePercentage).toBe(5);
    });
  });

  describe('createListing', () => {
    test('should create a new listing with correct data', () => {
      const userId = 'user_123';
      const steamId = '76561198012345678';
      const appId = '730';
      const itemId = 'item_123';
      const itemName = 'Test AK-47';
      const price = 250.50;
      const currency = 'USD';

      const listing = tradingSystem.createListing(
        userId, steamId, appId, itemId, itemName, price, currency
      );

      expect(listing).toMatchObject({
        id: 'listing_1',
        userId,
        steamId,
        appId,
        itemId,
        itemName,
        price,
        currency,
        status: 'active',
        fee: expect.any(Number),
        finalAmount: expect.any(Number)
      });

      expect(listing.createdAt).toBeDefined();
      expect(listing.updatedAt).toBeDefined();
    });

    test('should calculate correct marketplace fee', () => {
      const userId = 'user_123';
      const steamId = '76561198012345678';
      const appId = '730';
      const itemId = 'item_123';
      const itemName = 'Test AK-47';
      const price = 100.00;

      const listing = tradingSystem.createListing(
        userId, steamId, appId, itemId, itemName, price
      );

      const expectedFee = (price * 5) / 100; // 5% fee
      const expectedFinalAmount = price - expectedFee;

      expect(listing.fee).toBe(expectedFee);
      expect(listing.finalAmount).toBe(expectedFinalAmount);
    });

    test('should increment listing counter', () => {
      const userId = 'user_123';
      const steamId = '76561198012345678';
      const appId = '730';
      const itemId = 'item_123';
      const itemName = 'Test AK-47';
      const price = 100.00;

      tradingSystem.createListing(userId, steamId, appId, itemId, itemName, price);
      tradingSystem.createListing(userId, steamId, appId, itemId, itemName, price);

      expect(tradingSystem.listingCounter).toBe(3);
    });
  });

  describe('createOffer', () => {
    test('should create a new trade offer', () => {
      const fromUserId = 'user_123';
      const toSteamId = '76561198012345678';
      const appId = '730';
      const offerItems = [{ id: 'item_1', name: 'Item 1' }];
      const requestedItems = [{ id: 'item_2', name: 'Item 2' }];
      const message = 'Looking to trade';

      const offer = tradingSystem.createOffer(
        fromUserId, toSteamId, appId, offerItems, requestedItems, message
      );

      expect(offer).toMatchObject({
        id: 'offer_1',
        fromUserId,
        toSteamId,
        appId,
        offerItems,
        requestedItems,
        message,
        status: 'pending'
      });

      expect(offer.createdAt).toBeDefined();
      expect(offer.updatedAt).toBeDefined();
    });

    test('should create offer without message', () => {
      const fromUserId = 'user_123';
      const toSteamId = '76561198012345678';
      const appId = '730';
      const offerItems = [{ id: 'item_1', name: 'Item 1' }];
      const requestedItems = [{ id: 'item_2', name: 'Item 2' }];

      const offer = tradingSystem.createOffer(
        fromUserId, toSteamId, appId, offerItems, requestedItems
      );

      expect(offer.message).toBe('');
    });
  });

  describe('acceptOffer', () => {
    test('should accept a pending offer', () => {
      const offer = tradingSystem.createOffer(
        'user_123', '76561198012345678', '730',
        [{ id: 'item_1' }], [{ id: 'item_2' }]
      );

      const acceptedOffer = tradingSystem.acceptOffer(offer.id, '76561198012345678');

      expect(acceptedOffer.status).toBe('accepted');
      expect(acceptedOffer.acceptedBy).toBe('76561198012345678');
      expect(acceptedOffer.acceptedAt).toBeDefined();
      expect(acceptedOffer.updatedAt).toBeDefined();
    });

    test('should throw error for non-existent offer', () => {
      expect(() => {
        tradingSystem.acceptOffer('non-existent-offer', 'user_123');
      }).toThrow('Offer not found');
    });

    test('should throw error for non-pending offer', () => {
      const offer = tradingSystem.createOffer(
        'user_123', '76561198012345678', '730',
        [{ id: 'item_1' }], [{ id: 'item_2' }]
      );

      tradingSystem.acceptOffer(offer.id, '76561198012345678');

      expect(() => {
        tradingSystem.acceptOffer(offer.id, 'user_456');
      }).toThrow('Offer is not pending');
    });
  });

  describe('declineOffer', () => {
    test('should decline a pending offer', () => {
      const offer = tradingSystem.createOffer(
        'user_123', '76561198012345678', '730',
        [{ id: 'item_1' }], [{ id: 'item_2' }]
      );

      const declinedOffer = tradingSystem.declineOffer(offer.id, '76561198012345678', 'Not interested');

      expect(declinedOffer.status).toBe('declined');
      expect(declinedOffer.declinedBy).toBe('76561198012345678');
      expect(declinedOffer.declineReason).toBe('Not interested');
      expect(declinedOffer.declinedAt).toBeDefined();
    });

    test('should decline offer without reason', () => {
      const offer = tradingSystem.createOffer(
        'user_123', '76561198012345678', '730',
        [{ id: 'item_1' }], [{ id: 'item_2' }]
      );

      const declinedOffer = tradingSystem.declineOffer(offer.id, '76561198012345678');

      expect(declinedOffer.status).toBe('declined');
      expect(declinedOffer.declineReason).toBe('');
    });
  });

  describe('cancelOffer', () => {
    test('should cancel offer by creator', () => {
      const offer = tradingSystem.createOffer(
        'user_123', '76561198012345678', '730',
        [{ id: 'item_1' }], [{ id: 'item_2' }]
      );

      const cancelledOffer = tradingSystem.cancelOffer(offer.id, 'user_123');

      expect(cancelledOffer.status).toBe('cancelled');
      expect(cancelledOffer.cancelledBy).toBe('user_123');
      expect(cancelledOffer.cancelledAt).toBeDefined();
    });

    test('should throw error if non-creator tries to cancel', () => {
      const offer = tradingSystem.createOffer(
        'user_123', '76561198012345678', '730',
        [{ id: 'item_1' }], [{ id: 'item_2' }]
      );

      expect(() => {
        tradingSystem.cancelOffer(offer.id, 'user_456');
      }).toThrow('Only the offer creator can cancel');
    });
  });

  describe('completeTrade', () => {
    test('should complete a trade and mark listing as sold', () => {
      const userId = 'user_123';
      const listing = tradingSystem.createListing(
        userId, '76561198012345678', '730', 'item_123', 'Test Item', 100.00
      );

      const trade = tradingSystem.completeTrade(listing.id, 'user_456', 'txn_123');

      expect(trade).toMatchObject({
        id: 'trade_1',
        listingId: listing.id,
        sellerUserId: userId,
        buyerUserId: 'user_456',
        transactionId: 'txn_123',
        amount: 100.00,
        fee: 5.00,
        netAmount: 95.00,
        currency: 'USD',
        status: 'completed'
      });

      expect(trade.createdAt).toBeDefined();
      expect(trade.completedAt).toBeDefined();

      // Check that listing is marked as sold
      const updatedListing = tradingSystem.getListing(listing.id);
      expect(updatedListing.status).toBe('sold');
      expect(updatedListing.soldAt).toBeDefined();
      expect(updatedListing.buyerUserId).toBe('user_456');
    });

    test('should throw error for non-existent listing', () => {
      expect(() => {
        tradingSystem.completeTrade('non-existent-listing', 'user_456', 'txn_123');
      }).toThrow('Listing not found');
    });

    test('should throw error for non-active listing', () => {
      const listing = tradingSystem.createListing(
        'user_123', '76561198012345678', '730', 'item_123', 'Test Item', 100.00
      );

      // Manually mark as sold
      listing.status = 'sold';

      expect(() => {
        tradingSystem.completeTrade(listing.id, 'user_456', 'txn_123');
      }).toThrow('Listing is not active');
    });
  });

  describe('calculateFee', () => {
    test('should calculate 5% fee correctly', () => {
      expect(tradingSystem.calculateFee(100)).toBe(5);
      expect(tradingSystem.calculateFee(200)).toBe(10);
      expect(tradingSystem.calculateFee(50)).toBe(2.5);
      expect(tradingSystem.calculateFee(0)).toBe(0);
    });

    test('should handle string input', () => {
      expect(tradingSystem.calculateFee('100')).toBe(5);
      expect(tradingSystem.calculateFee('250.50')).toBe(12.525);
    });
  });

  describe('getUserListings', () => {
    test('should return only active listings for user', () => {
      const userId = 'user_123';

      // Create listings for different users
      tradingSystem.createListing(userId, '76561198012345678', '730', 'item_1', 'Item 1', 100);
      tradingSystem.createListing('user_456', '76561198012345678', '730', 'item_2', 'Item 2', 200);
      tradingSystem.createListing(userId, '76561198012345678', '730', 'item_3', 'Item 3', 150);

      // Mark one listing as sold
      const listings = tradingSystem.getUserListings(userId);
      const soldListing = tradingSystem.listings.get('listing_1');
      soldListing.status = 'sold';

      const userListings = tradingSystem.getUserListings(userId);

      expect(userListings).toHaveLength(1);
      expect(userListings[0].itemName).toBe('Item 3');
    });
  });

  describe('getUserOffers', () => {
    test('should return offers sent and received by user', () => {
      const userId = 'user_123';
      const steamId = '76561198012345678';

      // Create offers
      tradingSystem.createOffer(userId, '76561198012345678', '730', [], []); // Sent
      tradingSystem.createOffer('user_456', steamId, '730', [], []); // Received
      tradingSystem.createOffer('user_789', '765611980987654321', '730', [], []); // Not related

      const userOffers = tradingSystem.getUserOffers(userId, steamId);

      expect(userOffers).toHaveLength(2);
      expect(userOffers.some(offer => offer.fromUserId === userId)).toBe(true);
      expect(userOffers.some(offer => offer.toSteamId === steamId)).toBe(true);
    });
  });

  describe('getUserTrades', () => {
    test('should return trades for user as buyer or seller', () => {
      const sellerId = 'user_123';
      const buyerId = 'user_456';

      const listing = tradingSystem.createListing(
        sellerId, '76561198012345678', '730', 'item_123', 'Test Item', 100
      );

      // Complete trade
      tradingSystem.completeTrade(listing.id, buyerId, 'txn_123');

      // Create another trade where the buyer is now the seller
      const listing2 = tradingSystem.createListing(
        buyerId, '765611980456789012', '730', 'item_456', 'Another Item', 50
      );
      tradingSystem.completeTrade(listing2.id, sellerId, 'txn_456');

      const sellerTrades = tradingSystem.getUserTrades(sellerId);
      const buyerTrades = tradingSystem.getUserTrades(buyerId);

      expect(sellerTrades).toHaveLength(2);
      expect(buyerTrades).toHaveLength(2);
    });
  });

  describe('getActiveListings', () => {
    test('should return only active listings', () => {
      tradingSystem.createListing('user_123', '76561198012345678', '730', 'item_1', 'Item 1', 100);
      tradingSystem.createListing('user_456', '76561198012345678', '730', 'item_2', 'Item 2', 200);
      tradingSystem.createListing('user_789', '76561198012345678', '730', 'item_3', 'Item 3', 150);

      // Mark one as sold
      const soldListing = tradingSystem.listings.get('listing_1');
      soldListing.status = 'sold';

      const activeListings = tradingSystem.getActiveListings();

      expect(activeListings).toHaveLength(2);
      expect(activeListings.every(listing => listing.status === 'active')).toBe(true);
    });

    test('should apply filters correctly', () => {
      tradingSystem.createListing('user_123', '76561198012345678', '730', 'item_1', 'AK-47', 100);
      tradingSystem.createListing('user_456', '76561198012345678', '570', 'item_2', 'Pudge', 200);
      tradingSystem.createListing('user_789', '76561198012345678', '730', 'item_3', 'M4A4', 150);

      // Filter by App ID
      const cs2Listings = tradingSystem.getActiveListings({ appId: '730' });
      expect(cs2Listings).toHaveLength(2);
      expect(cs2Listings.every(listing => listing.appId === '730')).toBe(true);

      // Filter by price range
      const priceListings = tradingSystem.getActiveListings({ minPrice: 100, maxPrice: 150 });
      expect(priceListings).toHaveLength(2);
      expect(priceListings.every(listing => listing.price >= 100 && listing.price <= 150)).toBe(true);

      // Filter by item name
      const nameListings = tradingSystem.getActiveListings({ itemName: 'ak' });
      expect(nameListings).toHaveLength(1);
      expect(nameListings[0].itemName.toLowerCase()).toContain('ak');
    });

    test('should sort listings correctly', () => {
      tradingSystem.createListing('user_123', '76561198012345678', '730', 'item_1', 'Item 1', 150);
      tradingSystem.createListing('user_456', '76561198012345678', '730', 'item_2', 'Item 2', 100);
      tradingSystem.createListing('user_789', '76561198012345678', '730', 'item_3', 'Item 3', 200);

      // Sort by price low to high
      const lowToHigh = tradingSystem.getActiveListings({ sortBy: 'price_low' });
      expect(lowToHigh[0].price).toBe(100);
      expect(lowToHigh[2].price).toBe(200);

      // Sort by price high to low
      const highToLow = tradingSystem.getActiveListings({ sortBy: 'price_high' });
      expect(highToLow[0].price).toBe(200);
      expect(highToLow[2].price).toBe(100);

      // Sort by date (newest first)
      const byDate = tradingSystem.getActiveListings({ sortBy: 'date' });
      const time1 = new Date(byDate[0].createdAt).getTime();
      const time2 = new Date(byDate[1].createdAt).getTime();
      expect(time1).toBeGreaterThanOrEqual(time2);
    });
  });

  describe('getMarketplaceStats', () => {
    test('should return correct marketplace statistics', () => {
      // Create some data
      tradingSystem.createListing('user_123', '76561198012345678', '730', 'item_1', 'Item 1', 100);
      tradingSystem.createListing('user_456', '76561198012345678', '730', 'item_2', 'Item 2', 200);
      tradingSystem.createOffer('user_123', '76561198012345678', '730', [], []);

      // Complete one trade
      const listing = tradingSystem.listings.get('listing_1');
      tradingSystem.completeTrade(listing.id, 'user_789', 'txn_123');

      const stats = tradingSystem.getMarketplaceStats();

      expect(stats).toEqual({
        totalListings: 2,
        activeListings: 1,
        soldListings: 1,
        totalTrades: 1,
        totalVolume: 100, // Only completed trades count
        feePercentage: 5
      });
    });
  });

  describe('updateListingPrice', () => {
    test('should update listing price and recalculate fees', () => {
      const userId = 'user_123';
      const listing = tradingSystem.createListing(
        userId, '76561198012345678', '730', 'item_123', 'Test Item', 100
      );

      const updatedListing = tradingSystem.updateListingPrice(listing.id, 150, userId);

      expect(updatedListing.price).toBe(150);
      expect(updatedListing.fee).toBe(7.5); // 5% of 150
      expect(updatedListing.finalAmount).toBe(142.5);
      expect(updatedListing.updatedAt).toBeDefined();
    });

    test('should throw error for non-existent listing', () => {
      expect(() => {
        tradingSystem.updateListingPrice('non-existent', 100, 'user_123');
      }).toThrow('Listing not found');
    });

    test('should throw error for unauthorized user', () => {
      const listing = tradingSystem.createListing(
        'user_123', '76561198012345678', '730', 'item_123', 'Test Item', 100
      );

      expect(() => {
        tradingSystem.updateListingPrice(listing.id, 150, 'user_456');
      }).toThrow('Unauthorized - you can only update your own listings');
    });

    test('should throw error for non-active listing', () => {
      const userId = 'user_123';
      const listing = tradingSystem.createListing(
        userId, '76561198012345678', '730', 'item_123', 'Test Item', 100
      );

      // Mark as sold
      listing.status = 'sold';

      expect(() => {
        tradingSystem.updateListingPrice(listing.id, 150, userId);
      }).toThrow('Cannot update non-active listing');
    });
  });

  describe('removeListing', () => {
    test('should remove active listing', () => {
      const userId = 'user_123';
      const listing = tradingSystem.createListing(
        userId, '76561198012345678', '730', 'item_123', 'Test Item', 100
      );

      const removedListing = tradingSystem.removeListing(listing.id, userId);

      expect(removedListing.status).toBe('removed');
      expect(removedListing.removedAt).toBeDefined();
      expect(removedListing.updatedAt).toBeDefined();
    });

    test('should throw error for unauthorized removal', () => {
      const listing = tradingSystem.createListing(
        'user_123', '76561198012345678', '730', 'item_123', 'Test Item', 100
      );

      expect(() => {
        tradingSystem.removeListing(listing.id, 'user_456');
      }).toThrow('Unauthorized - you can only remove your own listings');
    });
  });
});