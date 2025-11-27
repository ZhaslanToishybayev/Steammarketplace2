import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, OneToMany, BeforeUpdate } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Bot } from './bot.entity';
import { TradeItem } from './trade-item.entity';

export enum TradeType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  P2P = 'p2p'
}

export enum TradeStatus {
  PENDING = 'pending',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export enum TradeDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing'
}

@Entity('trades')
@Index(['tradeOfferId'])
@Index(['userId'])
@Index(['botId'])
@Index(['status'])
@Index(['type'])
@Index(['hasEscrow'])
@Index(['createdAt'])
@Index(['userId', 'status', 'createdAt']) // For user trade history with sorting
@Index(['botId', 'status']) // For bot monitoring active trades
@Index(['status', 'expiresAt']) // For background cleanup of expired trades
@Index(['type', 'status', 'createdAt']) // For trade type analytics
@Index(['hasEscrow', 'status']) // For escrow trade tracking
export class Trade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  @Index()
  tradeOfferId: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  botId: string;

  @Column({ type: 'varchar', nullable: false, default: TradeType.DEPOSIT })
  @Index()
  type: TradeType;

  @Column({ type: 'varchar', nullable: false, default: TradeStatus.PENDING })
  @Index()
  status: TradeStatus;

  @Column({ type: 'varchar', nullable: false, default: TradeDirection.OUTGOING })
  direction: TradeDirection;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'varchar', nullable: false })
  userTradeUrl: string;

  @Column({ type: 'jsonb', nullable: false, default: [] })
  itemsToGive: any[];

  @Column({ type: 'jsonb', nullable: false, default: [] })
  itemsToReceive: any[];

  @Column({ type: 'int', nullable: false, default: 0 })
  totalItemsToGive: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  totalItemsToReceive: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  escrowDays: number;

  @Column({ type: 'boolean', nullable: false, default: false })
  @Index()
  hasEscrow: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', nullable: false, default: 0 })
  retryCount: number;

  @Column({ type: 'int', nullable: false, default: 3 })
  maxRetries: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Bot, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'botId' })
  bot: Bot;

  @OneToMany(() => TradeItem, tradeItem => tradeItem.trade, { cascade: true })
  items: TradeItem[];

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}