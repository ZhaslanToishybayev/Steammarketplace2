const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  familyId: {
    type: String,
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index для авто-удаления
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  },
  revokedAt: {
    type: Date,
    default: null
  },
  replacedByToken: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Индекс для быстрого поиска по userId
refreshTokenSchema.index({ userId: 1, token: 1 });

// Индекс для семей токенов
refreshTokenSchema.index({ familyId: 1 });

// Метод для проверки валидности токена
refreshTokenSchema.methods.isValid = function() {
  return !this.revokedAt && this.expiresAt > new Date();
};

// Метод для отзыва токена
refreshTokenSchema.methods.revoke = function(replacedByToken = null) {
  this.revokedAt = new Date();
  this.replacedByToken = replacedByToken;
  return this.save();
};

// Статический метод для создания нового refresh токена
refreshTokenSchema.statics.createToken = async function(userId, familyId, userAgent = null, ipAddress = null) {
  // Генерируем случайный токен
  const token = require('crypto').randomBytes(64).toString('hex');

  // Время жизни refresh токена - 7 дней
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Хешируем токен для безопасного хранения
  const hashedToken = await bcrypt.hash(token, 10);

  const refreshToken = new this({
    userId,
    token: hashedToken,
    familyId,
    expiresAt,
    userAgent,
    ipAddress
  });

  await refreshToken.save();

  return {
    token,
    refreshToken
  };
};

// Статический метод для верификации refresh токена
refreshTokenSchema.statics.verifyToken = async function(token, userId) {
  const tokens = await this.find({ userId, revokedAt: null });

  for (const refreshToken of tokens) {
    const isValid = await bcrypt.compare(token, refreshToken.token);
    if (isValid && refreshToken.expiresAt > new Date()) {
      // Обновляем время последнего использования
      refreshToken.lastUsedAt = new Date();
      await refreshToken.save();

      return refreshToken;
    }
  }

  return null;
};

// Статический метод для отзыва всех токенов пользователя
refreshTokenSchema.statics.revokeAllUserTokens = async function(userId) {
  await this.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
};

// Статический метод для отзыва семейства токенов (при logout со всех устройств)
refreshTokenSchema.statics.revokeTokenFamily = async function(familyId) {
  await this.updateMany(
    { familyId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
};

// Статический метод для очистки просроченных токенов
refreshTokenSchema.statics.cleanupExpired = async function() {
  await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
