import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { Bot } from '../entities/bot.entity';
import { BotStatus } from '../entities/bot.entity';
import { CreateBotDto } from '../dto/create-bot.dto';
import { UpdateBotDto } from '../dto/update-bot.dto';

/**
 * Helper function to validate and derive encryption key
 * @param rawKey The raw encryption key from environment
 * @returns Validated and derived 32-byte encryption key
 * @throws BadRequestException if key validation fails
 */
function validateAndDeriveEncryptionKey(rawKey: string): string {
  if (!rawKey) {
    throw new InternalServerErrorException(
      'BOT_ENCRYPTION_KEY environment variable is required. ' +
      'Please set it to a cryptographically strong 32+ character string. ' +
      'Use: openssl rand -hex 32 (or similar) to generate a secure key.'
    );
  }

  // Validate key length - must be at least 32 characters for AES-256
  if (rawKey.length < 32) {
    throw new InternalServerErrorException(
      `BOT_ENCRYPTION_KEY must be at least 32 characters long, got ${rawKey.length}. ` +
      'Use: openssl rand -hex 32 (or similar) to generate a secure 64-character key.'
    );
  }

  // Check for weak keys (common patterns)
  const weakPatterns = [
    /^(.)\1{30,}$/, // Repeated characters
    /^(01234567|abcdef|12345678)/, // Sequential patterns
    /^your-.*-key$/, // Template patterns
    /^(test|dev|demo|example)/, // Test patterns
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(rawKey.toLowerCase())) {
      throw new InternalServerErrorException(
        'BOT_ENCRYPTION_KEY appears to use a weak or default pattern. ' +
        'Please generate a cryptographically strong random key using: openssl rand -hex 32'
      );
    }
  }

  // Derive a 32-byte key using scrypt for additional security
  try {
    const derivedKey = crypto.scryptSync(rawKey, 'steam-marketplace-salt', 32);
    return derivedKey.toString('hex');
  } catch (error) {
    throw new InternalServerErrorException(
      `Failed to derive encryption key from BOT_ENCRYPTION_KEY: ${error.message}`
    );
  }
}

@Injectable()
export class BotManagerService {
  private readonly logger = new Logger(BotManagerService.name);
  private readonly encryptionKey: string;
  private readonly encryptionAlgorithm = 'aes-256-gcm';
  private readonly cacheTTL = 10; // TTL in seconds for cache operations

  constructor(
    @InjectRepository(Bot)
    private readonly botRepository: Repository<Bot>,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    const rawEncryptionKey = this.configService.get<string>('BOT_ENCRYPTION_KEY');
    this.encryptionKey = validateAndDeriveEncryptionKey(rawEncryptionKey);
    this.logger.log('BotManagerService initialized with validated encryption key');
  }

  /**
   * Create new bot
   */
  async createBot(createBotDto: CreateBotDto): Promise<Bot> {
    const { accountName, password, sharedSecret, identitySecret, steamGuardCode, apiKey, maxConcurrentTrades } = createBotDto;

    // Check if bot with account name already exists
    const existingBot = await this.botRepository.findOne({ where: { accountName } });
    if (existingBot) {
      throw new ConflictException(`Bot with account name ${accountName} already exists`);
    }

    // Validate credentials
    this.validateBotCredentials(accountName, password, sharedSecret, identitySecret);

    // Encrypt sensitive data
    const encryptedPassword = this.encryptPassword(password);
    const encryptedSharedSecret = this.encryptSecret(sharedSecret);
    const encryptedIdentitySecret = this.encryptSecret(identitySecret);

    const bot = this.botRepository.create({
      accountName,
      password: encryptedPassword,
      sharedSecret: encryptedSharedSecret,
      identitySecret: encryptedIdentitySecret,
      steamGuardCode,
      apiKey,
      maxConcurrentTrades: maxConcurrentTrades || 5,
      status: BotStatus.IDLE
    });

    const savedBot = await this.botRepository.save(bot);

    // Clear cache
    await this.clearBotCache();

    this.logger.log(`Created bot ${savedBot.accountName} with ID ${savedBot.id}`);
    return savedBot;
  }

