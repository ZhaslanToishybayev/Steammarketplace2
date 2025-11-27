import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, BeforeUpdate } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('webhook_subscriptions')
@Index(['userId'])
@Index(['isActive'])
@Index(['url'])
export class WebhookSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  userId: string;

  @Column({ type: 'varchar', nullable: false })
  url: string;

  @Column({ type: 'jsonb', nullable: false })
  events: string[];

  @Column({ type: 'varchar', nullable: true })
  secret: string;

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastTriggeredAt: Date;

  @Column({ type: 'int', default: 0 })
  totalDeliveries: number;

  @Column({ type: 'int', default: 0 })
  failedDeliveries: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}