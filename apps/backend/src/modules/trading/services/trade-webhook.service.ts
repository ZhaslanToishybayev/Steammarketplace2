import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AxiosResponse } from 'axios';
import { WebhookSubscription } from '../entities/webhook-subscription.entity';
import { WebhookLog } from '../entities/webhook-log.entity';
import { Trade, TradeStatus } from '../entities/trade.entity';

export interface WebhookPayload {
  event: string;
  timestamp: Date;
  tradeId: string;
  userId: string;
  data: any;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
  responseTime: number;
}

@Injectable()
export class TradeWebhookService {
  private readonly logger = new Logger(TradeWebhookService.name);
  private readonly webhookTimeout: number;
  private readonly webhookMaxRetries: number;
  private readonly webhookSecret: string;

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly webhookSubscriptionRepository: Repository<WebhookSubscription>,
    @InjectRepository(WebhookLog)
    private readonly webhookLogRepository: Repository<WebhookLog>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectQueue('webhook-delivery') private readonly webhookQueue: Queue,
  ) {
    this.webhookTimeout = this.configService.get<number>('WEBHOOK_TIMEOUT', 5000);
    this.webhookMaxRetries = this.configService.get<number>('WEBHOOK_MAX_RETRIES', 3);
    this.webhookSecret = this.configService.get<string>('WEBHOOK_SECRET', 'default-secret');
  }

  /**
   * Register webhook subscription
   */
  async registerWebhook(
    userId: string,
    url: string,
    events: string[],
    secret?: string
  ): Promise<WebhookSubscription> {
    // Validate URL
    if (!this.isValidWebhookUrl(url)) {
      throw new BadRequestException('Invalid webhook URL format');
    }

    // Validate events
    const validEvents = this.getValidEvents();
    const invalidEvents = events.filter(event => !validEvents.includes(event));
    if (invalidEvents.length > 0) {
      throw new BadRequestException(`Invalid events: ${invalidEvents.join(', ')}`);
    }

    // Check rate limits
    const existingSubscriptions = await this.webhookSubscriptionRepository.count({
      where: { userId, isActive: true }
    });

    const maxWebhooksPerUser = this.configService.get<number>('MAX_WEBHOOKS_PER_USER', 100);
    if (existingSubscriptions >= maxWebhooksPerUser) {
      throw new BadRequestException(`Maximum number of webhook subscriptions (${maxWebhooksPerUser}) exceeded`);
    }

    const subscription = this.webhookSubscriptionRepository.create({
      userId,
      url,
      events,
      secret: secret || null,
      isActive: true,
      totalDeliveries: 0,
      failedDeliveries: 0
    });

    const savedSubscription = await this.webhookSubscriptionRepository.save(subscription);

    this.logger.log(`Registered webhook ${savedSubscription.id} for user ${userId}`);
    return savedSubscription;
  }

  /**
   * Unregister webhook subscription
   */
  async unregisterWebhook(userId: string, webhookId: string): Promise<void> {
    const subscription = await this.webhookSubscriptionRepository.findOne({
      where: { id: webhookId, userId }
    });

    if (!subscription) {
      throw new NotFoundException(`Webhook subscription ${webhookId} not found for user ${userId}`);
    }

    subscription.isActive = false;
    await this.webhookSubscriptionRepository.save(subscription);

    this.logger.log(`Unregistered webhook ${webhookId} for user ${userId}`);
  }

  /**
   * Get user webhook subscriptions
   */
  async getUserWebhooks(userId: string): Promise<WebhookSubscription[]> {
    return this.webhookSubscriptionRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(tradeId: string, event: string, payload: any): Promise<void> {
    // Get active webhook subscriptions for the trade's user
    const trade = await this.getTradeById(tradeId);
    if (!trade) {
      this.logger.warn(`Trade ${tradeId} not found for webhook delivery`);
      return;
    }

    const subscriptions = await this.webhookSubscriptionRepository.createQueryBuilder('subscription')
      .where('subscription.userId = :userId', { userId: trade.userId })
      .andWhere('subscription.isActive = true')
      .andWhere('subscription.events @> :event::jsonb', { event: JSON.stringify([event]) })
      .getMany();

    if (subscriptions.length === 0) {
      this.logger.debug(`No webhook subscriptions found for event ${event} and user ${trade.userId}`);
      return;
    }

    // Create webhook payload
    const webhookPayload: WebhookPayload = {
      event,
      timestamp: new Date(),
      tradeId,
      userId: trade.userId,
      data: payload
    };

    // Add webhook delivery jobs to queue
    for (const subscription of subscriptions) {
      await this.webhookQueue.add('deliver-webhook', {
        subscriptionId: subscription.id,
        tradeId,
        event,
        payload: webhookPayload
      }, {
        removeOnComplete: true,
        removeOnFail: true
      });
    }

    this.logger.log(`Added ${subscriptions.length} webhook delivery jobs for trade ${tradeId}, event ${event}`);
  }

  /**
   * Process webhook delivery
   */
  async deliverWebhook(
    subscriptionId: string,
    tradeId: string,
    event: string,
    payload: WebhookPayload,
    attemptNumber: number = 1
  ): Promise<WebhookDeliveryResult> {
    const subscription = await this.webhookSubscriptionRepository.findOne({
      where: { id: subscriptionId }
    });

    if (!subscription || !subscription.isActive) {
      return {
        success: false,
        errorMessage: 'Webhook subscription is inactive',
        responseTime: 0
      };
    }

    const startTime = Date.now();

    try {
      // Generate signature
      const signature = this.generateSignature(payload, subscription.secret || this.webhookSecret);

      // Make HTTP request
      const response: AxiosResponse = await this.httpService.axiosRef.post(
        subscription.url,
        payload,
        {
          timeout: this.webhookTimeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SteamMarketplace/1.0',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
            'X-Webhook-Timestamp': payload.timestamp.getTime().toString()
          }
        }
      );

      const responseTime = Date.now() - startTime;

      // Log successful delivery
      await this.logWebhookDelivery(subscriptionId, tradeId, event, {
        success: true,
        statusCode: response.status,
        responseTime,
        payload,
        responseBody: response.data,
        attemptNumber
      }, subscription);

      // Update subscription stats
      subscription.lastTriggeredAt = new Date();
      subscription.totalDeliveries += 1;
      await this.webhookSubscriptionRepository.save(subscription);

      this.logger.log(`Webhook delivery successful for subscription ${subscriptionId}: ${response.status}`);
      return {
        success: true,
        statusCode: response.status,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Log failed delivery
      await this.logWebhookDelivery(subscriptionId, tradeId, event, {
        success: false,
        statusCode: error.response?.status,
        errorMessage: error.message,
        responseTime,
        payload,
        attemptNumber
      }, subscription);

      // Update subscription stats
      subscription.failedDeliveries += 1;
      await this.webhookSubscriptionRepository.save(subscription);

      this.logger.error(`Webhook delivery failed for subscription ${subscriptionId}:`, error);
      return {
        success: false,
        statusCode: error.response?.status,
        errorMessage: error.message,
        responseTime
      };
    }
  }

  /**
   * Retry webhook delivery
   */
  async retryWebhookDelivery(
    subscriptionId: string,
    tradeId: string,
    event: string,
    payload: WebhookPayload,
    attemptNumber: number = 1
  ): Promise<WebhookDeliveryResult> {
    if (attemptNumber > this.webhookMaxRetries) {
      this.logger.warn(`Max retries exceeded for webhook ${subscriptionId}`);
      return {
        success: false,
        errorMessage: 'Max retries exceeded',
        responseTime: 0
      };
    }

    // Exponential backoff
    const delay = Math.pow(2, attemptNumber - 1) * 1000; // 1s, 2s, 4s

    await this.webhookQueue.add('retry-webhook', {
      subscriptionId,
      tradeId,
      event,
      payload,
      attemptNumber
    }, {
      delay,
      removeOnComplete: true,
      removeOnFail: true
    });

    this.logger.log(`Scheduled webhook retry ${attemptNumber}/${this.webhookMaxRetries} for subscription ${subscriptionId}`);
    return {
      success: false,
      errorMessage: `Scheduled retry ${attemptNumber}/${this.webhookMaxRetries}`,
      responseTime: 0
    };
  }

  /**
   * Get webhook delivery logs
   */
  async getWebhookLogs(
    subscriptionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WebhookLog[]> {
    return this.webhookLogRepository.find({
      where: { webhookSubscriptionId: subscriptionId },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit
    });
  }

  /**
   * Get webhook subscription stats
   */
  async getWebhookStats(subscriptionId: string): Promise<{
    totalDeliveries: number;
    failedDeliveries: number;
    successRate: number;
    averageResponseTime: number;
  }> {
    const subscription = await this.webhookSubscriptionRepository.findOne({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      throw new NotFoundException(`Webhook subscription ${subscriptionId} not found`);
    }

    const logs = await this.webhookLogRepository.find({
      where: { webhookSubscriptionId: subscriptionId },
      order: { createdAt: 'DESC' },
      take: 100 // Last 100 deliveries
    });

    const totalDeliveries = subscription.totalDeliveries;
    const failedDeliveries = subscription.failedDeliveries;
    const successRate = totalDeliveries > 0 ? ((totalDeliveries - failedDeliveries) / totalDeliveries) * 100 : 0;

    const successfulLogs = logs.filter(log => log.deliveryStatus === 'success');
    const averageResponseTime = successfulLogs.length > 0
      ? successfulLogs.reduce((sum, log) => sum + (log.responseTime || 0), 0) / successfulLogs.length
      : 0;

    return {
      totalDeliveries,
      failedDeliveries,
      successRate,
      averageResponseTime
    };
  }

  /**
   * Validate webhook URL
   */
  private isValidWebhookUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);

      // Must be HTTPS
      if (parsedUrl.protocol !== 'https:') {
        return false;
      }

      // Must not be localhost or private IPs
      const hostname = parsedUrl.hostname;
      if (hostname === 'localhost' ||
          hostname.startsWith('127.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('192.168.') ||
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    const message = JSON.stringify(payload);
    return `sha256=${crypto.createHmac('sha256', secret).update(message).digest('hex')}`;
  }

  /**
   * Log webhook delivery
   */
  private async logWebhookDelivery(
    subscriptionId: string,
    tradeId: string,
    event: string,
    result: {
      success: boolean;
      statusCode?: number;
      errorMessage?: string;
      responseTime: number;
      payload: any;
      responseBody?: any;
      attemptNumber?: number;
    },
    subscription?: any
  ): Promise<void> {
    const log = this.webhookLogRepository.create({
      webhookSubscriptionId: subscriptionId,
      tradeId,
      event,
      url: subscription?.url || '',
      payload: result.payload,
      responseStatus: result.statusCode,
      responseBody: result.responseBody ? JSON.stringify(result.responseBody).substring(0, 1000) : null,
      errorMessage: result.errorMessage,
      deliveryStatus: result.success ? 'success' : 'failed',
      attemptNumber: result.attemptNumber || 1,
      deliveredAt: result.success ? new Date() : null,
      responseTime: result.responseTime
    });

    await this.webhookLogRepository.save(log);
  }

  /**
   * Get valid webhook events
   */
  private getValidEvents(): string[] {
    return [
      'trade.created',
      'trade.sent',
      'trade.confirmation_sent',
      'trade.confirmation_failed',
      'trade.accepted',
      'trade.declined',
      'trade.cancelled',
      'trade.expired',
      'trade.failed',
      'trade.completed'
    ];
  }

  /**
   * Get trade by ID
   */
  private async getTradeById(tradeId: string): Promise<Trade | null> {
    return await this.tradeRepository.findOne({
      where: { id: tradeId }
    });
  }
}