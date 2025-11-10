/**
 * DTO for market listing response
 */

class ListingResponseDTO {
  constructor(listing) {
    this.id = listing._id;
    this.seller = listing.seller;
    this.item = listing.item;
    this.price = listing.price;
    this.currency = listing.currency;
    this.status = listing.status;
    this.buyer = listing.buyer;
    this.views = listing.views;
    this.featured = listing.featured;
    this.autoAccept = listing.autoAccept;
    this.description = listing.description;
    this.tags = listing.tags;
    this.createdAt = listing.createdAt;
    this.updatedAt = listing.updatedAt;
    this.expiresAt = listing.expiresAt;
  }

  static withSeller(listing) {
    const dto = new ListingResponseDTO(listing);
    if (listing.seller && listing.seller._id) {
      dto.seller = {
        id: listing.seller._id,
        steamName: listing.seller.steamName,
        username: listing.seller.username,
        displayName: listing.seller.displayName,
        avatar: listing.seller.avatar,
        reputation: listing.seller.reputation
      };
    }
    return dto;
  }

  static list(listings) {
    return listings.map(listing => {
      if (listing.seller && listing.seller._id) {
        return ListingResponseDTO.withSeller(listing);
      }
      return new ListingResponseDTO(listing);
    });
  }

  toJSON() {
    return {
      id: this.id,
      seller: this.seller,
      item: this.item,
      price: this.price,
      currency: this.currency,
      status: this.status,
      buyer: this.buyer,
      views: this.views,
      featured: this.featured,
      autoAccept: this.autoAccept,
      description: this.description,
      tags: this.tags,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      expiresAt: this.expiresAt
    };
  }
}

module.exports = ListingResponseDTO;
