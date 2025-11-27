import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Item, ItemDocument } from '../../inventory/schemas/item.schema';
import { TradeItem } from '../../trading/entities/trade-item.entity';
import {
  PriceCalculationException,
  InvalidItemException
} from '../exceptions/pricing.exception';

export interface ProfitMarginResult {
  totalGiveValue: number;
  totalReceiveValue: number;
  profitMargin: number;
  profitPercentage: number;
  itemsToGiveDetails: Array<{
    itemId: string;
    name: string;
    estimatedValue: number;
  }>;
  itemsToReceiveDetails: Array<{
    itemId: string;
    name: string;
    estimatedValue: number;
  }>;
}

@Injectable()
export class PriceCalculationService {
  private readonly logger = new Logger(PriceCalculationService.name);

  // CS:GO wear multipliers based on float value ranges
  private readonly csgoWearMultipliers = {
    'Factory New': { min: 0.0, max: 0.07, multiplier: 1.15 },      // 0.00 - 0.07
    'Minimal Wear': { min: 0.07, max: 0.15, multiplier: 1.05 },   // 0.07 - 0.15
    'Field-Tested': { min: 0.15, max: 0.38, multiplier: 0.95 },   // 0.15 - 0.38
    'Well-Worn': { min: 0.38, max: 0.45, multiplier: 0.75 },       // 0.38 - 0.45
    'Battle-Scarred': { min: 0.45, max: 1.0, multiplier: 0.55 },  // 0.45 - 1.00
  };

  // Sticker position multipliers (percentage of sticker value added to item)
  private readonly stickerMultipliers = [0.05, 0.04, 0.03, 0.02]; // 5%, 4%, 3%, 2%

  // Rare pattern premiums (multipliers for special patterns)
  private readonly rarePatternPremiums = {
    // Doppler phases
    'Ruby': 2.5,
    'Sapphire': 2.2,
    'Black Pearl': 3.0,
    'Emerald': 2.8,
    'Phase 1': 1.8,
    'Phase 2': 2.0,
    'Phase 3': 2.2,
    'Phase 4': 2.5,

    // Case Hardened special patterns
    'Blue Gem': 3.0,
    'Teal Gem': 2.5,
    'Pink Gem': 2.8,

    //其他稀有图案
    'Forest': 1.5,
    'Candy': 1.3,
    'Marble': 1.2,
  };

  // Base sticker values by quality/rarity (USD)
  private readonly baseStickerValues = {
    'Common': 0.10,
    'Uncommon': 0.25,
    'Rare': 0.50,
    'Mythical': 1.00,
    'Legendary': 2.00,
    'Ancient': 5.00,
  };

  constructor(
    @InjectModel(Item.name) private readonly itemModel: Model<ItemDocument>,
  ) {}

  /**
   * Calculate the final adjusted price for an item based on its attributes
   */
  async calculateItemPrice(itemId: string, basePrice: number): Promise<number> {
    try {
      // Find the item in MongoDB
      const item = await this.itemModel.findOne({ classId: itemId }).exec();

      if (!item) {
        throw new InvalidItemException(itemId, 'Item not found in database');
      }

      this.logger.debug(`Calculating price for item ${itemId}: ${item.name} (Base: $${basePrice})`);

      let adjustedPrice = basePrice;

      // Apply game-specific adjustments
      switch (item.appId) {
        case 730: // CS:GO/CS2
          adjustedPrice = await this.calculateCSGOItemPrice(item, basePrice);
          break;
        case 570: // Dota 2
          adjustedPrice = await this.calculateDota2ItemPrice(item, basePrice);
          break;
        case 440: // TF2
          adjustedPrice = await this.calculateTF2ItemPrice(item, basePrice);
          break;
        case 252490: // Rust
          adjustedPrice = await this.calculateRustItemPrice(item, basePrice);
          break;
        default:
          // For other games, apply minimal adjustments based on rarity
          adjustedPrice = await this.calculateGenericItemPrice(item, basePrice);
          break;
      }

      this.logger.debug(`Final adjusted price for ${itemId}: $${adjustedPrice}`);

      return Math.max(adjustedPrice, 0); // Ensure price is not negative
    } catch (error) {
      if (error instanceof InvalidItemException) {
        throw error;
      }
      throw new PriceCalculationException(`Failed to calculate price for item ${itemId}: ${error.message}`, itemId);
    }
  }

