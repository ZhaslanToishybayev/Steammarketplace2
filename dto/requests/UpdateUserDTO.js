/**
 * DTO for updating a user
 */

class UpdateUserDTO {
  constructor(data) {
    this.displayName = data.displayName;
    this.tradeUrl = data.tradeUrl;
    this.settings = data.settings;
  }

  validate() {
    const errors = [];

    if (this.displayName && this.displayName.length < 2) {
      errors.push('Display name must be at least 2 characters');
    }

    if (this.displayName && this.displayName.length > 50) {
      errors.push('Display name must not exceed 50 characters');
    }

    if (this.tradeUrl && !this.tradeUrl.includes('steamcommunity.com/tradeoffer/new/')) {
      errors.push('Invalid trade URL format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toModel() {
    const update = {};

    if (this.displayName !== undefined) {
      update.displayName = this.displayName;
    }

    if (this.tradeUrl !== undefined) {
      update.tradeUrl = this.tradeUrl;
    }

    if (this.settings !== undefined) {
      update.settings = this.settings;
    }

    return update;
  }
}

module.exports = UpdateUserDTO;
