import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeUpdate, OneToOne, JoinColumn, Index, Generated } from 'typeorm';
import { User } from '../../../auth/entities/user.entity';
import { Exclude, Expose } from 'class-transformer';

@Entity('user_settings')
@Index(['userId'], { unique: true })
export class UserSettings {
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
  emailNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  @Expose()
  pushNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  @Expose()
  tradeNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  @Expose()
  priceAlertNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  @Expose()
  marketingEmails: boolean;

  @Column({ type: 'boolean', default: false })
  @Expose()
  twoFactorEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  @Expose()
  autoAcceptTrades: boolean;

  @Column({ type: 'varchar', default: 'USD' })
  @Expose()
  preferredCurrency: string;

  @Column({ type: 'varchar', default: 'auto' })
  @Expose()
  theme: string;

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