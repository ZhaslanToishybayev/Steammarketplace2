import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeUpdate, ManyToOne, JoinColumn, Index, Generated, Check } from 'typeorm';
import { User } from '../../../auth/entities/user.entity';
import { Trade } from '../../../trading/entities/trade.entity';
import { Referral } from './referral.entity';
import { Exclude, Expose } from 'class-transformer';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRADE_CREDIT = 'trade_credit',
  TRADE_DEBIT = 'trade_debit',
  REFERRAL_BONUS = 'referral_bonus',
  ADMIN_ADJUSTMENT = 'admin_adjustment',
  ADMIN_DEBIT = 'admin_debit',
  REFUND = 'refund',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('transactions')
@Index(['userId'])
@Index(['type'])
@Index(['status'])
@Index(['externalTransactionId'])
@Index(['tradeId'])
@Index(['createdAt'])
@Index(['userId', 'status', 'createdAt']) // For paginated transaction history
@Index(['type', 'status', 'createdAt']) // For transaction type analytics
@Index(['externalTransactionId', 'status']) // For webhook processing
@Index(['tradeId', 'type']) // For trade-related transactions
@Index(['status', 'processedAt']) // For processing monitoring
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  @Generated('uuid')
  @Expose()
  id: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  @Expose()
  userId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.DEPOSIT,
  })
  @Index()
  @Expose()
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  @Index()
  @Expose()
  status: TransactionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @Expose()
  amount: number;

  @Column({ type: 'varchar', default: 'USD' })
  @Expose()
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @Expose()
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @Expose()
  balanceAfter: number;

  @Column({ type: 'text', nullable: true })
  @Expose()
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Expose()
  paymentMethod: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Expose()
  paymentProvider: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  @Expose()
  externalTransactionId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  @Expose()
  metadata: Record<string, any> | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  @Expose()
  tradeId: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  @Expose()
  referralId: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Expose()
  processedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  processedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  @Expose()
  failureReason: string | null;

  @CreateDateColumn()
  @Expose()
  createdAt: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  @Exclude()
  user: User;

  @ManyToOne(() => Trade, { onDelete: 'SET_NULL' })
  @JoinColumn({ name: 'tradeId' })
  @Exclude()
  trade: Trade | null;

  @ManyToOne(() => Referral, { onDelete: 'SET_NULL' })
  @JoinColumn({ name: 'referralId' })
  @Exclude()
  referral: Referral | null;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }

  // Computed properties
  get isCredit(): boolean {
    return [
      TransactionType.DEPOSIT,
      TransactionType.TRADE_CREDIT,
      TransactionType.REFERRAL_BONUS,
      TransactionType.ADMIN_ADJUSTMENT,
      TransactionType.REFUND,
    ].includes(this.type);
  }

  get isDebit(): boolean {
    return [
      TransactionType.WITHDRAWAL,
      TransactionType.TRADE_DEBIT,
      TransactionType.ADMIN_DEBIT,
    ].includes(this.type);
  }

  get isCompleted(): boolean {
    return this.status === TransactionStatus.COMPLETED;
  }

  get isPending(): boolean {
    return this.status === TransactionStatus.PENDING;
  }

  get isFailed(): boolean {
    return this.status === TransactionStatus.FAILED;
  }
}