import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeUpdate, ManyToOne, JoinColumn, Index, Generated, Unique } from 'typeorm';
import { User } from '../../../auth/entities/user.entity';
import { Exclude, Expose } from 'class-transformer';

@Entity('referral_codes')
@Index(['userId'])
@Index(['code'], { unique: true })
@Index(['isActive'])
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  @Generated('uuid')
  @Expose()
  id: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  @Expose()
  userId: string;

  @Column({ type: 'varchar', nullable: false })
  @Index()
  @Expose()
  code: string;

  @Column({ type: 'boolean', default: true })
  @Index()
  @Expose()
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  @Expose()
  usageCount: number;

  @Column({ type: 'int', nullable: true })
  @Expose()
  maxUsages: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.00 })
  @Expose()
  bonusPercentage: number;

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
  @JoinColumn({ name: 'userId' })
  @Exclude()
  user: User;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }

  // Computed properties
  get isExpired(): boolean {
    return this.expiresAt !== null && new Date() > this.expiresAt;
  }

  get isExhausted(): boolean {
    return this.maxUsages !== null && this.usageCount >= this.maxUsages;
  }

  get isUsable(): boolean {
    return this.isActive && !this.isExpired && !this.isExhausted;
  }

  // Static method to generate unique referral code
  static generateCode(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}