import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('inventory_items')
@Index(['userId', 'appId', 'contextId'])
@Index(['userId', 'selected'])
@Index(['assetId', 'userId'], { unique: true })
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  assetId: string;

  @Column({ type: 'int' })
  appId: number;

  @Column({ type: 'int' })
  contextId: number;

  @Column()
  classId: string;

  @Column()
  instanceId: string;

  @Column({ type: 'int' })
  amount: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  type: string;

  @Column({ nullable: true })
  rarity: string;

  @Column({ nullable: true })
  quality: string;

  @Column({ default: false })
  tradable: boolean;

  @Column({ default: false })
  marketable: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  marketHashName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  steamValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  marketValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ourPrice: number;

  @Column({ default: false })
  listed: boolean;

  @Column({ default: false })
  selected: boolean;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, user => user.inventoryItems)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}