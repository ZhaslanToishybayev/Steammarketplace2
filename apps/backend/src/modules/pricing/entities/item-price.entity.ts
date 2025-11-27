import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, BeforeUpdate } from 'typeorm';

export enum PriceSource {
  STEAM_MARKET = 'steam_market',
  CSGOFLOAT = 'csgofloat',
  BUFF163 = 'buff163',
  AGGREGATED = 'aggregated'
}

@Entity('item_prices')
@Index(['itemId'])
@Index(['appId'])
@Index(['marketHashName'])
@Index(['priceDate'])
@Index(['itemId', 'priceDate'])
@Index(['marketHashName', 'priceDate'])
@Index(['appId', 'priceDate'])
@Index(['appId', 'marketHashName', 'priceDate'], { order: 'DESC' }) // For comprehensive game+item queries
@Index(['source', 'priceDate'], { order: 'DESC' }) // For source aggregations
export class ItemPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  @Index()
  itemId: string;

  @Column({ type: 'int', nullable: false })
  @Index()
  appId: number;

  @Column({ type: 'varchar', nullable: false })
  @Index()
  marketHashName: string;

  @Column({
    type: 'enum',
    enum: PriceSource,
    default: PriceSource.AGGREGATED
  })
  source: PriceSource;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'int', nullable: true })
  volume: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  lowestPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  medianPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  highestPrice: number;

  @Column({ type: 'timestamp', nullable: false })
  @Index()
  priceDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }
}