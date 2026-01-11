import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  steamId: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  profileUrl: string;

  @Column({ nullable: true })
  tradeUrl: string;

  @Column({ default: false })
  tradeUrlVerified: boolean;

  @Column({ default: 0 })
  tradeOfferCount: number;

  @Column({ default: 0 })
  successfulTrades: number;

  @Column({ default: 0 })
  failedTrades: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
