/**
 * DTO for creating a trade offer
 */

class CreateTradeOfferDTO {
  constructor(data) {
    this.offerId = data.offerId;
    this.steamId = data.steamId;
    this.botId = data.botId;
    this.itemsGiven = data.itemsGiven || [];
    this.itemsReceived = data.itemsReceived || [];
    this.message = data.message;
  }

  validate() {
    const errors = [];

    if (!this.offerId) {
      errors.push('Offer ID is required');
    }

    if (!this.steamId) {
      errors.push('Steam ID is required');
    }

    if (!this.botId) {
      errors.push('Bot ID is required');
    }

    if (!this.itemsGiven || this.itemsGiven.length === 0) {
      errors.push('At least one item must be given');
    }

    if (!this.itemsReceived || this.itemsReceived.length === 0) {
      errors.push('At least one item must be received');
    }

    // Validate items structure
    [...this.itemsGiven, ...this.itemsReceived].forEach((item, index) => {
      if (!item.assetId) {
        errors.push(`Item ${index} is missing assetId`);
      }
      if (!item.name) {
        errors.push(`Item ${index} is missing name`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toModel() {
    return {
      offerId: this.offerId,
      steamId: this.steamId,
      botId: this.botId,
      itemsGiven: this.itemsGiven,
      itemsReceived: this.itemsReceived,
      message: this.message,
      status: 'sent',
      valueGiven: 0, // Will be calculated
      valueReceived: 0, // Will be calculated
      profit: 0 // Will be calculated
    };
  }
}

module.exports = CreateTradeOfferDTO;
