import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { SteamApiService } from '../../modules/inventory/services/steam-api.service';
import { PricingApiService } from '../../modules/pricing/services/pricing-api.service';
import { ItemService } from '../../modules/inventory/services/item.service';
import { PriceService } from '../../modules/pricing/services/price.service';
import { Item, ItemDocument } from '../../modules/inventory/schemas/item.schema';
import { ItemPrice } from '../../modules/pricing/entities/item-price.entity';
import { PriceSource } from '../../modules/pricing/entities/item-price.entity';
import { ParsedItemMetadata } from '../../modules/inventory/services/steam-api.service';

export interface SeedOptions {
  targetCount?: number;
  batchSize?: number;
  appId?: number;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface SeedResult {
  itemsCreated: number;
  pricesFetched: number;
  errors: number;
  duration: number;
}

interface SteamMarketItem {
  hash_name: string;
  sell_listings: number;
  sell_price: number;
  sell_price_text: string;
  app_icon: string;
  app_name: string;
  asset_description: {
    classid: string;
    instanceid: string;
    market_name: string;
    market_hash_name: string;
    name: string;
    type: string;
    tradable: number;
    marketable: number;
    commodity: number;
    description: string;
    appid: string;
    icon_url: string;
    icon_url_large: string;
    background_color: string;
    descriptions: SteamDescription[];
    tags: SteamTag[];
  };
}

interface SteamDescription {
  type: string;
  value: string;
  app_data?: any;
}

interface SteamTag {
  category: string;
  internal_name: string;
  localized_category_name: string;
  localized_tag_name: string;
  color?: string;
}

@Injectable()
export class MarketSeeder {
  private readonly logger = new Logger(MarketSeeder.name);
  private readonly targetCount: number;
  private readonly batchSize: number;
  private readonly appId: number;
  private readonly dryRun: boolean;
  private readonly verbose: boolean;
  private readonly steamMarketApiUrl: string;
  private readonly rateLimitDelay: number;
  private readonly enableProgressLogging: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly steamApiService: SteamApiService,
    private readonly pricingApiService: PricingApiService,
    private readonly itemService: ItemService,
    private readonly priceService: PriceService,
  ) {
    this.targetCount = this.configService.get<number>('SEED_MARKET_ITEM_COUNT', 1000);
    this.batchSize = this.configService.get<number>('SEED_BATCH_SIZE', 100);
    this.appId = this.configService.get<number>('SEED_APP_ID', 730); // CS:GO
    this.dryRun = this.configService.get<boolean>('SEED_DRY_RUN', false);
    this.verbose = this.configService.get<boolean>('SEED_VERBOSE', false);
    this.steamMarketApiUrl = this.configService.get<string>('STEAM_MARKET_API_URL', 'https://steamcommunity.com/market');
    this.rateLimitDelay = this.configService.get<number>('SEED_RATE_LIMIT_DELAY_MS', 200);
    this.enableProgressLogging = this.configService.get<boolean>('SEED_ENABLE_PROGRESS_LOGGING', true);
  }

