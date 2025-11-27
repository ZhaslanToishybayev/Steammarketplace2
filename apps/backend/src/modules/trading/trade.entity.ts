import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Inventory } from '../inventory/inventory.entity';

export enum TradeStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum TradeType {
  OFFER = 'offer',
  REQUEST = 'request'
}

@Entity('trades')
export class Trade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  tradeId: string; // Steam trade offer ID

  @Column()
  senderSteamId: string;

  @Column()
  recipientSteamId: string;

  @Column({ type: 'enum', enum: TradeType })
  type: TradeType;

  @Column({ type: 'enum', enum: TradeStatus })
  status: TradeStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  offeredAmount: number; // Money offered

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  requestedAmount: number; // Money requested

  @Column({ nullable: true })
  offeredItemId: number; // Inventory item ID offered

  @Column({ nullable: true })
  requestedItemId: number; // Inventory item requested

  @Column({ nullable: true })
  steamTradeOfferId: string; // Steam's trade offer ID

  @Column({ nullable: true })
  message: string; // Trade offer message

  @Column({ default: false })
  senderConfirmed: boolean;

  @Column({ default: false })
  recipientConfirmed: boolean;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true })
  cancelledBy: string; // Steam ID of who cancelled

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  serviceFee: number; // Platform service fee

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalAmount: number; // Total amount including fee

  @Column({ nullable: true })
  errorMessage: string; // Error message if trade failed

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderSteamId', referencedColumnName: 'steamId' })
  sender: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipientSteamId', referencedColumnName: 'steamId' })
  recipient: User;

  @ManyToOne(() => Inventory, { nullable: true })
  @JoinColumn({ name: 'offeredItemId' })
  offeredItem: Inventory;

  @ManyToOne(() => Inventory, { nullable: true })
  @JoinColumn({ name: 'requestedItemId' })
  requestedItem: Inventory;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}