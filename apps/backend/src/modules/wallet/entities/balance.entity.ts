import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeUpdate, OneToOne, JoinColumn, Index, Generated } from 'typeorm';
import { User } from '../../../auth/entities/user.entity';
import { Exclude, Expose } from 'class-transformer';

@Entity('balances')
@Index(['userId'], { unique: true })
@Index(['currency'])
export class Balance {
  @PrimaryGeneratedColumn('uuid')
  @Generated('uuid')
  @Expose()
  id: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  @Expose()
  userId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  @Expose()
  amount: number;

  @Column({ type: 'varchar', default: 'USD' })
  @Index()
  @Expose()
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  @Expose()
  lockedAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  @Expose()
  totalDeposited: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  @Expose()
  totalWithdrawn: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  @Expose()
  totalEarned: number;

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  lastTransactionAt: Date | null;

  @CreateDateColumn()
  @Expose()
  createdAt: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt: Date;

  // Relations
  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  @Exclude()
  user: User;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }

  // Computed properties
  get availableAmount(): number {
    return this.amount - this.lockedAmount;
  }

  get isLocked(): boolean {
    return this.lockedAmount > 0;
  }
}