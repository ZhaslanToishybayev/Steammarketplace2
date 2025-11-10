/**
 * DTO for creating a market listing
 */

class CreateListingDTO {
  constructor(data) {
    this.assetId = data.assetId;
    this.classId = data.classId;
    this.instanceId = data.instanceId;
    this.name = data.name;
    this.marketName = data.marketName;
    this.iconUrl = data.iconUrl;
    this.price = data.price;
    this.description = data.description;
    this.autoAccept = data.autoAccept || false;
    this.exterior = data.exterior;
    this.rarity = data.rarity;
    this.type = data.type;
    this.weapon = data.weapon;
    this.skin = data.skin;
    this.stattrak = data.stattrak || false;
    this.souvenir = data.souvenir || false;
    this.float = data.float;
    this.inspectUrl = data.inspectUrl;
  }

  validate() {
    const errors = [];

    if (!this.assetId) {
      errors.push('Asset ID is required');
    }

    if (!this.classId) {
      errors.push('Class ID is required');
    }

    if (!this.name) {
      errors.push('Item name is required');
    }

    if (!this.marketName) {
      errors.push('Market name is required');
    }

    if (!this.price) {
      errors.push('Price is required');
    } else if (this.price < 0.01) {
      errors.push('Price must be at least $0.01');
    }

    if (this.description && this.description.length > 500) {
      errors.push('Description must not exceed 500 characters');
    }

    if (this.float && (this.float < 0 || this.float > 1)) {
      errors.push('Float value must be between 0 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toModel(sellerId) {
    return {
      seller: sellerId,
      item: {
        assetId: this.assetId,
        classId: this.classId,
        instanceId: this.instanceId,
        name: this.name,
        marketName: this.marketName,
        iconUrl: this.iconUrl,
        exterior: this.exterior,
        rarity: this.rarity,
        type: this.type,
        weapon: this.weapon,
        skin: this.skin,
        stattrak: this.stattrak,
        souvenir: this.souvenir,
        float: this.float,
        inspectUrl: this.inspectUrl
      },
      price: this.price,
      status: 'active',
      autoAccept: this.autoAccept,
      description: this.description,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };
  }
}

module.exports = CreateListingDTO;
