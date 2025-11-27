import { Entity, PrimaryGeneratedColumn, CreateDateColumn, Index, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { User } from '../../auth/entities/user.entity';

export enum AuditTargetType {
  USER = 'USER',
  TRADE = 'TRADE',
  BOT = 'BOT',
  CONFIG = 'CONFIG',
  TRANSACTION = 'TRANSACTION',
  DISPUTE = 'DISPUTE',
}

@Entity('audit_logs')
@Index(['adminId'])
@Index(['action'])
@Index(['targetType'])
@Index(['targetId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  adminId: string;

  @Column('varchar', { length: 255 })
  adminUsername: string;

  @Column('varchar', { length: 100 })
  action: string;

  @Column('enum', { enum: AuditTargetType })
  targetType: AuditTargetType;

  @Column('uuid')
  targetId: string;

  @Column('varchar', { length: 255, nullable: true })
  targetIdentifier: string;

  @Column('jsonb', { nullable: true })
  changesBefore: any;

  @Column('jsonb', { nullable: true })
  changesAfter: any;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @Column('varchar', { length: 45, nullable: true })
  ipAddress: string;

  @Column('text', { nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'adminId' })
  @Exclude()
  admin?: User;
}