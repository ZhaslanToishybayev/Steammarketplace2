import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '../../auth/entities/user.entity';
import { Trade } from '../../trading/entities/trade.entity';

export enum DisputeStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum DisputePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum DisputeCategory {
  SCAM = 'SCAM',
  ITEM_NOT_RECEIVED = 'ITEM_NOT_RECEIVED',
  WRONG_ITEM = 'WRONG_ITEM',
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  OTHER = 'OTHER',
}

export enum ResolutionType {
  REFUND = 'REFUND',
  CANCEL = 'CANCEL',
  FORCE_COMPLETE = 'FORCE_COMPLETE',
  NO_ACTION = 'NO_ACTION',
}

@Entity('trade_disputes')
@Index(['tradeId'], { unique: true })
@Index(['status'])
@Index(['priority'])
@Index(['assignedAdminId'])
@Index(['createdAt'])
export class TradeDispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tradeId: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  reportedBy: string;

  @Column('uuid', { nullable: true })
  assignedAdminId: string;

  @Column('enum', { enum: DisputeStatus })
  status: DisputeStatus;

  @Column('enum', { enum: DisputePriority })
  priority: DisputePriority;

  @Column('enum', { enum: DisputeCategory })
  category: DisputeCategory;

  @Column('text')
  reason: string;

  @Column('jsonb', { nullable: true })
  evidence: string[];

  @Column('text', { nullable: true })
  adminNotes: string;

  @Column('text', { nullable: true })
  resolution: string;

  @Column('enum', { enum: ResolutionType, nullable: true })
  resolutionType: ResolutionType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  resolvedAt: Date;

  // Relations
  @ManyToOne(() => Trade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tradeId' })
  @Exclude()
  trade?: Trade;

  @ManyToOne(() => User, { onDelete: 'CASCADE', createJoinColumn: false })
  @JoinColumn({ name: 'reportedBy' })
  @Exclude()
  reporter?: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', createJoinColumn: false })
  @JoinColumn({ name: 'assignedAdminId' })
  @Exclude()
  assignedAdmin?: User;
}