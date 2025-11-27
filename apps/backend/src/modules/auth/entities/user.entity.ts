import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, BeforeUpdate } from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin'
}

@Entity('users')
@Index(['steamId'])
@Index(['email'])
@Index(['isActive'])
@Index(['isBanned'])
@Index(['role'])
@Index(['isVerified'])
@Index(['banExpiresAt'])
@Index(['steamId', 'isActive']) // For fast active user checks by Steam ID
@Index(['role', 'isBanned']) // For admin panel user filtering
@Index(['createdAt', 'lastLoginAt']) // For activity analytics
@Index(['isVerified', 'isActive', 'isBanned']) // For complex status checks
export class User {
  /**
   * Unique identifier for the user (UUID v4).
   * Using UUID instead of auto-increment for better distributed system support,
   * security (non-sequential IDs), and cross-database portability.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  @Index()
  steamId: string;

  @Column({ type: 'varchar', nullable: false })
  username: string;

  @Column({ type: 'varchar', nullable: true })
  avatar: string;

  @Column({ type: 'varchar', nullable: true })
  avatarMedium: string;

  @Column({ type: 'varchar', nullable: true })
  avatarFull: string;

  @Column({ type: 'varchar', nullable: true })
  profileUrl: string;

  @Column({ type: 'varchar', nullable: true })
  tradeUrl: string;

  @Column({ type: 'boolean', default: false })
  isTradeUrlValid: boolean;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isBanned: boolean;

  @Column({ type: 'varchar', nullable: true })
  banReason: string;

  @Column({ type: 'varchar', default: UserRole.USER })
  @Index()
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  @Index()
  isAdmin: boolean;

  @Column({ type: 'boolean', default: false })
  @Index()
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  banExpiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }

  // NOTE: These fields are reserved for future authentication methods
  // Currently using Steam OpenID only - no local password or API key authentication
  // Keep these fields for potential future expansion to local accounts or API access

  // Exclude sensitive data from API responses
  @Exclude()
  password?: string; // Reserved for future local credential-based authentication

  @Exclude()
  apiKey?: string; // Reserved for future per-user API key authentication
}