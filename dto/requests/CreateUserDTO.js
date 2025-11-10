/**
 * DTO for creating a user
 */

class CreateUserDTO {
  constructor(data) {
    this.steamId = data.steamId;
    this.steamName = data.steamName;
    this.username = data.username;
    this.displayName = data.displayName;
    this.avatar = data.avatar;
    this.profileUrl = data.profileUrl;
    this.steamAccessToken = data.steamAccessToken;
    this.steamRefreshToken = data.steamRefreshToken;
    this.tradeUrl = data.tradeUrl;
  }

  validate() {
    const errors = [];

    if (!this.steamId) {
      errors.push('Steam ID is required');
    }

    if (!this.steamName) {
      errors.push('Steam name is required');
    }

    if (!this.username) {
      errors.push('Username is required');
    }

    if (!this.displayName) {
      errors.push('Display name is required');
    }

    if (!this.avatar) {
      errors.push('Avatar is required');
    }

    if (!this.profileUrl) {
      errors.push('Profile URL is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toModel() {
    return {
      steamId: this.steamId,
      steamName: this.steamName,
      username: this.username,
      displayName: this.displayName,
      avatar: this.avatar,
      profileUrl: this.profileUrl,
      steamAccessToken: this.steamAccessToken,
      steamRefreshToken: this.steamRefreshToken,
      tradeUrl: this.tradeUrl,
      wallet: {
        balance: 0,
        pendingBalance: 0
      },
      reputation: {
        positive: 0,
        negative: 0,
        total: 0
      },
      isAdmin: false,
      isBanned: false
    };
  }
}

module.exports = CreateUserDTO;
