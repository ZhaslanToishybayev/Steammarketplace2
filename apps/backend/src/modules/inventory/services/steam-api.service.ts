import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import axiosRetry from 'axios-retry';
import { AxiosResponse } from 'axios';
import { SteamApiException, PrivateInventoryException, RateLimitException, InvalidSteamIdException, SteamApiTimeoutException } from '../exceptions/steam-api.exception';

export interface SteamInventoryResponse {
  assets: any[];
  descriptions: any[];
  total_inventory_count: number;
  success: number;
  more_items?: number;
  last_assetid?: string;
}

export interface SteamAsset {
  assetid: string;
  classid: string;
  instanceid: string;
  amount: string;
  currencyid?: string;
}

export interface SteamDescription {
  classid: string;
  instanceid: string;
  name: string;
  market_name: string;
  market_hash_name: string;
  description: string;
  type: string;
  tradable?: number;
  marketable?: number;
  commodity?: number;
  appid: string;
  contextid: string;
  icon_url: string;
  icon_url_large: string;
  background_color?: string;
  tags?: any[];
  descriptions?: any[];
}

export interface ParsedItemMetadata {
  classId: string;
  instanceId: string;
  appId: number;
  name: string;
  marketName: string;
  marketHashName: string;
  type: string;
  rarity: string;
  quality: string;
  iconUrl: string;
  iconUrlLarge: string;
  backgroundColor: string;
  wear?: string;
  floatValue?: number;
  paintSeed?: number;
  paintIndex?: number;
  stickers?: any[];
  hero?: string;
  slot?: string;
  gems?: any[];
  craftable?: boolean;
  killstreak?: string;
  condition?: string;
  tradable: boolean;
  marketable: boolean;
  commodity: boolean;
  descriptions: any[];
  tags: any[];
  rawData: any;
}

@Injectable()
export class SteamApiService {
  private readonly logger = new Logger(SteamApiService.name);
  private readonly steamApiKey: string;
  private readonly steamInventoryApiUrl: string;
  private readonly steamApiBaseUrl: string;
  private readonly rateLimitPerSecond: number;
  private readonly rateLimitPerMinute: number;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  // Cache TTL constants (in seconds)
  private readonly SECOND_WINDOW_TTL_SECONDS = 1;
  private readonly MINUTE_WINDOW_TTL_SECONDS = 60;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.steamApiKey = this.configService.get<string>('STEAM_API_KEY');
    this.steamInventoryApiUrl = this.configService.get<string>('STEAM_INVENTORY_API_URL', 'https://steamcommunity.com');
    this.steamApiBaseUrl = this.configService.get<string>('STEAM_API_BASE_URL', 'https://api.steampowered.com');
    this.rateLimitPerSecond = this.configService.get<number>('STEAM_API_RATE_LIMIT_PER_SECOND', 5);
    this.rateLimitPerMinute = this.configService.get<number>('STEAM_API_RATE_LIMIT_PER_MINUTE', 200);
    this.timeout = this.configService.get<number>('STEAM_API_TIMEOUT', 10000);
    this.maxRetries = this.configService.get<number>('STEAM_API_MAX_RETRIES', 3);
    this.retryDelay = this.configService.get<number>('STEAM_API_RETRY_DELAY', 1000);

