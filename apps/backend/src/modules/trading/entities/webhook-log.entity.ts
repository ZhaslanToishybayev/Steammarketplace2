import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn, BeforeUpdate } from 'typeorm';
import { WebhookSubscription } from './webhook-subscription.entity';
import { Trade } from './trade.entity';

export enum WebhookDeliveryStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending'
}

@Entity('webhook_logs')
@Index(['webhookSubscriptionId'])
@Index(['tradeId'])
@Index(['event'])
@Index(['deliveryStatus'])
@Index(['createdAt'])
export class WebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  webhookSubscriptionId: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  tradeId: string;

  @Column({ type: 'varchar', nullable: false })
  @Index()
  event: string;

  @Column({ type: 'varchar', nullable: false })
  url: string;

  @Column({ type: 'jsonb', nullable: false })
  payload: any;

  @Column({ type: 'int', nullable: true })
  @Index()
  responseStatus: number;

  @Column({ type: 'text', nullable: true })
  responseBody: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'varchar', default: WebhookDeliveryStatus.PENDING })
  @Index()
  deliveryStatus: WebhookDeliveryStatus;

  @Column({ type: 'int', default: 1 })
  attemptNumber: number;

  @Column({ type: 'int', nullable: true })
  @Index()
  responseTime: number;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => WebhookSubscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'webhookSubscriptionId' })
  webhookSubscription: WebhookSubscription;

  @ManyToOne(() => Trade, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tradeId' })
  trade: Trade;

  @BeforeUpdate()
  updateTimestamp() {
    // WebhookLog doesn't need updatedAt since we track createdAt and deliveredAt
  }
}