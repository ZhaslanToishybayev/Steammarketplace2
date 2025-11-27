import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum ReportStatus {
  PENDING = 'pending',
  GENERATED = 'generated',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

@Entity('reports')
@Index(['type', 'status'])
@Index(['createdAt'])
@Index(['expiresAt'])
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReportType,
    nullable: false,
  })
  type: ReportType;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    type: 'timestamptz',
    nullable: false,
  })
  periodStart: Date;

  @Column({
    type: 'timestamptz',
    nullable: false,
  })
  periodEnd: Date;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  data: any;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  errorMessage: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  generatedAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  expiresAt: Date;

  @Column({
    type: 'int',
    default: 0,
  })
  downloadCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields that would be populated by relations
  generatedBy?: string;
}