import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '../../auth/entities/user.entity';

export enum ConfigValueType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
}

@Entity('system_configs')
@Index(['key'], { unique: true })
@Index(['category'])
@Index(['isPublic'])
export class SystemConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100 })
  key: string;

  @Column('text')
  value: string;

  @Column('enum', { enum: ConfigValueType })
  valueType: ConfigValueType;

  @Column('varchar', { length: 50 })
  category: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('boolean', { default: false })
  isPublic: boolean;

  @Column('boolean', { default: true })
  isEditable: boolean;

  @Column('uuid', { nullable: true })
  lastModifiedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lastModifiedBy' })
  @Exclude()
  lastModifiedByUser?: User;
}