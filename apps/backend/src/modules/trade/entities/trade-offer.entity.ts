import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { InventoryItem } from '../../inventory/entities/inventory-item.entity';

export enum TradeStatus {
  PENDING = 'pending',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  CANCELLED_BY_PARTNER = 'cancelled_by_partner',
  CANCELLED_BY_STEAM = 'cancelled_by_steam',
  IN_ESCROW = 'in_escrow',
  INVALID = 'invalid'
}

export enum TradeType {
  OFFER = 'offer',
  COUNTER_OFFER = 'counter_offer',
  MARKETPLACE = 'marketplace'
}

@Entity('trade_offers')
@Index(['steamTradeId'], { unique: true })
@Index(['senderId', 'status'])
@Index(['targetSteamId', 'status'])
@Index(['createdAt'])
export class TradeOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  steamTradeId: string;

  @Column()
  @Index()
  senderId: string;

  @Column()
  @Index()
  targetSteamId: string;

  @Column({ nullable: true })
  targetUsername: string;

  @Column({ nullable: true })
  targetAvatar: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  offeredValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  receivedValue: number;

  @Column({ type: 'jsonb', default: [] })
  offeredItems: Array<{
    assetId: string;
    classId: string;
    instanceId: string;
    amount: number;
    name: string;
    imageUrl: string;
    steamValue: number;
  }>;

  @Column({ type: 'jsonb', default: [] })
  receivedItems: Array<{
    assetId?: string;
    classId: string;
    instanceId: string;
    amount: number;
    name: string;
    imageUrl: string;
    steamValue: number;
    marketValue?: number;
    ourPrice?: number;
  }>;

  @Column({ type: 'enum', enum: TradeStatus, default: TradeStatus.PENDING })
  @Index()
  status: TradeStatus;

  @Column({ type: 'enum', enum: TradeType, default: TradeType.OFFER })
  type: TradeType;

  @Column({ nullable: true })
  message: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commissionFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalPrice: number;

  @Column({ default: false })
  isCounterOffer: boolean;

  @Column({ nullable: true })
  parentTradeId: string;

  @Column({ type: 'jsonb', nullable: true })
  steamResponse: any;

  @Column({ nullable: true })
  @Index()
  error: string;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  acceptedAt: Date;

  @Column({ nullable: true })
  declinedAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true })
  cancelledBy: string; // 'sender', 'receiver', 'steam'

  @Column({ nullable: true })
  escrowEndsAt: Date;

  @Column({ type: 'jsonb', default: [] })
  events: Array<{
    status: TradeStatus;
    timestamp: Date;
    actor: string; // 'user', 'steam', 'system'
    details?: any;
  }>;

  @Column({ default: false })
  notificationSent: boolean;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ default: false })
  isDisputed: boolean;

  @Column({ nullable: true })
  disputeReason: string;

  @Column({ nullable: true })
  disputeResolvedAt: Date;

  @Column({ nullable: true })
  disputeResolution: string;

  @ManyToOne(() => User, user => user.sentTrades)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => InventoryItem, { nullable: true })
  @JoinColumn({ name: 'listingId' })
  listing: InventoryItem;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields for convenience
  get isActive(): boolean {
    return this.status === TradeStatus.PENDING || this.status === TradeStatus.SENT;
  }

  get isFinalized(): boolean {
    return [
      TradeStatus.ACCEPTED,
      TradeStatus.DECLINED,
      TradeStatus.CANCELLED,
      TradeStatus.EXPIRED,
      TradeStatus.CANCELLED_BY_PARTNER,
      TradeStatus.CANCELLED_BY_STEAM
    ].includes(this.status);
  }

  get canBeCancelled(): boolean {
    return this.isActive && this.steamTradeId && this.status !== TradeStatus.SENT;
  }

  @BeforeInsert()
  setDefaults() {
    if (!this.expiresAt) {
      this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }
  }

  @BeforeUpdate()
  updateTimestamps() {
    const now = new Date();

    switch (this.status) {
      case TradeStatus.ACCEPTED:
        this.acceptedAt = this.acceptedAt || now;
        this.isCompleted = true;
        break;
      case TradeStatus.DECLINED:
        this.declinedAt = this.declinedAt || now;
        break;
      case TradeStatus.CANCELLED:
      case TradeStatus.CANCELLED_BY_PARTNER:
      case TradeStatus.CANCELLED_BY_STEAM:
        this.cancelledAt = this.cancelledAt || now;
        this.isCompleted = true;
        break;
      case TradeStatus.EXPIRED:
        this.isCompleted = true;
        break;
    }
  }
}