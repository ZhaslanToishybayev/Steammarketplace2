/**
 * DTO for user response
 */

class UserResponseDTO {
  constructor(user) {
    this.id = user._id;
    this.steamId = user.steamId;
    this.steamName = user.steamName;
    this.username = user.username;
    this.displayName = user.displayName;
    this.avatar = user.avatar;
    this.profileUrl = user.profileUrl;
    this.tradeUrl = user.tradeUrl;
    this.wallet = user.wallet;
    this.reputation = user.reputation;
    this.stats = user.stats;
    this.settings = user.settings;
    this.isAdmin = user.isAdmin;
    this.isBanned = user.isBanned;
    this.createdAt = user.createdAt;
  }

  static publicProfile(user) {
    return {
      id: user._id,
      steamId: user.steamId,
      steamName: user.steamName,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      profileUrl: user.profileUrl,
      reputation: user.reputation,
      stats: user.stats,
      createdAt: user.createdAt
    };
  }

  static list(users) {
    return users.map(user => new UserResponseDTO(user));
  }

  toJSON() {
    return {
      id: this.id,
      steamId: this.steamId,
      steamName: this.steamName,
      username: this.username,
      displayName: this.displayName,
      avatar: this.avatar,
      profileUrl: this.profileUrl,
      tradeUrl: this.tradeUrl,
      wallet: this.wallet,
      reputation: this.reputation,
      stats: this.stats,
      settings: this.settings,
      isAdmin: this.isAdmin,
      isBanned: this.isBanned,
      createdAt: this.createdAt
    };
  }
}

module.exports = UserResponseDTO;
