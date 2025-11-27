import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, BeforeUpdate } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  FAILED = 'failed'
}

@Entity('inventory')
@Index(['userId', 'appId'])
@Index(['assetId'])
@Index(['syncStatus'])
@Index(['lastSyncedAt'])
@Index(['userId', 'appId', 'tradable']) // For filtering tradable items by game
@Index(['userId', 'syncStatus', 'lastSyncedAt']) // For sync operations
@Index(['assetId', 'userId']) // For fast lookup of specific items
@Index(['appId', 'marketable', 'tradable']) // For market listings
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  userId: string;

  @Column({ type: 'varchar', nullable: false })
  itemId: string;

  @Column({ type: 'varchar', nullable: false })
  @Index()
  assetId: string;

  @Column({ type: 'varchar', nullable: false })
  @Index()
  classId: string;

  @Column({ type: 'varchar', nullable: false })
  @Index()
  instanceId: string;

  @Column({ type: 'int', nullable: false })
  @Index()
  appId: number;

  @Column({ type: 'varchar', nullable: false, default: '2' })
  contextId: string;

  @Column({ type: 'int', nullable: false, default: 1 })
  amount: number;

  @Column({ type: 'boolean', nullable: false, default: true })
  tradable: boolean;

  @Column({ type: 'boolean', nullable: false, default: true })
  marketable: boolean;

  @Column({ type: 'boolean', nullable: false, default: false })
  commodity: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date;

  @Column({ type: 'varchar', nullable: false, default: SyncStatus.SYNCED })
  @Index()
  syncStatus: SyncStatus;

  @Column({ type: 'text', nullable: true })
  syncError: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}