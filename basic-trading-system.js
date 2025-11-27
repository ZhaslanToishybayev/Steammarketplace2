// BASIC TRADING SYSTEM FOUNDATION - Professional marketplace approach

class BasicTradingSystem {
  constructor() {
    this.tradeCounter = 1;
    this.offerCounter = 1;
    this.listingCounter = 1;
    this.feePercentage = 5; // 5% marketplace fee

    // Instance properties for data storage
    this.trades = new Map();
    this.offers = new Map();
    this.listings = new Map();
  }

  // Create a new trade listing
  createListing(userId, steamId, appId, itemId, itemName, price, currency = 'USD') {
    const listingId = `listing_${this.listingCounter++}`;

    const listing = {
      id: listingId,
      userId: userId,
      steamId: steamId,
      appId: appId,
      itemId: itemId,
      itemName: itemName,
      price: parseFloat(price),
      currency: currency,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fee: this.calculateFee(price),
      finalAmount: parseFloat(price) - this.calculateFee(price)
    };

    this.listings.set(listingId, listing);
    console.log(`🏷️  New listing created: ${listingId} - ${itemName} for $${price}`);
    return listing;
  }

  // Create a trade offer
  createOffer(fromUserId, toSteamId, appId, offerItems, requestedItems, message = '') {
    const offerId = `offer_${this.offerCounter++}`;

    const offer = {
      id: offerId,
      fromUserId: fromUserId,
      toSteamId: toSteamId,
      appId: appId,
      offerItems: offerItems, // Array of items being offered
      requestedItems: requestedItems, // Array of items being requested
      message: message,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.offers.set(offerId, offer);
    console.log(`🤝 New offer created: ${offerId} from ${fromUserId} to ${toSteamId}`);
    return offer;
  }

  // Accept a trade offer
  acceptOffer(offerId, acceptingUserId) {
    const offer = this.offers.get(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.status !== 'pending') {
      throw new Error('Offer is not pending');
    }

    offer.status = 'accepted';
    offer.acceptedAt = new Date().toISOString();
    offer.acceptedBy = acceptingUserId;
    offer.updatedAt = new Date().toISOString();

    console.log(`✅ Offer ${offerId} accepted by ${acceptingUserId}`);
    return offer;
  }

  // Decline a trade offer
  declineOffer(offerId, decliningUserId, reason = '') {
    const offer = this.offers.get(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.status !== 'pending') {
      throw new Error('Offer is not pending');
    }

    offer.status = 'declined';
    offer.declinedAt = new Date().toISOString();
    offer.declinedBy = decliningUserId;
    offer.declineReason = reason;
    offer.updatedAt = new Date().toISOString();

    console.log(`❌ Offer ${offerId} declined by ${decliningUserId}: ${reason}`);
    return offer;
  }

  // Cancel a trade offer
  cancelOffer(offerId, cancelingUserId) {
    const offer = this.offers.get(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    if (offer.status !== 'pending') {
      throw new Error('Offer is not pending');
    }

    if (offer.fromUserId !== cancelingUserId) {
      throw new Error('Only the offer creator can cancel');
    }

    offer.status = 'cancelled';
    offer.cancelledAt = new Date().toISOString();
    offer.cancelledBy = cancelingUserId;
    offer.updatedAt = new Date().toISOString();

    console.log(`🚫 Offer ${offerId} cancelled by ${cancelingUserId}`);
    return offer;
  }

  // Complete a trade
  completeTrade(listingId, buyerUserId, transactionId) {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.status !== 'active') {
      throw new Error('Listing is not active');
    }

    const trade = {
      id: `trade_${this.tradeCounter++}`,
      listingId: listingId,
      sellerUserId: listing.userId,
      buyerUserId: buyerUserId,
      transactionId: transactionId,
      amount: listing.price,
      fee: listing.fee,
      netAmount: listing.finalAmount,
      currency: listing.currency,
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    // Mark listing as sold
    listing.status = 'sold';
    listing.soldAt = new Date().toISOString();
    listing.buyerUserId = buyerUserId;
    listing.updatedAt = new Date().toISOString();

    this.trades.set(trade.id, trade);
    console.log(`💰 Trade completed: ${trade.id} - ${listing.itemName} sold for $${listing.price}`);
    return trade;
  }

  // Calculate marketplace fee
  calculateFee(amount) {
    return (parseFloat(amount) * this.feePercentage) / 100;
  }

  // Get user's active listings
  getUserListings(userId) {
    return Array.from(this.listings.values()).filter(listing =>
      listing.userId === userId && listing.status === 'active'
    );
  }

  // Get user's trade offers (sent and received)
  getUserOffers(userId, steamId = null) {
    const userOffers = Array.from(this.offers.values()).filter(offer =>
      offer.fromUserId === userId || offer.toSteamId === steamId
    );
    return userOffers;
  }

  // Get user's trade history
  getUserTrades(userId) {
    return Array.from(this.trades.values()).filter(trade =>
      trade.sellerUserId === userId || trade.buyerUserId === userId
    );
  }

  // Get marketplace statistics
  getMarketplaceStats() {
    const totalListings = this.listings.size;
    const activeListings = Array.from(this.listings.values()).filter(l => l.status === 'active').length;
    const soldListings = Array.from(this.listings.values()).filter(l => l.status === 'sold').length;
    const totalTrades = this.trades.size;
    const totalVolume = Array.from(this.trades.values())
      .filter(t => t.status === 'completed')
      .reduce((sum, trade) => sum + trade.amount, 0);

    return {
      totalListings,
      activeListings,
      soldListings,
      totalTrades,
      totalVolume: parseFloat(totalVolume.toFixed(2)),
      feePercentage: this.feePercentage
    };
  }

  // Get all active listings for browsing
  getActiveListings(filters = {}) {
    let listingsArray = Array.from(this.listings.values()).filter(l => l.status === 'active');

    // Apply filters
    if (filters.appId) {
      listingsArray = listingsArray.filter(l => l.appId === filters.appId);
    }

    if (filters.minPrice) {
      listingsArray = listingsArray.filter(l => l.price >= filters.minPrice);
    }

    if (filters.maxPrice) {
      listingsArray = listingsArray.filter(l => l.price <= filters.maxPrice);
    }

    if (filters.itemName) {
      const searchLower = filters.itemName.toLowerCase();
      listingsArray = listingsArray.filter(l =>
        l.itemName.toLowerCase().includes(searchLower)
      );
    }

    // Sort by price or date
    if (filters.sortBy === 'price_low') {
      listingsArray.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'price_high') {
      listingsArray.sort((a, b) => b.price - a.price);
    } else {
      listingsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return listingsArray;
  }

  // Validate trade items (basic validation)
  validateTradeItems(steamId, appId, items) {
    // This would ideally check against the actual Steam inventory
    // For now, we'll do basic validation
    return items.every(item =>
      item.id && item.name && typeof item.name === 'string'
    );
  }

  // Get trade offer by ID
  getOffer(offerId) {
    return this.offers.get(offerId);
  }

  // Get listing by ID
  getListing(listingId) {
    return this.listings.get(listingId);
  }

  // Update listing price
  updateListingPrice(listingId, newPrice, userId) {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new Error('Unauthorized - you can only update your own listings');
    }

    if (listing.status !== 'active') {
      throw new Error('Cannot update non-active listing');
    }

    const oldPrice = listing.price;
    listing.price = parseFloat(newPrice);
    listing.fee = this.calculateFee(newPrice);
    listing.finalAmount = parseFloat(newPrice) - listing.fee;
    listing.updatedAt = new Date().toISOString();

    console.log(`💰 Listing ${listingId} price updated from $${oldPrice} to $${newPrice}`);
    return listing;
  }

  // Remove listing
  removeListing(listingId, userId) {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new Error('Unauthorized - you can only remove your own listings');
    }

    if (listing.status !== 'active') {
      throw new Error('Cannot remove non-active listing');
    }

    listing.status = 'removed';
    listing.removedAt = new Date().toISOString();
    listing.updatedAt = new Date().toISOString();

    console.log(`🗑️  Listing ${listingId} removed by ${userId}`);
    return listing;
  }
}

// Export singleton instance
module.exports = new BasicTradingSystem();