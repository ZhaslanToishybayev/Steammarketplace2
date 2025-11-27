import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, BeforeUpdate, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Trade } from './trade.entity';

export enum BotStatus {
  IDLE = 'idle',
  TRADING = 'trading',
  OFFLINE = 'offline',
  ERROR = 'error'
}

@Entity('bots')
@Index(['steamId'])
@Index(['accountName'])
@Index(['isActive'])
@Index(['isOnline'])
@Index(['isBusy'])
@Index(['status'])
export class Bot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  @Index()
  steamId: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  accountName: string;

  @Column({ type: 'varchar', nullable: false })
  @Exclude()
  password: string;

  @Column({ type: 'varchar', nullable: false })
  @Exclude()
  sharedSecret: string;

  @Column({ type: 'varchar', nullable: false })
  @Exclude()
  identitySecret: string;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  steamGuardCode: string;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  apiKey: string;

  @Column({ type: 'varchar', nullable: true })
  tradeUrl: string;

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  @Index()
  isOnline: boolean;

  @Column({ type: 'boolean', default: false })
  @Index()
  isBusy: boolean;

  @Column({ type: 'integer', default: 5 })
  maxConcurrentTrades: number;

  @Column({ type: 'integer', default: 0 })
  currentTradeCount: number;

  @Column({ type: 'integer', default: 0 })
  totalTradesCompleted: number;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastTradeAt: Date;

  @Column({ type: 'varchar', default: BotStatus.IDLE })
  @Index()
  status: BotStatus;

  @Column({ type: 'text', nullable: true })
  statusMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Trade, trade => trade.bot)
  trades: Trade[];

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}