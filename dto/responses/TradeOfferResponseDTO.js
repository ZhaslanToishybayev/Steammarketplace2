/**
 * DTO for trade offer response
 */

class TradeOfferResponseDTO {
  constructor(tradeOffer) {
    this.id = tradeOffer._id;
    this.offerId = tradeOffer.offerId;
    this.steamId = tradeOffer.steamId;
    this.botId = tradeOffer.botId;
    this.itemsGiven = tradeOffer.itemsGiven;
    this.itemsReceived = tradeOffer.itemsReceived;
    this.status = tradeOffer.status;
    this.valueGiven = tradeOffer.valueGiven;
    this.valueReceived = tradeOffer.valueReceived;
    this.profit = tradeOffer.profit;
    this.createdAt = tradeOffer.createdAt;
    this.updatedAt = tradeOffer.updatedAt;
    this.completedAt = tradeOffer.completedAt;
    this.message = tradeOffer.message;
    this.escrowEndTime = tradeOffer.escrowEndTime;
    this.confirmationRequired = tradeOffer.confirmationRequired;
    this.partnerName = tradeOffer.partnerName;
    this.partnerAvatar = tradeOffer.partnerAvatar;
    this.tradeType = tradeOffer.tradeType;
    this.errorMessage = tradeOffer.errorMessage;
    this.errorCode = tradeOffer.errorCode;
    this.tradeUrl = tradeOffer.tradeUrl;
  }

  static forUser(tradeOffer) {
    const dto = new TradeOfferResponseDTO(tradeOffer);
    // Hide sensitive bot information
    if (dto.botId) {
      delete dto.botId;
    }
    return dto;
  }

  static list(tradeOffers) {
    return tradeOffers.map(offer => TradeOfferResponseDTO.forUser(offer));
  }

  toJSON() {
    return {
      id: this.id,
      offerId: this.offerId,
      steamId: this.steamId,
      itemsGiven: this.itemsGiven,
      itemsReceived: this.itemsReceived,
      status: this.status,
      valueGiven: this.valueGiven,
      valueReceived: this.valueReceived,
      profit: this.profit,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
      message: this.message,
      escrowEndTime: this.escrowEndTime,
      confirmationRequired: this.confirmationRequired,
      partnerName: this.partnerName,
      partnerAvatar: this.partnerAvatar,
      tradeType: this.tradeType,
      errorMessage: this.errorMessage,
      errorCode: this.errorCode,
      tradeUrl: this.tradeUrl
    };
  }
}

module.exports = TradeOfferResponseDTO;
