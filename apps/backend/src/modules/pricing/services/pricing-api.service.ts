import { Injectable, Logger, ConfigService } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import * as axiosRetry from 'axios-retry';
import { AxiosResponse } from 'axios';
import { lastValueFrom } from 'rxjs';
import { PriceSource } from '../entities/item-price.entity';
import {
  PricingApiException,
  PriceNotFoundException,
  PricingRateLimitException,
  PricingApiTimeoutException
} from '../exceptions/pricing.exception';

export interface SteamMarketPrice {
  lowestPrice: number;
  highestPrice: number;
  medianPrice: number;
  volume: number;
  currency: string;
}

export interface CSGOFloatPrice {
  averagePrice: number;
  volume: number;
}

export interface Buff163Price {
  priceCNY: number;
  priceUSD: number;
  volume: number;
}

export interface AggregatedPrice {
  basePrice: number;
  source: PriceSource;
  volume?: number;
  lowestPrice?: number;
  medianPrice?: number;
  highestPrice?: number;
  metadata?: any;
}

@Injectable()
export class PricingApiService {
  private readonly logger = new Logger(PricingApiService.name);
  private readonly steamMarketApiUrl: string;
  private readonly csgoFloatApiUrl: string;
  private readonly csgoFloatApiKey: string;
  private readonly buff163ApiUrl: string;
  private readonly buff163ApiKey: string;
  private readonly priceApiTimeout: number;
  private readonly priceApiMaxRetries: number;
  private readonly steamRateLimitPerMinute: number;
  private readonly csgoFloatRateLimitPerMinute: number;
  private readonly buff163RateLimitPerMinute: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.steamMarketApiUrl = this.configService.get<string>('STEAM_MARKET_API_URL', 'https://steamcommunity.com/market');
    this.csgoFloatApiUrl = this.configService.get<string>('CSGOFLOAT_API_URL', 'https://csgofloat.com/api/v1');
    this.csgoFloatApiKey = this.configService.get<string>('CSGOFLOAT_API_KEY');
    this.buff163ApiUrl = this.configService.get<string>('BUFF163_API_URL', 'https://buff.163.com/api');
    this.buff163ApiKey = this.configService.get<string>('BUFF163_API_KEY');
    this.priceApiTimeout = this.configService.get<number>('PRICE_API_TIMEOUT', 10000);
    this.priceApiMaxRetries = this.configService.get<number>('PRICE_API_MAX_RETRIES', 3);
    this.steamRateLimitPerMinute = this.configService.get<number>('PRICE_API_RATE_LIMIT_STEAM', 20);
    this.csgoFloatRateLimitPerMinute = this.configService.get<number>('PRICE_API_RATE_LIMIT_CSGOFLOAT', 60);
    this.buff163RateLimitPerMinute = this.configService.get<number>('PRICE_API_RATE_LIMIT_BUFF163', 30);