  /**
   * Get all bots
   */
  async getAllBots(filters?: {
    isActive?: boolean;
    isOnline?: boolean;
    status?: BotStatus;
  }): Promise<Bot[]> {
    const cacheKey = `bots:${JSON.stringify(filters || {})}`;
    const cached = await this.cacheManager.get<Bot[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const query = this.botRepository.createQueryBuilder('bot');

    if (filters) {
      if (filters.isActive !== undefined) {
        query.andWhere('bot.isActive = :isActive', { isActive: filters.isActive });
      }
      if (filters.isOnline !== undefined) {
        query.andWhere('bot.isOnline = :isOnline', { isOnline: filters.isOnline });
      }
      if (filters.status) {
        query.andWhere('bot.status = :status', { status: filters.status });
      }
    }

    query.orderBy('bot.currentTradeCount', 'ASC');
    const bots = await query.getMany();

    // Exclude sensitive data from responses
    const sanitizedBots = bots.map(bot => this.sanitizeBot(bot));

    await this.cacheManager.set(cacheKey, sanitizedBots, this.cacheTTL);
    return sanitizedBots;
  }

  /**
   * Get bot by ID
   */
  async getBotById(id: string): Promise<Bot> {
    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }
    return this.sanitizeBot(bot);
  }

  /**
   * Get active bots
   */
  async getActiveBots(): Promise<Bot[]> {
    return this.getAllBots({ isActive: true });
  }

  /**
   * Get online bots
   */
  async getOnlineBots(): Promise<Bot[]> {
    return this.getAllBots({ isOnline: true });
  }

  /**
   * Get available bot for trading
   */
  async getAvailableBot(): Promise<Bot> {
    const cacheKey = 'available_bot';
    const cached = await this.cacheManager.get<Bot>(cacheKey);

    if (cached) {
      return cached;
    }

    const availableBot = await this.botRepository
      .createQueryBuilder('bot')
      .where('bot.isActive = true')
      .andWhere('bot.isOnline = true')
      .andWhere('bot.isBusy = false')
      .andWhere('bot.currentTradeCount < bot.maxConcurrentTrades')
      .orderBy('bot.currentTradeCount', 'ASC')
      .addOrderBy('bot.totalTradesCompleted', 'DESC')
      .getOne();

    if (!availableBot) {
      throw new Error('No available bots for trading');
    }

    const sanitizedBot = this.sanitizeBot(availableBot);
    // Use cacheTTL in seconds (consistent with CacheInterceptor)
    await this.cacheManager.set(cacheKey, sanitizedBot, this.cacheTTL);

    return sanitizedBot;
  }

  /**
   * Update bot
   */
  async updateBot(id: string, updateBotDto: UpdateBotDto): Promise<Bot> {
    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    // Handle password update with encryption
    if (updateBotDto.password) {
      updateBotDto.password = this.encryptPassword(updateBotDto.password);
    }

    // Handle sharedSecret update with encryption
    if (updateBotDto.sharedSecret) {
      updateBotDto.sharedSecret = this.encryptSecret(updateBotDto.sharedSecret);
    }

    // Handle identitySecret update with encryption
    if (updateBotDto.identitySecret) {
      updateBotDto.identitySecret = this.encryptSecret(updateBotDto.identitySecret);
    }

    // Handle credential updates - decrypt existing secrets if not being updated
    if (updateBotDto.sharedSecret || updateBotDto.identitySecret) {
      const currentSharedSecret = updateBotDto.sharedSecret ? this.decryptSecret(updateBotDto.sharedSecret) : this.decryptSecret(bot.sharedSecret);
      const currentIdentitySecret = updateBotDto.identitySecret ? this.decryptSecret(updateBotDto.identitySecret) : this.decryptSecret(bot.identitySecret);
      const currentPassword = updateBotDto.password ? this.decryptPassword(updateBotDto.password) : this.decryptPassword(bot.password);

      this.validateBotCredentials(
        updateBotDto.accountName || bot.accountName,
        currentPassword,
        currentSharedSecret,
        currentIdentitySecret
      );
    }

    Object.assign(bot, updateBotDto);

    const updatedBot = await this.botRepository.save(bot);

    // Clear cache
    await this.clearBotCache();

    this.logger.log(`Updated bot ${updatedBot.accountName}`);
    return this.sanitizeBot(updatedBot);
  }

