import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeUpdate, ManyToOne, JoinColumn, Index, Generated, Check } from 'typeorm';
import { User } from '../../../auth/entities/user.entity';
import { ReferralCode } from './referral-code.entity';
import { Exclude, Expose } from 'class-transformer';

export enum ReferralStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

@Entity('referrals')
@Index(['referrerId'])
@Index(['refereeId'], { unique: true }) // One user can be referred only once
@Index(['referralCodeId'])
@Index(['status'])
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  @Generated('uuid')
  @Expose()
  id: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  @Expose()
  referrerId: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  @Expose()
  refereeId: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  @Expose()
  referralCodeId: string;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  @Index()
  @Expose()
  status: ReferralStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  @Expose()
  bonusAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  @Expose()
  refereeBonusAmount: number;

  @Column({ type: 'boolean', default: false })
  @Expose()
  bonusPaid: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  bonusPaidAt: Date | null;

  @Column({ type: 'boolean', default: false })
  @Expose()
  requirementsMet: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  requirementsMetAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  @Expose()
  metadata: Record<string, any> | null;

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  expiresAt: Date | null;

  @CreateDateColumn()
  @Expose()
  createdAt: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrerId' })
  @Exclude()
  referrer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'refereeId' })
  @Exclude()
  referee: User;

  @ManyToOne(() => ReferralCode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referralCodeId' })
  @Exclude()
  referralCode: ReferralCode;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }

  // Computed properties
  get isEligibleForBonus(): boolean {
    return this.status === ReferralStatus.ACTIVE && this.requirementsMet && !this.bonusPaid;
  }

  get canExpire(): boolean {
    return this.expiresAt !== null;
  }

  get isExpired(): boolean {
    return this.status === ReferralStatus.EXPIRED ||
           (this.canExpire && this.expiresAt && new Date() > this.expiresAt);
  }
}