    this.setupHttpClient();
  }

  private setupHttpClient() {
    const axiosInstance = this.httpService.axiosRef;

    axiosRetry.attach();
    axiosRetry(axiosInstance, {
      retries: this.priceApiMaxRetries,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkError(error) ||
               axiosRetry.isRetryableError(error) ||
               error.response?.status === 429 ||
               error.response?.status >= 500;
      },
    });

    axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making pricing API request to ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Pricing API request error:', error);
        return Promise.reject(error);
      },
    );

    axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`Pricing API response from ${response.config.url}: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error(`Pricing API response error from ${error.config?.url}: ${error.response?.status} ${error.response?.statusText}`);
        return Promise.reject(error);
      },
    );
  }

  private async waitForRateLimit(source: string, rateLimit: number): Promise<void> {
    const now = Date.now();
    const key = `pricing_api:rate_limit:${source}:${Math.floor(now / 60000)}`;

    const count = await this.cacheManager.get<number>(key) || 0;
    if (count >= rateLimit) {
      const waitTime = 60000 - (now % 60000);
      this.logger.debug(`${source} rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private async incrementRateLimitCounter(source: string): Promise<void> {
    const now = Date.now();
    const key = `pricing_api:rate_limit:${source}:${Math.floor(now / 60000)}`;

    await this.cacheManager.set(key, (await this.cacheManager.get<number>(key) || 0) + 1, 60000);
  }

  private async getCachedPrice(cacheKey: string): Promise<any> {
    return await this.cacheManager.get(cacheKey);
  }

  private async setCachedPrice(cacheKey: string, data: any, ttl: number): Promise<void> {
    await this.cacheManager.set(cacheKey, data, ttl);
  }

  async getSteamMarketPrice(marketHashName: string, appId: number): Promise<SteamMarketPrice> {
    await this.waitForRateLimit('steam_market', this.steamRateLimitPerMinute);

    const cacheKey = `steam_price:${appId}:${encodeURIComponent(marketHashName)}`;
    const cachedPrice = await this.getCachedPrice(cacheKey);

    if (cachedPrice) {
      this.logger.debug(`Returning cached Steam market price for ${marketHashName}`);
      return cachedPrice;
    }

    try {
      const url = `${this.steamMarketApiUrl}/priceoverview/`;
      this.logger.debug(`Fetching Steam market price for ${marketHashName} (App ${appId})`);

      const response: AxiosResponse = await lastValueFrom(
        this.httpService.get(url, {
          params: {
            appid: appId,
            market_hash_name: marketHashName,
            currency: 1, // USD
          },
          timeout: this.priceApiTimeout,
        })
      );

      await this.incrementRateLimitCounter('steam_market');

      if (response.status === 200 && response.data.success) {
        const data = response.data;
        const priceData: SteamMarketPrice = {
          lowestPrice: this.parsePriceString(data.lowest_price),
          highestPrice: data.highest_price ? this.parsePriceString(data.highest_price) : undefined,
          medianPrice: data.median_price ? this.parsePriceString(data.median_price) : undefined,
          volume: data.volume ? parseInt(data.volume.replace(/,/g, '')) : 0,
          currency: 'USD',
        };

        // Cache for 15 minutes (900 seconds)
        const cacheTtl = 15 * 60;
        await this.setCachedPrice(cacheKey, priceData, cacheTtl);

        return priceData;
      } else {
        throw new PriceNotFoundException(marketHashName, appId);
      }
    } catch (error) {
      await this.incrementRateLimitCounter('steam_market');

      if (error.response?.status === 429) {
        throw new PricingRateLimitException('Steam Market', error.response.headers['retry-after']);
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new PricingApiTimeoutException(`${this.steamMarketApiUrl}/priceoverview/`, this.priceApiTimeout);
      } else if (error.response?.status === 404) {
        throw new PriceNotFoundException(marketHashName, appId);
      } else {
        throw new PricingApiException(`Failed to fetch Steam market price: ${error.message}`, 500, { marketHashName, appId, error: error.message });
      }
    }
  }

  async getCSGOFloatPrice(marketHashName: string): Promise<CSGOFloatPrice> {
    await this.waitForRateLimit('csgofloat', this.csgoFloatRateLimitPerMinute);

    const cacheKey = `csgofloat_price:${encodeURIComponent(marketHashName)}`;
    const cachedPrice = await this.getCachedPrice(cacheKey);

    if (cachedPrice) {
      this.logger.debug(`Returning cached CSGOFloat price for ${marketHashName}`);
      return cachedPrice;
    }

    try {
      const url = `${this.csgoFloatApiUrl}/listings`;
      this.logger.debug(`Fetching CSGOFloat price for ${marketHashName}`);

      const params: any = {
        market_hash_name: marketHashName,
      };

      // Add API key if available
      if (this.csgoFloatApiKey) {
        params.api_key = this.csgoFloatApiKey;
      }

      const response: AxiosResponse = await lastValueFrom(
        this.httpService.get(url, {
          params,
          timeout: this.priceApiTimeout,
        })
      );

      await this.incrementRateLimitCounter('csgofloat');

      if (response.status === 200) {
        const data = response.data;
        if (data && data.listings && data.listings.length > 0) {
          const prices = data.listings.map((listing: any) => listing.price).filter(Boolean);
          const averagePrice = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;

          const priceData: CSGOFloatPrice = {
            averagePrice,
            volume: data.listings.length,
          };

          // Cache for 10 minutes (600 seconds)
          const cacheTtl = 10 * 60;
          await this.setCachedPrice(cacheKey, priceData, cacheTtl);

          return priceData;
        } else {
          throw new PriceNotFoundException(marketHashName, 730);
        }
      } else {
        throw new PricingApiException(`CSGOFloat API error: ${response.status}`, response.status, { marketHashName, status: response.status });
      }
    } catch (error) {
      await this.incrementRateLimitCounter('csgofloat');

      if (error.response?.status === 429) {
        throw new PricingRateLimitException('CSGOFloat', error.response.headers['retry-after']);
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new PricingApiTimeoutException(url, this.priceApiTimeout);
      } else if (error.response?.status === 404) {
        throw new PriceNotFoundException(marketHashName, 730);
      } else {
        throw new PricingApiException(`Failed to fetch CSGOFloat price: ${error.message}`, 500, { marketHashName, error: error.message });
      }
    }
  }

  async getBuff163Price(marketHashName: string): Promise<Buff163Price> {
    await this.waitForRateLimit('buff163', this.buff163RateLimitPerMinute);

    const cacheKey = `buff163_price:${encodeURIComponent(marketHashName)}`;
    const cachedPrice = await this.getCachedPrice(cacheKey);

    if (cachedPrice) {
      this.logger.debug(`Returning cached Buff163 price for ${marketHashName}`);
      return cachedPrice;
    }

    try {
      const url = `${this.buff163ApiUrl}/market/goods`;
      this.logger.debug(`Fetching Buff163 price for ${marketHashName}`);

      const params: any = {
        game: 'csgo',
        search: marketHashName,
      };

      // Add API key if available
      if (this.buff163ApiKey) {
        params.api_key = this.buff163ApiKey;
      }

      const response: AxiosResponse = await lastValueFrom(
        this.httpService.get(url, {
          params,
          timeout: this.priceApiTimeout,
        })
      );

      await this.incrementRateLimitCounter('buff163');

      if (response.status === 200) {
        const data = response.data;
        if (data && data.items && data.items.length > 0) {
          // Get the first matching item (most relevant)
          const item = data.items[0];
          const priceCNY = parseFloat(item.price);
          const priceUSD = priceCNY * 0.14; // Approximate CNY to USD conversion

          const priceData: Buff163Price = {
            priceCNY,
            priceUSD,
            volume: item.sell_num || 0,
          };

          // Cache for 20 minutes (1200 seconds)
          const cacheTtl = 20 * 60;
          await this.setCachedPrice(cacheKey, priceData, cacheTtl);

          return priceData;
        } else {
          throw new PriceNotFoundException(marketHashName, 730);
        }
      } else {
        throw new PricingApiException(`Buff163 API error: ${response.status}`, response.status, { marketHashName, status: response.status });
      }
    } catch (error) {
      await this.incrementRateLimitCounter('buff163');

      if (error.response?.status === 429) {
        throw new PricingRateLimitException('Buff163', error.response.headers['retry-after']);
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new PricingApiTimeoutException(url, this.priceApiTimeout);
      } else if (error.response?.status === 404) {
        throw new PriceNotFoundException(marketHashName, 730);
      } else {
        throw new PricingApiException(`Failed to fetch Buff163 price: ${error.message}`, 500, { marketHashName, error: error.message });
      }
    }
  }

  async getAggregatedPrice(marketHashName: string, appId: number): Promise<AggregatedPrice> {
    this.logger.debug(`Getting aggregated price for ${marketHashName} (App ${appId})`);

    const results = await Promise.allSettled([
      this.getSteamMarketPrice(marketHashName, appId),
      this.getCSGOFloatPrice(marketHashName),
      this.getBuff163Price(marketHashName),
    ]);

    const successfulResults: { source: PriceSource; price: number; volume?: number; metadata?: any }[] = [];

    // Process Steam Market result
    if (results[0].status === 'fulfilled') {
      const steamResult = results[0].value;
      successfulResults.push({
        source: PriceSource.STEAM_MARKET,
        price: steamResult.medianPrice || steamResult.lowestPrice,
        volume: steamResult.volume,
        metadata: {
          lowestPrice: steamResult.lowestPrice,
          highestPrice: steamResult.highestPrice,
          medianPrice: steamResult.medianPrice,
          currency: steamResult.currency,
        },
      });
    }

    // Process CSGOFloat result
    if (results[1].status === 'fulfilled') {
      const csgoResult = results[1].value;
      successfulResults.push({
        source: PriceSource.CSGOFLOAT,
        price: csgoResult.averagePrice,
        volume: csgoResult.volume,
        metadata: {
          averagePrice: csgoResult.averagePrice,
        },
      });
    }

    // Process Buff163 result
    if (results[2].status === 'fulfilled') {
      const buffResult = results[2].value;
      successfulResults.push({
        source: PriceSource.BUFF163,
        price: buffResult.priceUSD,
        volume: buffResult.volume,
        metadata: {
          priceCNY: buffResult.priceCNY,
          priceUSD: buffResult.priceUSD,
        },
      });
    }

    if (successfulResults.length === 0) {
      throw new PriceNotFoundException(marketHashName, appId);
    }

    // Calculate weighted average
    const weights = {
      [PriceSource.STEAM_MARKET]: 0.4,
      [PriceSource.CSGOFLOAT]: 0.35,
      [PriceSource.BUFF163]: 0.25,
    };

    let weightedSum = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    let lowestPrice: number | undefined;
    let highestPrice: number | undefined;
    const allMetadata: any[] = [];

    successfulResults.forEach(result => {
      const weight = weights[result.source];
      weightedSum += result.price * weight;
      totalWeight += weight;
      totalVolume += result.volume || 0;
      allMetadata.push({ source: result.source, ...result.metadata });

      if (!lowestPrice || result.price < lowestPrice) {
        lowestPrice = result.price;
      }
      if (!highestPrice || result.price > highestPrice) {
        highestPrice = result.price;
      }
    });

    const finalPrice = weightedSum / totalWeight;

    return {
      basePrice: finalPrice,
      source: PriceSource.AGGREGATED,
      volume: totalVolume,
      lowestPrice,
      medianPrice: finalPrice, // For aggregated price, use the calculated price as median
      highestPrice,
      metadata: {
        sources: allMetadata,
        weightDistribution: weights,
      },
    };
  }

  private parsePriceString(priceStr: string): number {
    if (!priceStr) return 0;

    // Remove currency symbols and commas, then parse as float
    const cleanPrice = priceStr.replace(/[^\d.]/g, '');
    return parseFloat(cleanPrice) || 0;
  }
}