  /**
   * Calculate CS:GO item price with wear, float, stickers, and pattern adjustments
   */
  private async calculateCSGOItemPrice(item: Item, basePrice: number): Promise<number> {
    let price = basePrice;

    // Apply wear/float multiplier
    if (item.floatValue !== undefined) {
      const wearMultiplier = this.getCSGOFloatMultiplier(item.floatValue, item.wear);
      price *= wearMultiplier;
      this.logger.debug(`Applied float multiplier ${wearMultiplier} for float ${item.floatValue}`);
    }

    // Apply sticker adjustments
    if (item.stickers && item.stickers.length > 0) {
      const stickerValue = this.calculateStickerValue(item.stickers);
      price += stickerValue;
      this.logger.debug(`Added sticker value $${stickerValue} for ${item.stickers.length} stickers`);
    }

    // Apply rare pattern premiums
    if (item.paintSeed) {
      const patternPremium = this.getPatternPremium(item);
      if (patternPremium > 1) {
        price *= patternPremium;
        this.logger.debug(`Applied pattern premium ${patternPremium} for paint seed ${item.paintSeed}`);
      }
    }

    return price;
  }

  /**
   * Calculate Dota 2 item price with gem and inscribed adjustments
   */
  private async calculateDota2ItemPrice(item: Item, basePrice: number): Promise<number> {
    let price = basePrice;

    // Apply gem premiums
    if (item.gems && item.gems.length > 0) {
      const gemValue = this.calculateGemValue(item.gems);
      price += gemValue;
      this.logger.debug(`Added gem value $${gemValue} for ${item.gems.length} gems`);
    }

    // Apply inscribed gem premium
    if (item.inscribedGem) {
      const inscribedValue = this.calculateGemValue([item.inscribedGem]) * 1.5; // 50% premium for inscribed
      price += inscribedValue;
      this.logger.debug(`Added inscribed gem value $${inscribedValue}`);
    }

    // Apply hero popularity multipliers
    if (item.hero) {
      const heroMultiplier = this.getHeroMultiplier(item.hero);
      price *= heroMultiplier;
      this.logger.debug(`Applied hero multiplier ${heroMultiplier} for ${item.hero}`);
    }

    return price;
  }

  /**
   * Calculate TF2 item price with killstreak and unusual effect adjustments
   */
  private async calculateTF2ItemPrice(item: Item, basePrice: number): Promise<number> {
    let price = basePrice;

    // Apply killstreak multiplier
    if (item.killstreak) {
      const killstreakMultiplier = this.getKillstreakMultiplier(item.killstreak);
      price *= killstreakMultiplier;
      this.logger.debug(`Applied killstreak multiplier ${killstreakMultiplier} for ${item.killstreak}`);
    }

    // Apply unusual effect premium (would need effect database)
    if (item.name.includes('Unusual')) {
      price *= 10.0; // Significant premium for unusual effects
      this.logger.debug(`Applied unusual effect premium`);
    }

    return price;
  }

  /**
   * Calculate Rust item price with condition adjustments
   */
  private async calculateRustItemPrice(item: Item, basePrice: number): Promise<number> {
    let price = basePrice;

    // Apply condition multipliers
    if (item.condition) {
      const conditionMultiplier = this.getRustConditionMultiplier(item.condition);
      price *= conditionMultiplier;
      this.logger.debug(`Applied condition multiplier ${conditionMultiplier} for ${item.condition}`);
    }

    return price;
  }

  /**
   * Calculate generic item price based on rarity
   */
  private async calculateGenericItemPrice(item: Item, basePrice: number): Promise<number> {
    let price = basePrice;

    // Apply rarity multiplier
    if (item.rarity) {
      const rarityMultiplier = this.getRarityMultiplier(item.rarity);
      price *= rarityMultiplier;
      this.logger.debug(`Applied rarity multiplier ${rarityMultiplier} for ${item.rarity}`);
    }

    return price;
  }

  /**
   * Get CS:GO float value multiplier based on wear level and float value
   */
  private getCSGOFloatMultiplier(floatValue: number, wear?: string): number {
    // If wear is specified, use it for a rough estimate
    if (wear && this.csgoWearMultipliers[wear]) {
      return this.csgoWearMultipliers[wear].multiplier;
    }

    // Otherwise, use precise float value ranges
    for (const [wearLevel, data] of Object.entries(this.csgoWearMultipliers)) {
      if (floatValue >= data.min && floatValue < data.max) {
        return data.multiplier;
      }
    }

    // Default multiplier for edge cases
    return 1.0;
  }

  /**
   * Calculate total sticker value based on sticker count and positions
   */
  private calculateStickerValue(stickers: any[]): number {
    if (!stickers || stickers.length === 0) {
      return 0;
    }

    let totalValue = 0;

    // Calculate value for each sticker based on position
    stickers.forEach((sticker, index) => {
      const baseValue = this.baseStickerValues[sticker.rarity || 'Common'] || 0.10;
      const positionMultiplier = this.stickerMultipliers[index] || 0.01; // Fallback to 1% for additional stickers

      const stickerValue = baseValue * positionMultiplier;
      totalValue += stickerValue;

      this.logger.debug(`Sticker ${index} (${sticker.name}): $${stickerValue}`);
    });

    return totalValue;
  }

