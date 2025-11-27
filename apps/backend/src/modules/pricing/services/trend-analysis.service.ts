import { Injectable, Logger, InjectRepository } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { ItemPrice } from './entities/item-price.entity';
import { PriceService } from './services/price.service';

export interface PriceTrendAnalysis {
  trend: 'rising' | 'falling' | 'stable';
  volatility: number;
  averagePrice: number;
  prediction7d: number;
  confidence: number;
}

export interface VolatileItem {
  itemId: string;
  marketHashName: string;
  name: string;
  iconUrl?: string;
  volatility: number;
  priceRange: {
    min: number;
    max: number;
    current: number;
  };
  averagePrice: number;
}

export interface PopularItem {
  itemId: string;
  marketHashName: string;
  name: string;
  iconUrl?: string;
  volume: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  currentPrice: number;
}

export interface PriceAnomaly {
  itemId: string;
  marketHashName: string;
  name: string;
  iconUrl?: string;
  currentPrice: number;
  expectedPrice: number;
  deviation: number;
  deviationPercent: number;
  severity: 'low' | 'medium' | 'high';
  detectedAt: Date;
}

export interface MarketReport {
  appId: number;
  totalItems: number;
  averagePrice: number;
  medianPrice: number;
  totalVolume: number;
  priceDistribution: {
    ranges: string[];
    counts: number[];
  };
  topGainers: PopularItem[];
  topLosers: PopularItem[];
  volatileItems: VolatileItem[];
  popularItems: PopularItem[];
  generatedAt: Date;
}

@Injectable()
export class TrendAnalysisService {
  private readonly logger = new Logger(TrendAnalysisService.name);
  private readonly anomalyThreshold: number;

  constructor(
    @InjectRepository(ItemPrice)
    private readonly itemPriceRepository: Repository<ItemPrice>,
    private readonly priceService: PriceService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.anomalyThreshold = parseFloat(process.env.PRICE_ANOMALY_THRESHOLD || '2.0');
  }

