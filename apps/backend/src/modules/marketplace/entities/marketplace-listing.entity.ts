import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';

export enum ListingStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PENDING_VERIFICATION = 'pending_verification',
  SUSPENDED = 'suspended'
}

export enum ListingType {
  FIXED_PRICE = 'fixed_price',
  AUCTION = 'auction',
  OFFER = 'offer'
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  RUB = 'RUB'
}

@Entity('marketplace_listings')
@Index(['itemId', 'status'])
@Index(['sellerId', 'status'])
@Index(['price'])
@Index(['createdAt'])
@Index(['type', 'status'])
export class MarketplaceListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  itemId: string;

  @Column({ type: 'varchar', length: 255 })
  itemName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  itemDescription: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  itemClassId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  itemInstanceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  itemImage: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  itemType: string;

  @Column({ type: 'varchar', length: 100 })
  itemRarity: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  itemQuality: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @Index()
  price: number;

  @Column({ type: 'enum', enum: Currency, default: Currency.USD })
  currency: Currency;

  @Column({ type: 'enum', enum: ListingType })
  @Index()
  type: ListingType;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.ACTIVE })
  @Index()
  status: ListingStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  startingPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  reservePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  buyoutPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  currentBid: number;

  @Column({ type: 'int', default: 0 })
  bidCount: number;

  @Column({ nullable: true })
  @Index()
  auctionEndsAt: Date;

  @Column({ nullable: true })
  soldAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true })
  cancelledBy: string; // 'seller', 'admin', 'fraud'

  @Column({ nullable: true })
  cancelledReason: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platformFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sellerReceive: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  steamValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  marketValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ourValue: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  platformCommissionRate: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  featured: boolean;

  @Column({ default: false })
  verified: boolean;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  favoriteCount: number;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ type: 'jsonb', default: [] })
  attributes: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  media: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
    order: number;
  }>;

  @Column({ type: 'jsonb', default: [] })
  history: Array<{
    action: 'created' | 'updated' | 'sold' | 'cancelled' | 'expired';
    timestamp: Date;
    price?: number;
    details?: any;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  isDigital: boolean;

  @Column({ nullable: true })
  condition: string; // 'Factory New', 'Minimal Wear', etc.

  @Column({ nullable: true })
  wearRating: number; // 0.0 to 1.0 for wear float

  @Column({ default: false })
  autoRenew: boolean;

  @Column({ nullable: true })
  renewalCount: number;

  @Column({ default: false })
  instantSale: boolean;

  @Column({ default: false })
  allowOffers: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  minOffer: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxOffer: number;

  @Column()
  @Index()
  sellerId: string;

  @Column({ nullable: true })
  buyerId: string;

  @Column({ nullable: true })
  winnerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'winnerId' })
  winner: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId: string; // For external marketplace integration

  @Column({ type: 'varchar', length: 50, nullable: true })
  externalSource: string; // 'steam_market', 'third_party', etc.

  @Column({ type: 'jsonb', nullable: true })
  externalData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields for convenience
  get isActive(): boolean {
    return this.status === ListingStatus.ACTIVE;
  }

  get isAuction(): boolean {
    return this.type === ListingType.AUCTION;
  }

  get isFixedPrice(): boolean {
    return this.type === ListingType.FIXED_PRICE;
  }

  get isExpired(): boolean {
    return this.auctionEndsAt ? new Date() > this.auctionEndsAt : false;
  }

  get timeLeft(): number {
    if (!this.auctionEndsAt) return 0;
    return Math.max(0, this.auctionEndsAt.getTime() - Date.now());
  }

  get canBeBought(): boolean {
    return this.isFixedPrice && this.isActive && this.buyoutPrice > 0;
  }

  get canBeBidOn(): boolean {
    return this.isAuction && this.isActive && !this.isExpired;
  }

  @BeforeInsert()
  setDefaults() {
    if (this.type === ListingType.AUCTION && !this.auctionEndsAt) {
      this.auctionEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }

    // Add creation to history
    this.history = [{
      action: 'created',
      timestamp: new Date(),
      price: this.price
    }];
  }

  @BeforeUpdate()
  updateHistory() {
    if (this.updatedAt) {
      this.history.push({
        action: 'updated',
        timestamp: new Date(),
        price: this.price
      });
    }
  }

  // Helper methods for price calculations
  calculateFees(): { platformFee: number; sellerReceive: number } {
    const fee = this.price * (this.platformCommissionRate / 100);
    const sellerReceive = this.price - fee;

    return {
      platformFee: Math.round(fee * 100) / 100,
      sellerReceive: Math.round(sellerReceive * 100) / 100
    };
  }

  updatePrice(newPrice: number): void {
    this.price = newPrice;
    const { platformFee, sellerReceive } = this.calculateFees();
    this.platformFee = platformFee;
    this.sellerReceive = sellerReceive;
  }

  markAsSold(buyerId: string): void {
    this.status = ListingStatus.SOLD;
    this.buyerId = buyerId;
    this.soldAt = new Date();
    this.history.push({
      action: 'sold',
      timestamp: new Date(),
      price: this.price,
      details: { buyerId }
    });
  }

  cancel(reason: string, cancelledBy: string = 'seller'): void {
    this.status = ListingStatus.CANCELLED;
    this.cancelledAt = new Date();
    this.cancelledBy = cancelledBy;
    this.cancelledReason = reason;
    this.history.push({
      action: 'cancelled',
      timestamp: new Date(),
      details: { reason, cancelledBy }
    });
  }
}