  /**
   * Calculate gem value for Dota 2 items
   */
  private calculateGemValue(gems: any[]): number {
    if (!gems || gems.length === 0) {
      return 0;
    }

    let totalValue = 0;

    gems.forEach((gem, index) => {
      const baseValue = this.baseStickerValues[gem.rarity || 'Common'] || 0.10;
      totalValue += baseValue * 2; // Gems are generally more valuable than stickers
    });

    return totalValue;
  }

  /**
   * Get pattern premium for special paint seeds
   */
  private getPatternPremium(item: Item): number {
    if (!item.paintSeed || !item.paintIndex) {
      return 1.0;
    }

    // This is a simplified pattern detection
    // In a real implementation, you'd have a comprehensive database of rare patterns

    // Case Hardened special patterns (paint index based)
    if (item.wear === 'Factory New' && item.paintIndex < 10) {
      return this.rarePatternPremiums['Blue Gem'] || 3.0;
    }

    // Doppler special phases (paint seed based)
    if (item.name.includes('Doppler') && item.paintSeed < 100) {
      return this.rarePatternPremiums['Ruby'] || 2.5;
    }

    return 1.0; // No premium for common patterns
  }

  /**
   * Get hero popularity multiplier for Dota 2
   */
  private getHeroMultiplier(hero: string): number {
    // Popular heroes get slight premiums
    const popularHeroes = ['Juggernaut', 'Mirana', 'Phantom Assassin', 'Templar Assassin'];
    return popularHeroes.includes(hero) ? 1.1 : 1.0;
  }

  /**
   * Get killstreak multiplier for TF2
   */
  private getKillstreakMultiplier(killstreak: string): number {
    const multipliers = {
      'Basic': 1.2,
      'Specialized': 1.5,
      'Professional': 2.0,
    };

    return multipliers[killstreak] || 1.0;
  }

  /**
   * Get Rust condition multiplier
   */
  private getRustConditionMultiplier(condition: string): number {
    const multipliers = {
      'Poor': 0.7,
      'Worn': 0.85,
      'Good': 1.0,
      'Well worn': 1.15,
      'New': 1.3,
    };

    return multipliers[condition] || 1.0;
  }

  /**
   * Get rarity multiplier for generic items
   */
  private getRarityMultiplier(rarity: string): number {
    const multipliers = {
      'Common': 0.8,
      'Uncommon': 1.0,
      'Rare': 1.2,
      'Mythical': 1.5,
      'Legendary': 2.0,
      'Ancient': 3.0,
    };

    return multipliers[rarity] || 1.0;
  }

  /**
   * Calculate profit margin for a trade
   */
  async calculateProfitMargin(
    itemsToGive: TradeItem[],
    itemsToReceive: TradeItem[]
  ): Promise<ProfitMarginResult> {
    try {
      let totalGiveValue = 0;
      let totalReceiveValue = 0;

      const itemsToGiveDetails = [];
      const itemsToReceiveDetails = [];

      // Calculate total value for items to give
      for (const tradeItem of itemsToGive) {
        const item = await this.itemModel.findOne({ classId: tradeItem.classId }).exec();
        const estimatedValue = tradeItem.estimatedValue || 0;

        totalGiveValue += estimatedValue * tradeItem.amount;

        itemsToGiveDetails.push({
          itemId: tradeItem.itemId,
          name: item?.name || tradeItem.itemName,
          estimatedValue: estimatedValue * tradeItem.amount,
        });
      }

      // Calculate total value for items to receive
      for (const tradeItem of itemsToReceive) {
        const item = await this.itemModel.findOne({ classId: tradeItem.classId }).exec();
        const estimatedValue = tradeItem.estimatedValue || 0;

        totalReceiveValue += estimatedValue * tradeItem.amount;

        itemsToReceiveDetails.push({
          itemId: tradeItem.itemId,
          name: item?.name || tradeItem.itemName,
          estimatedValue: estimatedValue * tradeItem.amount,
        });
      }

      const profitMargin = totalReceiveValue - totalGiveValue;
      const profitPercentage = totalGiveValue > 0 ? (profitMargin / totalGiveValue) * 100 : 0;

      return {
        totalGiveValue,
        totalReceiveValue,
        profitMargin,
        profitPercentage,
        itemsToGiveDetails,
        itemsToReceiveDetails,
      };
    } catch (error) {
      throw new PriceCalculationException(`Failed to calculate profit margin: ${error.message}`);
    }
  }
}