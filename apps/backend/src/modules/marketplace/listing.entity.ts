import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Inventory } from '../inventory/inventory.entity';

export enum ListingStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PENDING = 'pending'
}

export enum ListingType {
  FIXED_PRICE = 'fixed_price',
  AUCTION = 'auction',
  OFFER = 'offer'
}

@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  listingId: string;

  @Column()
  sellerSteamId: string;

  @Column()
  inventoryItemId: number;

  @Column({ type: 'enum', enum: ListingType })
  type: ListingType;

  @Column({ type: 'enum', enum: ListingStatus })
  status: ListingStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  startingPrice: number; // For auctions

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  reservePrice: number; // Minimum price for auctions

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  buyoutPrice: number; // Instant buy price

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  currentBid: number; // Highest bid for auctions

  @Column({ nullable: true })
  highestBidderSteamId: string; // For auctions

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 }) // 5% fee
  serviceFeePercent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  serviceFeeAmount: number;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  condition: string; // For items with condition

  @Column({ type: 'text', nullable: true })
  images: string; // JSON array of image URLs

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  soldAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true })
  cancelledBy: string;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  bidCount: number; // For auctions

  @Column({ default: false })
  featured: boolean; // Promoted listing

  @Column({ default: false })
  verified: boolean; // Verified by admin

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerSteamId', referencedColumnName: 'steamId' })
  seller: User;

  @ManyToOne(() => Inventory)
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: Inventory;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}