  /**
   * Delete bot
   */
  async deleteBot(id: string): Promise<void> {
    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    await this.botRepository.remove(bot);

    // Clear cache
    await this.clearBotCache();

    this.logger.log(`Deleted bot ${bot.accountName}`);
  }

  /**
   * Activate bot
   */
  async activateBot(id: string): Promise<Bot> {
    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    bot.isActive = true;
    bot.status = BotStatus.IDLE;

    const updatedBot = await this.botRepository.save(bot);

    // Clear cache
    await this.clearBotCache();

    this.logger.log(`Activated bot ${updatedBot.accountName}`);
    return this.sanitizeBot(updatedBot);
  }

  /**
   * Deactivate bot
   */
  async deactivateBot(id: string): Promise<Bot> {
    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    bot.isActive = false;
    bot.isBusy = false;
    bot.status = BotStatus.OFFLINE;

    const updatedBot = await this.botRepository.save(bot);

    // Clear cache
    await this.clearBotCache();

    this.logger.log(`Deactivated bot ${updatedBot.accountName}`);
    return this.sanitizeBot(updatedBot);
  }

  /**
   * Reserve bot for trading
   */
  async reserveBot(id: string): Promise<Bot> {
    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    if (!bot.isActive) {
      throw new BadRequestException(`Bot ${bot.accountName} is not active`);
    }

    if (!bot.isOnline) {
      throw new BadRequestException(`Bot ${bot.accountName} is not online`);
    }

    if (bot.isBusy) {
      throw new BadRequestException(`Bot ${bot.accountName} is already busy`);
    }

    if (bot.currentTradeCount >= bot.maxConcurrentTrades) {
      throw new BadRequestException(`Bot ${bot.accountName} has reached maximum concurrent trades`);
    }

    bot.isBusy = true;
    bot.currentTradeCount += 1;
    bot.status = BotStatus.TRADING;

    const updatedBot = await this.botRepository.save(bot);

    // Clear cache
    await this.clearBotCache();

    this.logger.log(`Reserved bot ${updatedBot.accountName} for trading`);
    return this.sanitizeBot(updatedBot);
  }

  /**
   * Release bot from trading
   */
  async releaseBot(id: string): Promise<Bot> {
    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    bot.isBusy = false;
    bot.currentTradeCount = Math.max(0, bot.currentTradeCount - 1);
    bot.status = bot.currentTradeCount > 0 ? BotStatus.TRADING : BotStatus.IDLE;

    const updatedBot = await this.botRepository.save(bot);

    // Clear cache
    await this.clearBotCache();

    this.logger.log(`Released bot ${updatedBot.accountName} from trading`);
    return this.sanitizeBot(updatedBot);
  }

  /**
   * Mark bot as online
   */
  async markBotOnline(id: string): Promise<Bot> {
    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    bot.isOnline = true;
    bot.lastLoginAt = new Date();
    bot.status = bot.isBusy ? BotStatus.TRADING : BotStatus.IDLE;

    const updatedBot = await this.botRepository.save(bot);

    // Clear cache
    await this.clearBotCache();

    this.logger.log(`Marked bot ${updatedBot.accountName} as online`);
    return this.sanitizeBot(updatedBot);
  }

  /**
   * Mark bot as offline
   */
  async markBotOffline(id: string): Promise<Bot> {
    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    bot.isOnline = false;
    bot.isBusy = false;
    bot.currentTradeCount = 0;
    bot.status = BotStatus.OFFLINE;

    const updatedBot = await this.botRepository.save(bot);

    // Clear cache
    await this.clearBotCache();

    this.logger.log(`Marked bot ${updatedBot.accountName} as offline`);
    return this.sanitizeBot(updatedBot);
  }

  /**
   * Update bot status
   */
  async updateBotStatus(id: string, status: BotStatus, message?: string): Promise<Bot> {
    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    bot.status = status;
    bot.statusMessage = message;
    bot.updatedAt = new Date();

    const updatedBot = await this.botRepository.save(bot);

    this.logger.log(`Updated bot ${updatedBot.accountName} status to ${status}`);
    return this.sanitizeBot(updatedBot);
  }

