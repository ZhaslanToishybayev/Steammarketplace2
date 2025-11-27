import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import { TradeWebhookService } from '../services/trade-webhook.service';
import { WebhookPayload } from '../services/trade-webhook.service';

export interface DeliverWebhookJob {
  subscriptionId: string;
  tradeId: string;
  event: string;
  payload: WebhookPayload;
  attemptNumber?: number;
}

export interface RetryWebhookJob {
  subscriptionId: string;
  tradeId: string;
  event: string;
  payload: WebhookPayload;
  attemptNumber: number;
}

@Processor('webhook-delivery')
export class WebhookDeliveryProcessor {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(
    @Inject(forwardRef(() => TradeWebhookService))
    private readonly tradeWebhookService: TradeWebhookService,
  ) {}

  /**
   * Process webhook delivery
   */
  @Process('deliver-webhook')
  async deliverWebhook(job: Job<DeliverWebhookJob>) {
    const { subscriptionId, tradeId, event, payload, attemptNumber = 1 } = job.data;

    this.logger.debug(`Processing webhook delivery ${attemptNumber} for subscription ${subscriptionId}, trade ${tradeId}, event ${event}`);

    try {
      const result = await this.tradeWebhookService.deliverWebhook(
        subscriptionId,
        tradeId,
        event,
        payload
      );

      if (result.success) {
        this.logger.log(`Webhook delivery successful for subscription ${subscriptionId}: ${result.statusCode}`);
      } else {
        this.logger.warn(`Webhook delivery failed for subscription ${subscriptionId}: ${result.errorMessage}`);
        // Note: The service handles retry scheduling internally
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to process webhook delivery for subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Process webhook retry
   */
  @Process('retry-webhook')
  async retryWebhook(job: Job<RetryWebhookJob>) {
    const { subscriptionId, tradeId, event, payload, attemptNumber } = job.data;

    this.logger.debug(`Processing webhook retry ${attemptNumber} for subscription ${subscriptionId}, trade ${tradeId}, event ${event}`);

    try {
      const result = await this.tradeWebhookService.deliverWebhook(
        subscriptionId,
        tradeId,
        event,
        payload
      );

      if (result.success) {
        this.logger.log(`Webhook retry ${attemptNumber} successful for subscription ${subscriptionId}: ${result.statusCode}`);
        return result;
      } else {
        this.logger.warn(`Webhook retry ${attemptNumber} failed for subscription ${subscriptionId}: ${result.errorMessage}`);

        // Check if we should schedule another retry
        if (attemptNumber < 3) { // Use same max retries logic as service
          const nextAttempt = attemptNumber + 1;
          const delay = Math.pow(2, nextAttempt - 1) * 1000; // Exponential backoff

          await job.queue.add('retry-webhook', {
            subscriptionId,
            tradeId,
            event,
            payload,
            attemptNumber: nextAttempt
          }, {
            delay,
            removeOnComplete: true,
            removeOnFail: true
          });

          this.logger.log(`Scheduled webhook retry ${nextAttempt}/3 for subscription ${subscriptionId}`);
        } else {
          this.logger.warn(`Max webhook retry attempts (3) exceeded for subscription ${subscriptionId}`);
        }

        return result;
      }
    } catch (error) {
      this.logger.error(`Failed to process webhook retry ${attemptNumber} for subscription ${subscriptionId}:`, error);
      throw error;
    }
  }
}