    this.setupHttpClient();
  }

  private setupHttpClient() {
    // Configure axios instance
    const axiosInstance = this.httpService.axiosRef;

    // Configure retry
    axiosRetry(axiosInstance, {
      retries: this.maxRetries,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkError(error) ||
               axiosRetry.isRetryableError(error) ||
               error.response?.status === 429 ||
               error.response?.status >= 500;
      },
    });

    // Request interceptor for logging
    axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to ${config.url} with method ${config.method}`);
        return config;
      },
      (error) => {
        this.logger.error('Request error:', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor for logging
    axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response from ${response.config.url}: ${response.status}`);
        return response;
      },
      (error) => {
        this.logger.error(`Response error from ${error.config?.url}: ${error.response?.status} ${error.response?.statusText}`);
        return Promise.reject(error);
      },
    );
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const secondKey = `steam_api:rate_limit:second:${Math.floor(now / 1000)}`;
    const minuteKey = `steam_api:rate_limit:minute:${Math.floor(now / 60000)}`;

    // Check second limit
    const secondCount = await this.cacheManager.get<number>(secondKey) || 0;
    if (secondCount >= this.rateLimitPerSecond) {
      const waitTime = 1000 - (now % 1000);
      this.logger.debug(`Rate limit per second reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Check minute limit
    const minuteCount = await this.cacheManager.get<number>(minuteKey) || 0;
    if (minuteCount >= this.rateLimitPerMinute) {
      const waitTime = 60000 - (now % 60000);
      this.logger.debug(`Rate limit per minute reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private async incrementRateLimitCounter(): Promise<void> {
    const now = Date.now();
    const secondKey = `steam_api:rate_limit:second:${Math.floor(now / 1000)}`;
    const minuteKey = `steam_api:rate_limit:minute:${Math.floor(now / 60000)}`;

    // Increment counters
    await this.cacheManager.set(secondKey, (await this.cacheManager.get<number>(secondKey) || 0) + 1, this.SECOND_WINDOW_TTL_SECONDS);
    await this.cacheManager.set(minuteKey, (await this.cacheManager.get<number>(minuteKey) || 0) + 1, this.MINUTE_WINDOW_TTL_SECONDS);
  }

  async getUserInventory(steamId: string, appId: number, contextId: string = '2'): Promise<SteamInventoryResponse> {
    await this.waitForRateLimit();

    const cacheKey = `inventory:${steamId}:${appId}:${contextId}`;
    const cachedInventory = await this.cacheManager.get<SteamInventoryResponse>(cacheKey);

    if (cachedInventory) {
      this.logger.debug(`Returning cached inventory for ${steamId}`);
      return cachedInventory;
    }

    const url = `${this.steamInventoryApiUrl}/inventory/${steamId}/${appId}/${contextId}`;

    try {
      this.logger.debug(`Fetching inventory for ${steamId} from ${url}`);

      const response: AxiosResponse = await this.httpService.axiosRef.get(url, {
        timeout: this.timeout,
      });

      await this.incrementRateLimitCounter();

      if (response.status === 200) {
        const inventoryData = response.data;

        if (inventoryData.success === 0) {
          if (inventoryData.error === 'Private profile' || inventoryData.error === 'This profile is private.') {
            throw new PrivateInventoryException(steamId);
          }
          throw new SteamApiException(`Steam API error: ${inventoryData.error}`, 403, { steamId, appId, error: inventoryData.error });
        }

        // Cache the result
        const cacheTtlSeconds = this.configService.get<number>('INVENTORY_CACHE_TTL_SECONDS', 1800);
        await this.cacheManager.set(cacheKey, inventoryData, cacheTtlSeconds);

        return inventoryData;
      } else {
        throw new SteamApiException(`Unexpected response status: ${response.status}`, response.status, { steamId, appId, status: response.status });
      }
    } catch (error) {
      await this.incrementRateLimitCounter();

      if (error.response?.status === 403) {
        throw new PrivateInventoryException(steamId);
      } else if (error.response?.status === 404) {
        throw new InvalidSteamIdException(steamId);
      } else if (error.response?.status === 429) {
        throw new RateLimitException();
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new SteamApiTimeoutException(url, this.timeout);
      } else {
        throw new SteamApiException(`Failed to fetch inventory: ${error.message}`, 500, { steamId, appId, error: error.message });
      }
    }
  }

  async getItemSchema(appId: number): Promise<any> {
    await this.waitForRateLimit();

    const cacheKey = `item_schema:${appId}`;
    const cachedSchema = await this.cacheManager.get<any>(cacheKey);

    if (cachedSchema) {
      this.logger.debug(`Returning cached item schema for app ${appId}`);
      return cachedSchema;
    }

    try {
      const url = `${this.steamApiBaseUrl}/IEconItems_${appId}/GetSchema/v2/`;
      this.logger.debug(`Fetching item schema for app ${appId}`);

      const response: AxiosResponse = await this.httpService.axiosRef.get(url, {
        params: { key: this.steamApiKey },
        timeout: this.timeout,
      });

      await this.incrementRateLimitCounter();

      if (response.status === 200) {
        const schemaData = response.data;

        // Cache for 24 hours
        await this.cacheManager.set(cacheKey, schemaData, 24 * 60 * 60);

        return schemaData;
      } else {
        throw new SteamApiException(`Failed to fetch item schema: ${response.status}`, response.status, { appId, status: response.status });
      }
    } catch (error) {
      await this.incrementRateLimitCounter();
      throw new SteamApiException(`Failed to fetch item schema: ${error.message}`, 500, { appId, error: error.message });
    }
  }

  async getAssetClassInfo(appId: number, classIds: string[]): Promise<Map<string, any>> {
    await this.waitForRateLimit();

    const results = new Map<string, any>();

    // Process in batches of 100 (Steam API limit)
    for (let i = 0; i < classIds.length; i += 100) {
      const batch = classIds.slice(i, i + 100);
      const params: any = {
        key: this.steamApiKey,
        appid: appId,
        class_count: batch.length,
      };

      batch.forEach((classId, index) => {
        params[`classid${index}`] = classId;
      });

      try {
        const url = `${this.steamApiBaseUrl}/ISteamEconomy/GetAssetClassInfo/v1/`;
        this.logger.debug(`Fetching asset class info for ${batch.length} items`);

        const response: AxiosResponse = await this.httpService.axiosRef.get(url, {
          params,
          timeout: this.timeout,
        });

        await this.incrementRateLimitCounter();

        if (response.status === 200) {
          const classInfoData = response.data;
          if (classInfoData.result) {
            Object.entries(classInfoData.result).forEach(([key, value]: [string, any]) => {
              if (key.startsWith('class_') && value) {
                const classId = key.split('_')[1];
                results.set(classId, value);
              }
            });
          }
        }
      } catch (error) {
        await this.incrementRateLimitCounter();
        this.logger.error(`Failed to fetch asset class info for batch: ${error.message}`);
        // Continue processing other batches
      }
    }

    return results;
  }

  parseItemMetadata(asset: SteamAsset, description: SteamDescription, appId: number): ParsedItemMetadata {
    const metadata: ParsedItemMetadata = {
      classId: description.classid,
      instanceId: description.instanceid,
      appId,
      name: description.name,
      marketName: description.market_name,
      marketHashName: description.market_hash_name,
      type: description.type,
      rarity: '',
      quality: '',
      iconUrl: description.icon_url,
      iconUrlLarge: description.icon_url_large,
      backgroundColor: description.background_color,
      tradable: Boolean(description.tradable),
      marketable: Boolean(description.marketable),
      commodity: Boolean(description.commodity),
      descriptions: description.descriptions || [],
      tags: description.tags || [],
      rawData: { asset, description },
    };

    // Parse tags to extract structured data
    if (description.tags) {
      description.tags.forEach(tag => {
        switch (tag.category) {
          case 'Rarity':
            metadata.rarity = tag.localizedName;
            break;
          case 'Quality':
            metadata.quality = tag.localizedName;
            break;
          case 'Type':
            metadata.type = tag.localizedName;
            break;
        }
      });
    }

    // Parse game-specific metadata
    if (appId === 730) { // CS:GO/CS2
      this.parseCSGOItem(metadata, description);
    } else if (appId === 570) { // Dota 2
      this.parseDota2Item(metadata, description);
    } else if (appId === 440) { // TF2
      this.parseTF2Item(metadata, description);
    } else if (appId === 252490) { // Rust
      this.parseRustItem(metadata, description);
    }

    return metadata;
  }

  private parseCSGOItem(metadata: ParsedItemMetadata, description: SteamDescription) {
    // Parse wear and float value from descriptions
    if (description.descriptions) {
      description.descriptions.forEach(desc => {
        if (desc.value) {
          // Extract wear level
          const wearMatch = desc.value.match(/(Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)/);
          if (wearMatch) {
            metadata.wear = wearMatch[1];
          }

          // Extract float value
          const floatMatch = desc.value.match(/Float Value:\s*([0-9.]+)/);
          if (floatMatch) {
            metadata.floatValue = parseFloat(floatMatch[1]);
          }

          // Extract paint seed and index
          const paintSeedMatch = desc.value.match(/Paint Seed:\s*(\d+)/);
          if (paintSeedMatch) {
            metadata.paintSeed = parseInt(paintSeedMatch[1]);
          }

          const paintIndexMatch = desc.value.match(/Paint Index:\s*(\d+)/);
          if (paintIndexMatch) {
            metadata.paintIndex = parseInt(paintIndexMatch[1]);
          }
        }
      });
    }

    // Parse stickers
    if (description.descriptions) {
      const stickers: any[] = [];
      description.descriptions.forEach(desc => {
        if (desc.value && desc.value.includes('Sticker')) {
          const stickerMatch = desc.value.match(/Sticker:\s*(.+?)(?:\s*on|$)/);
          if (stickerMatch) {
            stickers.push({
              name: stickerMatch[1].trim(),
              slot: stickers.length,
            });
          }
        }
      });
      if (stickers.length > 0) {
        metadata.stickers = stickers;
      }
    }
  }

  private parseDota2Item(metadata: ParsedItemMetadata, description: SteamDescription) {
    if (description.descriptions) {
      description.descriptions.forEach(desc => {
        if (desc.value) {
          const heroMatch = desc.value.match(/Hero:\s*(.+)/);
          if (heroMatch) {
            metadata.hero = heroMatch[1].trim();
          }

          const slotMatch = desc.value.match(/Slot:\s*(.+)/);
          if (slotMatch) {
            metadata.slot = slotMatch[1].trim();
          }
        }
      });
    }
  }

  private parseTF2Item(metadata: ParsedItemMetadata, description: SteamDescription) {
    if (description.descriptions) {
      description.descriptions.forEach(desc => {
        if (desc.value) {
          if (desc.value.includes('Not Craftable')) {
            metadata.craftable = false;
          } else if (desc.value.includes('Craftable')) {
            metadata.craftable = true;
          }

          const killstreakMatch = desc.value.match(/Killstreak:\s*(.+)/);
          if (killstreakMatch) {
            metadata.killstreak = killstreakMatch[1].trim();
          }
        }
      });
    }
  }

  private parseRustItem(metadata: ParsedItemMetadata, description: SteamDescription) {
    if (description.descriptions) {
      description.descriptions.forEach(desc => {
        if (desc.value) {
          const conditionMatch = desc.value.match(/Condition:\s*(.+)/);
          if (conditionMatch) {
            metadata.condition = conditionMatch[1].trim();
          }
        }
      });
    }
  }

  async validateInventoryAccess(steamId: string): Promise<boolean> {
    try {
      await this.getUserInventory(steamId, 730, '2');
      return true;
    } catch (error) {
      if (error instanceof PrivateInventoryException) {
        return false;
      }
      throw error;
    }
  }

  async getItemPrices(marketHashName: string, appId: number = 730): Promise<any> {
    await this.waitForRateLimit();

    const cacheKey = `item_price:${appId}:${marketHashName}`;
    const cachedPrice = await this.cacheManager.get<any>(cacheKey);

    if (cachedPrice) {
      this.logger.debug(`Returning cached price for ${marketHashName}`);
      return cachedPrice;
    }

    try {
      const url = `${this.steamInventoryApiUrl}/market/priceoverview/`;
      this.logger.debug(`Fetching price for ${marketHashName} from ${url}`);

      const response: AxiosResponse = await this.httpService.axiosRef.get(url, {
        params: {
          country: 'US',
          currency: 1,
          appid: appId,
          market_hash_name: marketHashName
        },
        timeout: this.timeout,
      });

      await this.incrementRateLimitCounter();

      if (response.status === 200) {
        const priceData = response.data;

        if (priceData.success === 1) {
          // Cache for 5 minutes
          const cacheTtlSeconds = this.configService.get<number>('PRICE_CACHE_TTL_SECONDS', 300);
          await this.cacheManager.set(cacheKey, priceData, cacheTtlSeconds);

          return priceData;
        } else {
          throw new SteamApiException(`Failed to get item price: ${priceData.error}`, 400, { marketHashName, appId });
        }
      } else {
        throw new SteamApiException(`Unexpected response status: ${response.status}`, response.status, { marketHashName, appId, status: response.status });
      }
    } catch (error) {
      await this.incrementRateLimitCounter();

      if (error.response?.status === 404) {
        throw new SteamApiException(`Item not found: ${marketHashName}`, 404, { marketHashName, appId });
      } else if (error.response?.status === 429) {
        throw new RateLimitException();
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new SteamApiTimeoutException(url, this.timeout);
      } else {
        throw new SteamApiException(`Failed to fetch item price: ${error.message}`, 500, { marketHashName, appId, error: error.message });
      }
    }
  }
}