  /**
   * Increment completed trades counter
   */
  async incrementCompletedTrades(id: string): Promise<void> {
    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    bot.totalTradesCompleted += 1;
    bot.lastTradeAt = new Date();

    await this.botRepository.save(bot);

    this.logger.log(`Incremented completed trades for bot ${bot.accountName}`);
  }

  /**
   * Get bot statistics
   */
  async getBotStatistics(id: string): Promise<{
    totalTradesCompleted: number;
    currentTradeCount: number;
    maxConcurrentTrades: number;
    uptime: number;
    successRate: number;
  }> {
    const bot = await this.botRepository.findOne({ where: { id } });
    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    // Calculate uptime (time since last login)
    const uptime = bot.lastLoginAt
      ? Date.now() - bot.lastLoginAt.getTime()
      : 0;

    return {
      totalTradesCompleted: bot.totalTradesCompleted,
      currentTradeCount: bot.currentTradeCount,
      maxConcurrentTrades: bot.maxConcurrentTrades,
      uptime,
      successRate: 100 // Would need to calculate from trade history
    };
  }

  /**
   * Validate bot credentials
   */
  private validateBotCredentials(
    accountName: string,
    password: string,
    sharedSecret: string,
    identitySecret: string
  ): void {
    if (!accountName || accountName.trim().length < 3) {
      throw new BadRequestException('Account name must be at least 3 characters long');
    }

    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    if (!sharedSecret || sharedSecret.length !== 28) {
      throw new BadRequestException('Shared secret must be 28 characters long');
    }

    if (!identitySecret || identitySecret.length !== 28) {
      throw new BadRequestException('Identity secret must be 28 characters long');
    }

    // Validate base64 format
    try {
      Buffer.from(sharedSecret, 'base64');
      Buffer.from(identitySecret, 'base64');
    } catch (error) {
      throw new BadRequestException('Shared secret and identity secret must be valid base64 strings');
    }
  }

  /**
   * Encrypt password
   */
  private encryptPassword(password: string): string {
    const iv = crypto.randomBytes(12); // 12 bytes for GCM
    const key = Buffer.from(this.encryptionKey, 'hex'); // Use derived key directly
    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, key, iv);

    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }

  /**
   * Decrypt password
   */
  private decryptPassword(encryptedPassword: string): string {
    const [ivHex, encrypted, authTagHex] = encryptedPassword.split(':');
    if (!ivHex || !encrypted || !authTagHex) {
      throw new Error('Invalid encrypted password format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(this.encryptionKey, 'hex'); // Use derived key directly
    const decipher = crypto.createDecipheriv(this.encryptionAlgorithm, key, iv);
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt secret (sharedSecret or identitySecret)
   */
  private encryptSecret(secret: string): string {
    const iv = crypto.randomBytes(12); // 12 bytes for GCM
    const key = Buffer.from(this.encryptionKey, 'hex'); // Use derived key directly
    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }

  /**
   * Decrypt secret (sharedSecret or identitySecret)
   */
  private decryptSecret(encryptedSecret: string): string {
    const [ivHex, encrypted, authTagHex] = encryptedSecret.split(':');
    if (!ivHex || !encrypted || !authTagHex) {
      throw new Error('Invalid encrypted secret format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(this.encryptionKey, 'hex'); // Use derived key directly
    const decipher = crypto.createDecipheriv(this.encryptionAlgorithm, key, iv);
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Sanitize bot data for API responses
   */
  private sanitizeBot(bot: Bot): Bot {
    const sanitized = { ...bot };
    delete sanitized.password;
    delete sanitized.sharedSecret;
    delete sanitized.identitySecret;
    delete sanitized.steamGuardCode;
    delete sanitized.apiKey;
    return sanitized;
  }

  /**
   * Clear bot cache
   */
  private async clearBotCache(): Promise<void> {
    const keys = await this.cacheManager.store.keys();
    for (const key of keys) {
      if (key.toString().startsWith('bots:') || key.toString().includes('available_bot')) {
        await this.cacheManager.del(key.toString());
      }
    }
  }
}