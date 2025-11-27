import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity('inventories')
export class Inventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  steamId: string;

  @Column()
  appId: number; // 730 for CS2, 570 for DOTA 2, etc.

  @Column()
  contextId: number; // Usually 2 for main inventory

  @Column()
  assetId: string; // Steam asset ID

  @Column()
  classId: string; // Steam class ID

  @Column()
  instanceId: string; // Steam instance ID

  @Column()
  amount: number; // Quantity of this item

  @Column({ nullable: true })
  marketName: string; // Item name from Steam market

  @Column({ nullable: true })
  marketHashName: string; // Market hash name for API calls

  @Column({ nullable: true })
  iconUrl: string; // Item icon URL

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  steamPrice: number; // Current Steam market price

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  suggestedPrice: number; // Suggested selling price

  @Column({ default: false })
  tradable: boolean;

  @Column({ default: false })
  marketable: boolean;

  @Column({ default: true })
  active: boolean; // Whether item is currently in inventory

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'steamId', referencedColumnName: 'steamId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}