  /**
   * Analyze price trend for a specific item
   */
  async analyzePriceTrend(itemId: string, days: number = 30): Promise<PriceTrendAnalysis> {
    try {
      const cacheKey = `trend_analysis:${itemId}:${days}`;
      const cachedAnalysis = await this.cacheManager.get<PriceTrendAnalysis>(cacheKey);

      if (cachedAnalysis) {
        this.logger.debug(`Returning cached trend analysis for ${itemId}`);
        return cachedAnalysis;
      }

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Get price history
      const priceHistory = await this.priceService.getPriceHistory(itemId, startDate, endDate, 'day');

      if (priceHistory.length < 2) {
        return {
          trend: 'stable',
          volatility: 0,
          averagePrice: 0,
          prediction7d: 0,
          confidence: 0,
        };
      }

      // Calculate statistics
      const prices = priceHistory.map(point => point.price);
      const averagePrice = this.calculateMean(prices);
      const volatility = this.calculateStandardDeviation(prices);
      const trendDirection = this.calculateTrendDirection(priceHistory);

      // Simple linear regression for prediction
      const { slope, intercept } = this.calculateLinearRegression(priceHistory);
      const prediction7d = this.predictPrice(slope, intercept, priceHistory.length + 7);

      // Calculate confidence based on R-squared
      const confidence = this.calculateRSquared(priceHistory, slope, intercept);

      const analysis: PriceTrendAnalysis = {
        trend: this.getTrendDirection(trendDirection),
        volatility,
        averagePrice,
        prediction7d: Math.max(prediction7d, 0), // Ensure non-negative
        confidence,
      };

      // Cache the result for 1 hour
      await this.cacheManager.set(cacheKey, analysis, 60 * 60);

      return analysis;
    } catch (error) {
      this.logger.error(`Failed to analyze price trend for ${itemId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get volatile items for an app
   */
  async getVolatileItems(appId: number, limit: number = 20): Promise<VolatileItem[]> {
    try {
      const cacheKey = `volatile_items:${appId}:${limit}`;
      const cachedVolatileItems = await this.cacheManager.get<VolatileItem[]>(cacheKey);

      if (cachedVolatileItems) {
        this.logger.debug(`Returning cached volatile items for app ${appId}`);
        return cachedVolatileItems;
      }

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days

      // Get items with significant price history
      const volatileItems = await this.itemPriceRepository
        .createQueryBuilder('ip')
        .select('ip.itemId, ip.marketHashName, COUNT(ip.id) as pricePoints')
        .addSelect('MIN(ip.price) as minPrice, MAX(ip.price) as maxPrice, AVG(ip.price) as avgPrice')
        .addSelect('MAX(ip.priceDate) as lastUpdate')
        .where('ip.appId = :appId', { appId })
        .andWhere('ip.priceDate >= :startDate', { startDate })
        .groupBy('ip.itemId, ip.marketHashName')
        .having('COUNT(ip.id) >= 5') // At least 5 price points
        .orderBy('MAX(ip.price) - MIN(ip.price)', 'DESC')
        .limit(limit * 2) // Get more items to filter
        .getRawMany();

      const results: VolatileItem[] = [];

      for (const item of volatileItems) {
        const priceHistory = await this.priceService.getPriceHistory(item.ip_item_id, startDate, endDate, 'day');

        if (priceHistory.length >= 5) {
          const prices = priceHistory.map(point => point.price);
          const volatility = this.calculateStandardDeviation(prices);
          const currentPrice = prices[prices.length - 1];

          // Get item info
          const itemInfo = await this.getPriceServiceItemInfo(item.ip_item_id);

          results.push({
            itemId: item.ip_item_id,
            marketHashName: item.ip_market_hash_name,
            name: itemInfo?.name || item.ip_market_hash_name,
            iconUrl: itemInfo?.iconUrl,
            volatility,
            priceRange: {
              min: item.minprice,
              max: item.maxprice,
              current: currentPrice,
            },
            averagePrice: item.avgprice,
          });
        }

        if (results.length >= limit) break;
      }

      // Sort by volatility and limit results
      const sortedResults = results
        .sort((a, b) => b.volatility - a.volatility)
        .slice(0, limit);

      // Cache the result for 1 hour
      await this.cacheManager.set(cacheKey, sortedResults, 60 * 60);

      return sortedResults;
    } catch (error) {
      this.logger.error(`Failed to get volatile items for app ${appId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get popular items by trading volume
   */
  async getPopularItems(appId: number, limit: number = 20): Promise<PopularItem[]> {
    try {
      const cacheKey = `popular_items:${appId}:${limit}`;
      const cachedPopularItems = await this.cacheManager.get<PopularItem[]>(cacheKey);

      if (cachedPopularItems) {
        this.logger.debug(`Returning cached popular items for app ${appId}`);
        return cachedPopularItems;
      }

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get items with highest volume in the last 24h
      const popularItems = await this.itemPriceRepository
        .createQueryBuilder('ip')
        .select('ip.itemId, ip.marketHashName, SUM(ip.volume) as totalVolume')
        .addSelect('MAX(ip.price) as currentPrice, MAX(ip.priceDate) as lastUpdate')
        .where('ip.appId = :appId', { appId })
        .andWhere('ip.priceDate >= :oneDayAgo', { oneDayAgo })
        .groupBy('ip.itemId, ip.marketHashName')
        .orderBy('totalVolume', 'DESC')
        .limit(limit * 2)
        .getRawMany();

      const results: PopularItem[] = [];

      for (const item of popularItems) {
        // Calculate price change for the last 24h
        const price24hAgo = await this.itemPriceRepository
          .createQueryBuilder('ip')
          .select('ip.price')
          .where('ip.itemId = :itemId', { itemId: item.ip_item_id })
          .andWhere('ip.priceDate < :oneDayAgo', { oneDayAgo })
          .orderBy('ip.priceDate', 'DESC')
          .getOne();

        const priceChange24h = price24hAgo ? item.currentprice - parseFloat(price24hAgo.price) : 0;
        const priceChangePercent24h = price24hAgo ? (priceChange24h / parseFloat(price24hAgo.price)) * 100 : 0;

        // Get item info
        const itemInfo = await this.getPriceServiceItemInfo(item.ip_item_id);

        results.push({
          itemId: item.ip_item_id,
          marketHashName: item.ip_market_hash_name,
          name: itemInfo?.name || item.ip_market_hash_name,
          iconUrl: itemInfo?.iconUrl,
          volume: parseInt(item.totalvolume) || 0,
          priceChange24h,
          priceChangePercent24h,
          currentPrice: item.currentprice,
        });

        if (results.length >= limit) break;
      }

      // Cache the result for 15 minutes
      await this.cacheManager.set(cacheKey, results, 15 * 60);

      return results;
    } catch (error) {
      this.logger.error(`Failed to get popular items for app ${appId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect price anomalies
   */
  async detectPriceAnomalies(appId: number): Promise<PriceAnomaly[]> {
    try {
      const cacheKey = `price_anomalies:${appId}`;
      const cachedAnomalies = await this.cacheManager.get<PriceAnomaly[]>(cacheKey);

      if (cachedAnomalies) {
        this.logger.debug(`Returning cached price anomalies for app ${appId}`);
        return cachedAnomalies;
      }

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get items with recent prices
      const recentItems = await this.itemPriceRepository
        .createQueryBuilder('ip')
        .select('ip.itemId, ip.marketHashName, AVG(ip.price) as avgPrice, STDDEV(ip.price) as stdDev')
        .addSelect('MAX(ip.price) as currentPrice, MAX(ip.priceDate) as lastUpdate')
        .where('ip.appId = :appId', { appId })
        .andWhere('ip.priceDate >= :sevenDaysAgo', { sevenDaysAgo })
        .groupBy('ip.itemId, ip.marketHashName')
        .having('COUNT(ip.id) >= 3') // At least 3 data points
        .getRawMany();

      const anomalies: PriceAnomaly[] = [];

      for (const item of recentItems) {
        const avgPrice = parseFloat(item.avgprice);
        const stdDev = parseFloat(item.stddev);
        const currentPrice = parseFloat(item.currentprice);

        if (isNaN(avgPrice) || isNaN(stdDev) || stdDev === 0) continue;

        // Calculate how many standard deviations the current price is from the mean
        const deviation = Math.abs(currentPrice - avgPrice) / stdDev;

        if (deviation > this.anomalyThreshold) {
          const deviationPercent = ((currentPrice - avgPrice) / avgPrice) * 100;
          const severity = this.getAnomalySeverity(deviation);

          // Get item info
          const itemInfo = await this.getPriceServiceItemInfo(item.ip_item_id);

          anomalies.push({
            itemId: item.ip_item_id,
            marketHashName: item.ip_market_hash_name,
            name: itemInfo?.name || item.ip_market_hash_name,
            iconUrl: itemInfo?.iconUrl,
            currentPrice,
            expectedPrice: avgPrice,
            deviation,
            deviationPercent,
            severity,
            detectedAt: now,
          });
        }
      }

      // Sort by deviation magnitude
      const sortedAnomalies = anomalies
        .sort((a, b) => b.deviation - a.deviation);

      // Cache the result for 30 minutes
      await this.cacheManager.set(cacheKey, sortedAnomalies, 30 * 60);

      return sortedAnomalies;
    } catch (error) {
      this.logger.error(`Failed to detect price anomalies for app ${appId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate comprehensive market report
   */
  async generateMarketReport(appId: number): Promise<MarketReport> {
    try {
      const cacheKey = `market_report:${appId}`;
      const cachedReport = await this.cacheManager.get<MarketReport>(cacheKey);

      if (cachedReport) {
        this.logger.debug(`Returning cached market report for app ${appId}`);
        return cachedReport;
      }

      const now = new Date();

      // Get basic market statistics
      const marketStats = await this.itemPriceRepository
        .createQueryBuilder('ip')
        .select('COUNT(DISTINCT ip.itemId) as totalItems, AVG(ip.price) as avgPrice, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ip.price) as medianPrice')
        .addSelect('SUM(ip.volume) as totalVolume, MAX(ip.priceDate) as lastUpdate')
        .where('ip.appId = :appId', { appId })
        .andWhere('ip.priceDate >= :oneDayAgo', { oneDayAgo: new Date(now.getTime() - 24 * 60 * 60 * 1000) })
        .getRawOne();

      // Get price distribution
      const priceDistribution = await this.getPriceDistribution(appId);

      // Get top gainers and losers
      const marketTrends = await this.priceService.getMarketTrends(appId, 20);
      const topGainers = marketTrends
        .filter(item => item.priceChangePercent24h > 0)
        .sort((a, b) => b.priceChangePercent24h - a.priceChangePercent24h)
        .slice(0, 10);

      const topLosers = marketTrends
        .filter(item => item.priceChangePercent24h < 0)
        .sort((a, b) => a.priceChangePercent24h - b.priceChangePercent24h)
        .slice(0, 10);

      // Get volatile and popular items
      const volatileItems = await this.getVolatileItems(appId, 10);
      const popularItems = await this.getPopularItems(appId, 10);

      const report: MarketReport = {
        appId,
        totalItems: parseInt(marketStats.totalitems) || 0,
        averagePrice: parseFloat(marketStats.avgprice) || 0,
        medianPrice: parseFloat(marketStats.medianprice) || 0,
        totalVolume: parseInt(marketStats.totalvolume) || 0,
        priceDistribution,
        topGainers,
        topLosers,
        volatileItems,
        popularItems,
        generatedAt: now,
      };

      // Cache the result for 30 minutes
      await this.cacheManager.set(cacheKey, report, 30 * 60);

      return report;
    } catch (error) {
      this.logger.error(`Failed to generate market report for app ${appId}: ${error.message}`);
      throw error;
    }
  }

  // Helper methods

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = this.calculateMean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }

  private calculateTrendDirection(priceHistory: { timestamp: Date; price: number }[]): number {
    if (priceHistory.length < 2) return 0;

    const recentPrices = priceHistory.slice(-7).map(p => p.price);
    const olderPrices = priceHistory.slice(-14, -7).map(p => p.price);

    if (recentPrices.length === 0 || olderPrices.length === 0) {
      return priceHistory[priceHistory.length - 1].price - priceHistory[0].price;
    }

    const recentAvg = this.calculateMean(recentPrices);
    const olderAvg = this.calculateMean(olderPrices);

    return recentAvg - olderAvg;
  }

  private getTrendDirection(trendValue: number): 'rising' | 'falling' | 'stable' {
    const threshold = 0.02; // 2% threshold
    if (Math.abs(trendValue) < threshold) return 'stable';
    return trendValue > 0 ? 'rising' : 'falling';
  }

  private calculateLinearRegression(priceHistory: { timestamp: Date; price: number }[]): { slope: number; intercept: number } {
    const n = priceHistory.length;
    const x = priceHistory.map((_, index) => index);
    const y = priceHistory.map(p => p.price);

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, index) => sum + val * y[index], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private predictPrice(slope: number, intercept: number, x: number): number {
    return slope * x + intercept;
  }

  private calculateRSquared(priceHistory: { timestamp: Date; price: number }[], slope: number, intercept: number): number {
    const n = priceHistory.length;
    const y = priceHistory.map(p => p.price);
    const yMean = this.calculateMean(y);

    let ssRes = 0; // Sum of squares of residuals
    let ssTot = 0; // Total sum of squares

    for (let i = 0; i < n; i++) {
      const predictedY = slope * i + intercept;
      const actualY = y[i];

      ssRes += Math.pow(actualY - predictedY, 2);
      ssTot += Math.pow(actualY - yMean, 2);
    }

    return 1 - (ssRes / ssTot);
  }

  private getAnomalySeverity(deviation: number): 'low' | 'medium' | 'high' {
    if (deviation >= 4.0) return 'high';
    if (deviation >= 3.0) return 'medium';
    return 'low';
  }

  private async getPriceDistribution(appId: number): Promise<{ ranges: string[]; counts: number[] }> {
    const ranges = ['<$1', '$1-$5', '$5-$10', '$10-$50', '$50-$100', '$100-$500', '$500+'];
    const counts = new Array(ranges.length).fill(0);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const priceRanges = await this.itemPriceRepository
      .createQueryBuilder('ip')
      .select('CASE ' +
        'WHEN ip.price < 1 THEN 0 ' +
        'WHEN ip.price >= 1 AND ip.price < 5 THEN 1 ' +
        'WHEN ip.price >= 5 AND ip.price < 10 THEN 2 ' +
        'WHEN ip.price >= 10 AND ip.price < 50 THEN 3 ' +
        'WHEN ip.price >= 50 AND ip.price < 100 THEN 4 ' +
        'WHEN ip.price >= 100 AND ip.price < 500 THEN 5 ' +
        'ELSE 6 ' +
        'END as price_range')
      .addSelect('COUNT(*) as count')
      .where('ip.appId = :appId', { appId })
      .andWhere('ip.priceDate >= :oneDayAgo', { oneDayAgo })
      .groupBy('price_range')
      .orderBy('price_range')
      .getRawMany();

    priceRanges.forEach(row => {
      const rangeIndex = parseInt(row.price_range);
      counts[rangeIndex] = parseInt(row.count);
    });

    return { ranges, counts };
  }

  private async getPriceServiceItemInfo(itemId: string): Promise<{ name?: string; iconUrl?: string } | null> {
    // This would ideally be injected from a service that can fetch item info
    // For now, return null and let the calling service handle it
    return null;
  }
}