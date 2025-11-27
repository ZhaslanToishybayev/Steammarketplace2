import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, BeforeUpdate } from 'typeorm';
import { Trade } from './trade.entity';
import { Inventory } from '../../inventory/entities/inventory.entity';

@Entity('trade_items')
@Index(['tradeId'])
@Index(['inventoryId'])
@Index(['assetId'])
@Index(['appId'])
@Index(['direction'])
export class TradeItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  tradeId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  inventoryId: string;

  @Column({ type: 'varchar', nullable: false })
  @Index()
  assetId: string;

  @Column({ type: 'varchar', nullable: false })
  @Index()
  classId: string;

  @Column({ type: 'varchar', nullable: false })
  instanceId: string;

  @Column({ type: 'int', nullable: false })
  @Index()
  appId: number;

  @Column({ type: 'varchar', nullable: false, default: '2' })
  contextId: string;

  @Column({ type: 'int', nullable: false, default: 1 })
  amount: number;

  @Column({ type: 'varchar', nullable: false })
  @Index()
  direction: 'give' | 'receive';

  @Column({ type: 'varchar', nullable: false })
  itemName: string;

  @Column({ type: 'varchar', nullable: true })
  itemMarketName: string;

  @Column({ type: 'varchar', nullable: true })
  itemIconUrl: string;

  @Column({ type: 'varchar', nullable: true })
  itemRarity: string;

  @Column({ type: 'varchar', nullable: true })
  itemType: string;

  @Column({ type: 'decimal', nullable: true, precision: 10, scale: 2 })
  estimatedValue: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Trade, trade => trade.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tradeId' })
  trade: Trade;

  @ManyToOne(() => Inventory, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'inventoryId' })
  inventory: Inventory;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}