describe('User Model', () => {
  test('should create a user with required fields', () => {
    // Arrange
    const User = require('../../../models/User');
    const mockUserData = {
      steamId: '76561198000000000',
      username: 'TestUser',
      wallet: {
        balance: 100,
        pendingBalance: 0
      },
      reputation: {
        positive: 10,
        negative: 0,
        total: 10
      }
    };

    // Act
    const user = new User(mockUserData);

    // Assert
    expect(user.steamId).toBe('76561198000000000');
    expect(user.username).toBe('TestUser');
    expect(user.wallet.balance).toBe(100);
    expect(user.isBanned).toBe(false);
    expect(user.isAdmin).toBe(false);
  });

  test('should have default values for optional fields', () => {
    // Arrange
    const User = require('../../../models/User');

    // Act
    const user = new User({});

    // Assert
    expect(user.wallet).toEqual({
      balance: 0,
      pendingBalance: 0
    });
    expect(user.reputation).toEqual({
      positive: 0,
      negative: 0,
      total: 0
    });
    expect(user.isBanned).toBe(false);
    expect(user.isAdmin).toBe(false);
  });

  test('should validate required steamId', () => {
    // Arrange
    const User = require('../../../models/User');

    // Act & Assert
    expect(() => {
      new User({ username: 'TestUser' });
    }).toThrow();
  });
});
