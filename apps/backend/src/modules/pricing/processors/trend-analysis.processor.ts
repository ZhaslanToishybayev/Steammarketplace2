import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed, OnQueueStalled } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { forwardRef } from '@nestjs/common';
import { TrendAnalysisService } from '../services/trend-analysis.service';
import { PriceService } from '../services/price.service';
import { ConfigService } from '@nestjs/config';

export interface AnalyzeItemTrendJob {
  itemId: string;
}

export interface AnalyzeMarketTrendsJob {
  appId: number;
}

export interface DetectAnomaliesJob {
  appId: number;
}

export interface GenerateMarketReportJob {
  appId: number;
}

@Processor('trend-analysis')
export class TrendAnalysisProcessor {
  private readonly logger = new Logger(TrendAnalysisProcessor.name);
  private readonly enableAnomalyDetection: boolean;

  constructor(
    @Inject(forwardRef(() => TrendAnalysisService))
    private readonly trendAnalysisService: TrendAnalysisService,
    @Inject(forwardRef(() => PriceService))
    private readonly priceService: PriceService,
    private readonly configService: ConfigService,
  ) {
    this.enableAnomalyDetection = this.configService.get<boolean>('ENABLE_PRICE_ANOMALY_DETECTION', true);
  }

  /**
   * Analyze price trend for a specific item
   */
  @Process({
    name: 'analyze-item-trend',
    options: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  })
  async analyzeItemTrend(job: Job<AnalyzeItemTrendJob>) {
    const { itemId } = job.data;

    this.logger.debug(`Analyzing price trend for item: ${itemId}`);

    try {
      const analysis = await this.trendAnalysisService.analyzePriceTrend(itemId, 30);

      // Cache the analysis result
      const cacheKey = `item_trend_analysis:${itemId}`;
      const cacheTtl = 60 * 60 * 1000; // 1 hour

      this.logger.log(`Completed trend analysis for item ${itemId}: ${analysis.trend} (volatility: ${analysis.volatility.toFixed(2)})`);
      return {
        success: true,
        itemId,
        analysis,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze trend for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Analyze market trends for an entire app
   */
  @Process({
    name: 'analyze-market-trends',
    options: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  })
  async analyzeMarketTrends(job: Job<AnalyzeMarketTrendsJob>) {
    const { appId } = job.data;

    this.logger.debug(`Analyzing market trends for app: ${appId}`);

    try {
      // Get popular items
      const popularItems = await this.trendAnalysisService.getPopularItems(appId, 20);

      // Get volatile items
      const volatileItems = await this.trendAnalysisService.getVolatileItems(appId, 20);

      // Get market trends
      const marketTrends = await this.priceService.getMarketTrends(appId, 20);

      const result = {
        success: true,
        appId,
        popularItemsCount: popularItems.length,
        volatileItemsCount: volatileItems.length,
        marketTrendsCount: marketTrends.length,
        generatedAt: new Date().toISOString(),
      };

      this.logger.log(`Completed market trend analysis for app ${appId}`, result);
      return result;
    } catch (error) {
      this.logger.error(`Failed to analyze market trends for app ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Detect price anomalies for an app
   */
  @Process({
    name: 'detect-anomalies',
    options: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  })
  async detectAnomalies(job: Job<DetectAnomaliesJob>) {
    const { appId } = job.data;

    if (!this.enableAnomalyDetection) {
      this.logger.debug(`Anomaly detection disabled for app ${appId}`);
      return { success: true, appId, disabled: true };
    }

    this.logger.debug(`Detecting price anomalies for app: ${appId}`);

    try {
      const anomalies = await this.trendAnalysisService.detectPriceAnomalies(appId);

      // Log significant anomalies
      const significantAnomalies = anomalies.filter(a => a.severity === 'high' || a.severity === 'medium');

      if (significantAnomalies.length > 0) {
        this.logger.warn(`Detected ${significantAnomalies.length} significant price anomalies for app ${appId}:`, {
          anomalies: significantAnomalies.map(a => ({
            itemId: a.itemId,
            marketHashName: a.marketHashName,
            severity: a.severity,
            deviation: a.deviation.toFixed(2),
            deviationPercent: a.deviationPercent.toFixed(2),
          })),
        });
      }

      // Could trigger admin notifications for high-severity anomalies
      const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');
      if (highSeverityAnomalies.length > 0) {
        await this.handleHighSeverityAnomalies(appId, highSeverityAnomalies);
      }

      this.logger.log(`Anomaly detection completed for app ${appId}: ${anomalies.length} anomalies detected`);
      return {
        success: true,
        appId,
        totalAnomalies: anomalies.length,
        highSeverity: highSeverityAnomalies.length,
        mediumSeverity: anomalies.filter(a => a.severity === 'medium').length,
        lowSeverity: anomalies.filter(a => a.severity === 'low').length,
      };
    } catch (error) {
      this.logger.error(`Failed to detect anomalies for app ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Generate comprehensive market report for an app
   */
  @Process({
    name: 'generate-market-report',
    options: {
      attempts: 1, // Market reports are expensive, don't retry
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 20,
      removeOnFail: 50,
    },
  })
  async generateMarketReport(job: Job<GenerateMarketReportJob>) {
    const { appId } = job.data;

    this.logger.debug(`Generating market report for app: ${appId}`);

    try {
      const report = await this.trendAnalysisService.generateMarketReport(appId);

      this.logger.log(`Generated market report for app ${appId}:`, {
        totalItems: report.totalItems,
        averagePrice: report.averagePrice.toFixed(2),
        medianPrice: report.medianPrice.toFixed(2),
        totalVolume: report.totalVolume,
        topGainersCount: report.topGainers.length,
        topLosersCount: report.topLosers.length,
        volatileItemsCount: report.volatileItems.length,
        popularItemsCount: report.popularItems.length,
      });

      return {
        success: true,
        appId,
        report: {
          ...report,
          // Don't include full item lists in job result to avoid large payloads
          topGainers: report.topGainers.slice(0, 5), // Top 5 only
          topLosers: report.topLosers.slice(0, 5),   // Top 5 only
          volatileItems: report.volatileItems.slice(0, 5), // Top 5 only
          popularItems: report.popularItems.slice(0, 5),   // Top 5 only
        },
      };
    } catch (error) {
      this.logger.error(`Failed to generate market report for app ${appId}:`, error);
      throw error;
    }
  }

  /**
   * Handle high-severity price anomalies
   */
  private async handleHighSeverityAnomalies(appId: number, anomalies: any[]): Promise<void> {
    try {
      // Log detailed information about high-severity anomalies
      this.logger.error(`High-severity price anomalies detected for app ${appId}:`, {
        count: anomalies.length,
        anomalies: anomalies.map(a => ({
          itemId: a.itemId,
          marketHashName: a.marketHashName,
          name: a.name,
          currentPrice: a.currentPrice,
          expectedPrice: a.expectedPrice,
          deviation: a.deviation,
          deviationPercent: a.deviationPercent,
        })),
      });

      // In a real implementation, you might:
      // 1. Send notifications to admins
      // 2. Flag items for manual review
      // 3. Trigger additional data validation
      // 4. Log to monitoring systems

      // For now, just log the anomalies
      for (const anomaly of anomalies) {
        this.logger.error(`🚨 HIGH SEVERITY ANOMALY: ${anomaly.marketHashName} (${anomaly.itemId}) - Current: $${anomaly.currentPrice}, Expected: $${anomaly.expectedPrice}, Deviation: ${anomaly.deviation.toFixed(2)}σ (${anomaly.deviationPercent.toFixed(2)}%)`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle high-severity anomalies:`, error);
    }
  }

  /**
   * Lifecycle hooks for monitoring
   */
  @OnQueueActive()
  onActive(job: Job<any>) {
    this.logger.debug(`Trend analysis job ${job.id} (${job.name}) is now active`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<any>, result: any) {
    this.logger.debug(`Trend analysis job ${job.id} (${job.name}) completed:`, result);
  }

  @OnQueueStalled()
  onStalled(jobId: number) {
    this.logger.warn(`Trend analysis job ${jobId} has stalled`);
  }

  @OnQueueFailed()
  onFailed(job: Job<any>, error: Error) {
    this.logger.error(`Trend analysis job ${job.id} (${job.name}) failed:`, error);

    // Log specific job failures for monitoring
    const jobData = job.data;
    if (job.name === 'analyze-item-trend' && jobData.itemId) {
      this.logger.error(`Item trend analysis failed for ${jobData.itemId}: ${error.message}`);
    } else if (job.name === 'detect-anomalies' && jobData.appId) {
      this.logger.error(`Anomaly detection failed for app ${jobData.appId}: ${error.message}`);
    } else if (job.name === 'generate-market-report' && jobData.appId) {
      this.logger.error(`Market report generation failed for app ${jobData.appId}: ${error.message}`);
    }
  }
}