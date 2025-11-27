import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeUpdate, OneToOne, JoinColumn, Index, Generated } from 'typeorm';
import { User } from '../../../auth/entities/user.entity';
import { Exclude, Expose } from 'class-transformer';

@Entity('user_notification_preferences')
@Index(['userId'], { unique: true })
export class UserNotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  @Generated('uuid')
  @Expose()
  id: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  @Expose()
  userId: string;

  @Column({ type: 'boolean', default: true })
  @Expose()
  notifyOnTradeAccepted: boolean;

  @Column({ type: 'boolean', default: true })
  @Expose()
  notifyOnTradeDeclined: boolean;

  @Column({ type: 'boolean', default: true })
  @Expose()
  notifyOnTradeCompleted: boolean;

  @Column({ type: 'boolean', default: true })
  @Expose()
  notifyOnDeposit: boolean;

  @Column({ type: 'boolean', default: true })
  @Expose()
  notifyOnWithdrawal: boolean;

  @Column({ type: 'boolean', default: true })
  @Expose()
  notifyOnReferralBonus: boolean;

  @Column({ type: 'boolean', default: false })
  @Expose()
  notifyOnPriceChange: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.0 })
  @Expose()
  priceChangeThreshold: number;

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
}