  async seed(options: SeedOptions = {}): Promise<SeedResult> {
    const startTime = Date.now();

    // Merge options with defaults
    const {
      targetCount = this.targetCount,
      batchSize = this.batchSize,
      appId = this.appId,
      dryRun = this.dryRun,
      verbose = this.verbose,
    } = options;

    let itemsCreated = 0;
    let pricesFetched = 0;
    let errors = 0;

    try {
      this.logger.log(`Starting seeding process for ${targetCount} items (App ID: ${appId})`);

      if (dryRun) {
        this.logger.log('DRY RUN MODE - No data will be saved to database');
      }

      // Phase 1: Fetch popular items from Steam Market
      this.logger.log('Phase 1: Fetching popular items from Steam Community Market...');
      const marketItems = await this.fetchPopularMarketItems(targetCount, appId);

      if (marketItems.length === 0) {
        throw new Error('No market items found');
      }

      this.logger.log(`Found ${marketItems.length} market items to process`);

      // Phase 2: Process items in batches
      this.logger.log('Phase 2: Processing items in batches...');

      for (let i = 0; i < marketItems.length; i += batchSize) {
        const batch = marketItems.slice(i, i + batchSize);

        if (this.enableProgressLogging && i % (batchSize * 5) === 0) {
          const progress = Math.min(i + batchSize, marketItems.length);
          this.logger.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${progress}/${marketItems.length} items`);
        }

        try {
          const batchResult = await this.processBatch(batch, {
            appId,
            dryRun,
            verbose,
          });

          itemsCreated += batchResult.itemsCreated;
          pricesFetched += batchResult.pricesFetched;
          errors += batchResult.errors;

        } catch (error) {
          this.logger.error(`Failed to process batch ${Math.floor(i / batchSize) + 1}:`, error);
          errors++;
        }

        // Respect rate limits between batches
        if (i + batchSize < marketItems.length) {
          await this.delay(this.rateLimitDelay * 5); // Slightly longer delay between batches
        }
      }

      const duration = Date.now() - startTime;

      this.logger.log(`Seeding completed successfully in ${duration}ms`, {
        itemsCreated,
        pricesFetched,
        errors,
      });

      return {
        itemsCreated,
        pricesFetched,
        errors,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Seeding failed:', error);
      throw error;
    }
  }

  private async fetchPopularMarketItems(targetCount: number, appId: number): Promise<SteamMarketItem[]> {
    const items: SteamMarketItem[] = [];
    let totalFetched = 0;
    let start = 0;

    // Calculate number of pages needed (100 items per page)
    const pagesNeeded = Math.ceil(targetCount / 100);

    this.logger.log(`Fetching ${pagesNeeded} pages from Steam Market (100 items per page)`);

    for (let page = 0; page < pagesNeeded && totalFetched < targetCount; page++) {
      try {
        // Respect rate limits
        await this.delay(this.rateLimitDelay);

        const pageItems = await this.fetchMarketPage(start, appId);
        const validItems = pageItems.filter(item =>
          item.hash_name &&
          item.asset_description &&
          item.asset_description.classid
        );

        if (validItems.length === 0) {
          this.logger.warn(`No valid items found on page ${page + 1}`);
          continue;
        }

        items.push(...validItems);
        totalFetched += validItems.length;
        start += validItems.length;

        if (this.verbose) {
          this.logger.debug(`Page ${page + 1}: Fetched ${validItems.length} valid items (total: ${totalFetched})`);
        }

      } catch (error) {
        this.logger.error(`Failed to fetch market page ${page + 1}:`, error);
        // Continue with next page rather than failing completely
      }
    }

    // Limit to target count
    return items.slice(0, targetCount);
  }

  private async fetchMarketPage(start: number, appId: number): Promise<SteamMarketItem[]> {
    const url = `${this.steamMarketApiUrl}/search/render/`;

    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.get(url, {
          params: {
            appid: appId,
            start,
            count: 100,
            search_descriptions: 0,
            sort_column: 'popular',
            sort_dir: 'desc',
          },
          timeout: 30000, // 30 seconds timeout
        })
      );

      if (response.status === 200 && response.data && response.data.results) {
        return response.data.results;
      } else {
        throw new Error(`Invalid response from Steam Market API: ${response.status}`);
      }

    } catch (error) {
      if (error.response?.status === 429) {
        this.logger.warn('Rate limited by Steam Market API, waiting before retry...');
        await this.delay(5000); // Wait 5 seconds
        throw new Error('Rate limited by Steam Market API');
      }
      throw new Error(`Failed to fetch market page: ${error.message}`);
    }
  }

  private async processBatch(
    batch: SteamMarketItem[],
    options: { appId: number; dryRun: boolean; verbose: boolean }
  ): Promise<{ itemsCreated: number; pricesFetched: number; errors: number }> {
    let itemsCreated = 0;
    let pricesFetched = 0;
    let errors = 0;

    // Extract class IDs for batch processing
    const classIds = batch.map(item => item.asset_description.classid).filter(Boolean);

    if (classIds.length === 0) {
      this.logger.warn('No valid class IDs in batch');
      return { itemsCreated: 0, pricesFetched: 0, errors: batch.length };
    }

    try {
      // Fetch detailed metadata for all items in batch
      const metadataMap = await this.steamApiService.getAssetClassInfo(options.appId, classIds);

      // Accumulate parsed item data for bulk operations
      const itemsToUpsert: any[] = [];

      // Process each item in the batch to prepare data
      for (const marketItem of batch) {
        try {
          const classId = marketItem.asset_description.classid;

          if (!classId) {
            if (options.verbose) {
              this.logger.debug(`Skipping item with no classId: ${marketItem.hash_name}`);
            }
            errors++;
            continue;
          }

          // Get item metadata from Steam API
          const metadata = metadataMap.get(classId);

          // Parse item data
          const parsedMetadata = this.parseMarketItem(marketItem, metadata, options.appId);

          if (!parsedMetadata) {
            if (options.verbose) {
              this.logger.debug(`Failed to parse item: ${marketItem.hash_name}`);
            }
            errors++;
            continue;
          }

          // Prepare item data for bulk upsert
          const itemData = {
            classId: parsedMetadata.classId,
            instanceId: parsedMetadata.instanceId,
            appId: parsedMetadata.appId,
            name: parsedMetadata.name,
            marketName: parsedMetadata.marketName,
            marketHashName: parsedMetadata.marketHashName,
            type: parsedMetadata.type,
            rarity: parsedMetadata.rarity,
            quality: parsedMetadata.quality,
            iconUrl: parsedMetadata.iconUrl,
            iconUrlLarge: parsedMetadata.iconUrlLarge,
            backgroundColor: parsedMetadata.backgroundColor,
            wear: parsedMetadata.wear,
            floatValue: parsedMetadata.floatValue,
            paintSeed: parsedMetadata.paintSeed,
            paintIndex: parsedMetadata.paintIndex,
            stickers: parsedMetadata.stickers,
            tradable: parsedMetadata.tradable,
            marketable: parsedMetadata.marketable,
            commodity: parsedMetadata.commodity,
            descriptions: parsedMetadata.descriptions,
            tags: parsedMetadata.tags,
            rawData: parsedMetadata.rawData,
            lastUpdated: new Date(),
          };

          itemsToUpsert.push(itemData);

        } catch (itemError) {
          this.logger.error(`Failed to process item ${marketItem.hash_name}:`, itemError);
          errors++;
        }
      }

      // Perform bulk upsert if not dry run
      if (!options.dryRun && itemsToUpsert.length > 0) {
        try {
          const upsertedCount = await this.itemService.bulkUpsertItems(itemsToUpsert);
          itemsCreated += upsertedCount;
          this.logger.log(`Bulk upserted ${upsertedCount} items successfully`);
        } catch (bulkError) {
          this.logger.error('Failed to bulk upsert items:', bulkError);
          errors += itemsToUpsert.length;
        }
      } else {
        itemsCreated += itemsToUpsert.length;
      }

      // Fetch prices for all successfully processed items
      for (const marketItem of batch) {
        try {
          const classId = marketItem.asset_description.classid;

          if (!classId || !marketItem.hash_name) {
            continue;
          }

          // Check if the item was successfully upserted (or would be in dry run)
          const itemUpserted = itemsToUpsert.some(item => item.classId === classId);

          if (itemUpserted) {
            const priceData = await this.pricingApiService.getAggregatedPrice(
              marketItem.hash_name,
              options.appId
            );

            if (!options.dryRun) {
              try {
                await this.priceService.savePriceRecord({
                  itemId: classId,
                  marketHashName: marketItem.hash_name,
                  appId: options.appId,
                  price: priceData.basePrice,
                  source: PriceSource.AGGREGATED,
                  volume: priceData.volume,
                  lowestPrice: priceData.lowestPrice,
                  medianPrice: priceData.medianPrice,
                  highestPrice: priceData.highestPrice,
                  metadata: priceData.metadata,
                });
              } catch (priceSaveError) {
                this.logger.warn(`Failed to save price record for ${marketItem.hash_name}:`, priceSaveError);
              }
            }

            pricesFetched++;
          }

        } catch (priceError) {
          if (options.verbose) {
            this.logger.debug(`Failed to fetch price for ${marketItem.hash_name}: ${priceError.message}`);
          }
          // Don't count as error since price data might not be available for some items
        }
      }

    } catch (batchError) {
      this.logger.error('Failed to process batch:', batchError);
      errors += batch.length;
    }

    return { itemsCreated, pricesFetched, errors };
  }

  private parseMarketItem(
    marketItem: SteamMarketItem,
    metadata: any,
    appId: number
  ): ParsedItemMetadata | null {
    try {
      const assetDescription = marketItem.asset_description;

      if (!assetDescription) {
        return null;
      }

      const parsed: ParsedItemMetadata = {
        classId: assetDescription.classid,
        instanceId: assetDescription.instanceid || '0',
        appId,
        name: assetDescription.name || assetDescription.market_name,
        marketName: assetDescription.market_name,
        marketHashName: assetDescription.market_hash_name,
        type: assetDescription.type,
        rarity: '',
        quality: '',
        iconUrl: assetDescription.icon_url,
        iconUrlLarge: assetDescription.icon_url_large,
        backgroundColor: assetDescription.background_color || '',
        tradable: Boolean(assetDescription.tradable),
        marketable: Boolean(assetDescription.marketable),
        commodity: Boolean(assetDescription.commodity),
        descriptions: assetDescription.descriptions || [],
        tags: assetDescription.tags || [],
        rawData: { marketItem, steamMetadata: metadata },
      };

      // Merge with Steam API metadata if available
      if (metadata) {
        if (metadata.name) parsed.name = metadata.name;
        if (metadata.type) parsed.type = metadata.type;
        if (metadata.descriptions) parsed.descriptions = metadata.descriptions;
        if (metadata.tags) parsed.tags = metadata.tags;
        if (metadata.icon_url) parsed.iconUrl = metadata.icon_url;
        if (metadata.icon_url_large) parsed.iconUrlLarge = metadata.icon_url_large;
      }

      // Parse tags for structured data
      if (parsed.tags) {
        parsed.tags.forEach((tag: SteamTag) => {
          switch (tag.category) {
            case 'Rarity':
              parsed.rarity = tag.localized_tag_name;
              break;
            case 'Quality':
              parsed.quality = tag.localized_tag_name;
              break;
            case 'Type':
              parsed.type = tag.localized_tag_name;
              break;
          }
        });
      }

      // Parse game-specific metadata
      if (appId === 730) { // CS:GO/CS2
        this.parseCSGOItem(parsed, assetDescription);
      }

      return parsed;
    } catch (error) {
      this.logger.error('Failed to parse market item:', error);
      return null;
    }
  }

  private parseCSGOItem(metadata: ParsedItemMetadata, assetDescription: SteamMarketItem['asset_description']): void {
    // Parse wear and float value from descriptions
    if (assetDescription.descriptions) {
      assetDescription.descriptions.forEach((desc: SteamDescription) => {
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
    if (assetDescription.descriptions) {
      const stickers: any[] = [];
      assetDescription.descriptions.forEach((desc: SteamDescription) => {
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

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}