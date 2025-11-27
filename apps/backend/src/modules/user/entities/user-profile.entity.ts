import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeUpdate, OneToOne, JoinColumn, Index, Generated } from 'typeorm';
import { User } from '../../../auth/entities/user.entity';
import { Exclude, Expose } from 'class-transformer';

@Entity('user_profiles')
@Index(['userId'], { unique: true })
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  @Generated('uuid')
  @Expose()
  id: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  @Expose()
  userId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Expose()
  displayName: string | null;

  @Column({ type: 'text', nullable: true })
  @Expose()
  bio: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  @Expose()
  country: string | null;

  @Column({ type: 'varchar', length: 5, default: 'en' })
  @Expose()
  language: string;

  @Column({ type: 'varchar', nullable: true })
  @Expose()
  timezone: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Expose()
  avatarCustomUrl: string | null;

  @Column({ type: 'boolean', default: true })
  @Expose()
  isProfilePublic: boolean;

  @Column({ type: 'boolean', default: true })
  @Expose()
  showTradeHistory: boolean;

  @Column({ type: 'boolean', default: true })
  @Expose()
  showInventory: boolean;

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