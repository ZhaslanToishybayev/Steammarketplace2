import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum PriceSource {
  STEAM_MARKET = 'steam_market',
  THIRD_PARTY = 'third_party',
  INTERNAL_SALE = 'internal_sale',
  ESTIMATED = 'estimated'
}

export enum PriceType {
  LISTED = 'listed',
  SOLD = 'sold',
  AVERAGE = 'average',
  MEDIAN = 'median',
  LOWEST = 'lowest',
  HIGHEST = 'highest'
}

@Entity('price_history')
@Index(['itemClassId', 'createdAt'])
@Index(['itemClassId', 'source'])
@Index(['source', 'type'])
@Index(['timestamp'])
export class PriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  itemClassId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  itemInstanceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  itemName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  itemType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  itemRarity: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  itemQuality: string;

  @Column({ type: 'enum', enum: PriceSource })
  @Index()
  source: PriceSource;

  @Column({ type: 'enum', enum: PriceType })
  @Index()
  type: PriceType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  volume: number; // Total value (price * quantity)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  changePercent: number; // Percentage change from previous price

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  changeAmount: number; // Absolute change from previous price

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  movingAverage7d: number; // 7-day moving average

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  movingAverage30d: number; // 30-day moving average

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  bollingerUpper: number; // Bollinger Bands upper

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  bollingerLower: number; // Bollinger Bands lower

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  rsi: number; // Relative Strength Index

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  volatility: number; // Price volatility measure

  @Column({ type: 'int', default: 0 })
  tradeCount: number; // Number of trades at this price

  @Column({ type: 'int', default: 0 })
  viewCount: number; // Number of views at this price

  @Column({ type: 'int', default: 0 })
  wishlistCount: number; // Number of wishlist adds

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  steamMarketPrice: number; // Steam's official market price

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  externalMarketPrice: number; // Third-party market price

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ourEstimatedPrice: number; // Our AI-estimated price

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore: number; // Confidence in price accuracy (0-100)

  @Column({ type: 'varchar', length: 255, nullable: true })
  currency: string; // Currency code (USD, EUR, etc.)

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  conversionRate: number; // Conversion rate to base currency

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Additional price context

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string; // Price notes or explanations

  @Column({ type: 'varchar', length: 255, nullable: true })
  region: string; // Geographic region for price

  @Column({ type: 'varchar', length: 255, nullable: true })
  appId: string; // Steam App ID

  @Column({ type: 'varchar', length: 255, nullable: true })
  contextId: string; // Steam Context ID

  @Column({ nullable: true })
  @Index()
  timestamp: Date; // Time when price was recorded

  @CreateDateColumn()
  createdAt: Date;

  // Virtual fields for convenience
  get isSteamMarket(): boolean {
    return this.source === PriceSource.STEAM_MARKET;
  }

  get isThirdParty(): boolean {
    return this.source === PriceSource.THIRD_PARTY;
  }

  get isInternal(): boolean {
    return this.source === PriceSource.INTERNAL_SALE;
  }

  get isEstimated(): boolean {
    return this.source === PriceSource.ESTIMATED;
  }

  get isListed(): boolean {
    return this.type === PriceType.LISTED;
  }

  get isSold(): boolean {
    return this.type === PriceType.SOLD;
  }

  // Helper methods
  calculateVolume(): number {
    return this.price * this.quantity;
  }

  updateCalculatedFields(): void {
    this.volume = this.calculateVolume();
    this.timestamp = this.timestamp || this.createdAt;
  }

  static createPriceHistory(
    itemClassId: string,
    price: number,
    source: PriceSource,
    type: PriceType,
    options: Partial<PriceHistory> = {}
  ): PriceHistory {
    const priceHistory = new PriceHistory();
    priceHistory.itemClassId = itemClassId;
    priceHistory.price = price;
    priceHistory.source = source;
    priceHistory.type = type;
    priceHistory.quantity = options.quantity || 1;
    priceHistory.volume = priceHistory.calculateVolume();
    priceHistory.timestamp = options.timestamp || new Date();
    priceHistory.currency = options.currency || 'USD';
    priceHistory.appId = options.appId || '730'; // Default to CS:GO
    priceHistory.contextId = options.contextId || '2'; // Default context
    priceHistory.metadata = options.metadata || {};
    priceHistory.notes = options.notes;

    return priceHistory;
  }
}