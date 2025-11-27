#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { Command } from 'commander';
import { Logger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DataSource } from 'typeorm';
import { Connection, Model } from 'mongoose';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { WinstonModule } from 'nest-winston';
import { databaseConfig } from '../../config/database.config';
import { mongodbConfig } from '../../config/mongodb.config';
import { loggerConfig } from '../../config/logger.config';
import { Item, ItemDocument, ItemSchema } from '../../modules/inventory/schemas/item.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => databaseConfig(configService),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => mongodbConfig(configService),
    }),
    MongooseModule.forFeature([{ name: Item.name, schema: ItemSchema }]),
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => loggerConfig(configService),
    }),
  ],
})
class StatusModule {}

async function bootstrap() {
  const program = new Command();

  program
    .name('db:status')
    .description('Display database population statistics');

  program.parse(process.argv);

  try {
    console.log('📊 Database Population Status\n');

    // Initialize NestJS application context
    const app = await NestFactory.createApplicationContext(
      StatusModule,
      {
        logger: false, // We'll use Winston logger
      }
    );

    // Get the logger and database connections
    const logger: LoggerService = app.get(WINSTON_MODULE_NEST_PROVIDER);
    const dataSource: DataSource = app.get(DataSource);
    const mongooseConnection: Connection = app.get(getConnectionToken());
    const itemModel: Model<ItemDocument> = app.get(getModelToken(Item.name));

    // PostgreSQL entity counts
    const pgCounts = await getPostgreSQLCounts(dataSource);
    displayPostgreSQLStats(pgCounts);

    // Price source statistics
    const priceStats = await getPriceSourceStats(dataSource);
    displayPriceSourceStats(priceStats);

    // Trade statistics
    const tradeStats = await getTradeStats(dataSource);
    displayTradeStats(tradeStats);

    // MongoDB statistics
    const mongoStats = await getMongoDBStats(mongooseConnection, itemModel);
    displayMongoDBStats(mongoStats);

    logger.log('Database status check completed successfully');
    await app.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Database status check failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function getPostgreSQLCounts(dataSource: DataSource): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const entities = [
    { table: 'users', roleColumn: 'role' },
    { table: 'bots' },
    { table: 'trades', statusColumn: 'status' },
    { table: 'trade_items' },
    { table: 'item_prices', sourceColumn: 'source' },
    { table: 'balances' },
    { table: 'transactions' },
    { table: 'referrals' },
    { table: 'referral_codes' },
    { table: 'reports' },
    { table: 'trade_disputes' },
    { table: 'audit_logs' },
    { table: 'refresh_tokens' },
    { table: 'user_profiles' },
    { table: 'user_settings' },
    { table: 'user_notification_preferences' },
    { table: 'webhook_subscriptions' },
    { table: 'webhook_logs' },
    { table: 'inventories' },
    { table: 'system_configs' },
  ];

  try {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    for (const entity of entities) {
      try {
        const result = await queryRunner.query(`SELECT COUNT(*) as count FROM ${entity.table}`);
        counts[entity.table] = parseInt(result[0].count, 10);
      } catch (error) {
        counts[entity.table] = -1; // Error indicator
      }
    }

    await queryRunner.release();
  } catch (error) {
    console.log(`  ❌ Error querying PostgreSQL: ${error.message}`);
  }

  return counts;
}

async function getMongoDBStats(
  mongooseConnection: Connection,
  itemModel: any
): Promise<{
  itemCount: number;
  itemsByAppId: Record<number, number>;
  collectionStats: any[];
}> {
  const stats = {
    itemCount: 0,
    itemsByAppId: {} as Record<number, number>,
    collectionStats: [] as any[],
  };

  try {
    // Count total items
    stats.itemCount = await itemModel.countDocuments();

    // Count items by app ID
    const appIdStats = await itemModel.aggregate([
      { $group: { _id: '$appId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    appIdStats.forEach(stat => {
      stats.itemsByAppId[stat._id] = stat.count;
    });

    // Get collection statistics
    const collections = await mongooseConnection.db.listCollections().toArray();
    for (const collection of collections) {
      try {
        const count = await mongooseConnection.db.collection(collection.name).countDocuments();
        stats.collectionStats.push({
          name: collection.name,
          count,
        });
      } catch (error) {
        stats.collectionStats.push({
          name: collection.name,
          count: -1,
          error: error.message,
        });
      }
    }
  } catch (error) {
    console.log(`  ❌ Error querying MongoDB: ${error.message}`);
  }

  return stats;
}

async function getPriceSourceStats(dataSource: DataSource): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};

  try {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    // Count prices by source
    const sourceResult = await queryRunner.query(`
      SELECT source, COUNT(*) as count
      FROM item_prices
      GROUP BY source
      ORDER BY count DESC
    `);

    sourceResult.forEach(row => {
      stats[row.source] = parseInt(row.count, 10);
    });

    // Get latest price update
    const latestResult = await queryRunner.query(`
      SELECT MAX(price_date) as latest_update
      FROM item_prices
    `);

    stats.latestUpdate = latestResult[0].latest_update
      ? new Date(latestResult[0].latest_update).toLocaleString()
      : 'Never';

    await queryRunner.release();
  } catch (error) {
    stats.error = error.message;
  }

  return stats;
}

async function getTradeStats(dataSource: DataSource): Promise<any> {
  const stats = {
    totalTrades: 0,
    tradesByStatus: {} as Record<string, number>,
    latestTrade: 'Never',
  };

  try {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    // Count trades by status
    const statusResult = await queryRunner.query(`
      SELECT status, COUNT(*) as count
      FROM trades
      GROUP BY status
      ORDER BY count DESC
    `);

    statusResult.forEach(row => {
      stats.tradesByStatus[row.status] = parseInt(row.count, 10);
    });

    // Get latest trade
    const latestResult = await queryRunner.query(`
      SELECT MAX(created_at) as latest_trade
      FROM trades
    `);

    stats.latestTrade = latestResult[0].latest_trade
      ? new Date(latestResult[0].latest_trade).toLocaleString()
      : 'Never';

    await queryRunner.release();
  } catch (error) {
    stats.error = error.message;
  }

  return stats;
}

function displayPostgreSQLStats(counts: Record<string, number>) {
  console.log('🗄️  PostgreSQL Tables:');
  console.log('┌─────────────────────────────┬─────────┐');
  console.log('│ Entity                      │ Count   │');
  console.log('├─────────────────────────────┼─────────┤');

  const sortedCounts = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));

  for (const [entity, count] of sortedCounts) {
    const displayName = entity
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    const countDisplay = count === -1 ? 'ERROR' : count.toLocaleString();
    console.log(`│ ${displayName.padEnd(27)} │ ${countDisplay.padStart(7)} │`);
  }

  console.log('└─────────────────────────────┴─────────┘\n');
}

function displayPriceSourceStats(priceStats: Record<string, any>) {
  console.log('💰 Price Source Statistics:');
  console.log('┌─────────────────────────────┬─────────┐');
  console.log('│ Source                      │ Count   │');
  console.log('├─────────────────────────────┼─────────┤');

  // Display price counts by source
  const sourceStats = { ...priceStats };
  delete sourceStats.latestUpdate;
  delete sourceStats.error;

  if (priceStats.error) {
    console.log(`│ ERROR                       │ ${priceStats.error} │`);
  } else if (Object.keys(sourceStats).length === 0) {
    console.log('│ No price data available     │         │');
  } else {
    for (const [source, count] of Object.entries(sourceStats).sort()) {
      const countDisplay = count.toLocaleString();
      console.log(`│ ${source.padEnd(27)} │ ${countDisplay.padStart(7)} │`);
    }

    if (priceStats.latestUpdate) {
      console.log('\n📅 Latest Price Update:');
      console.log(`   ${priceStats.latestUpdate}`);
    }
  }

  console.log('└─────────────────────────────┴─────────┘\n');
}

function displayTradeStats(tradeStats: any) {
  console.log('🔄 Trade Statistics:');
  console.log('┌─────────────────────────────┬─────────┐');
  console.log('│ Status                      │ Count   │');
  console.log('├─────────────────────────────┼─────────┤');

  if (tradeStats.error) {
    console.log(`│ ERROR                       │ ${tradeStats.error} │`);
  } else {
    // Display trade counts by status
    for (const [status, count] of Object.entries(tradeStats.tradesByStatus).sort()) {
      const countDisplay = count.toLocaleString();
      console.log(`│ ${status.padEnd(27)} │ ${countDisplay.padStart(7)} │`);
    }

    console.log('\n📅 Latest Trade:');
    console.log(`   ${tradeStats.latestTrade}`);

    console.log('\n📊 Total Trades:');
    console.log(`   ${tradeStats.totalTrades.toLocaleString()}`);
  }

  console.log('└─────────────────────────────┴─────────┘\n');
}

function displayMongoDBStats(mongoStats: any) {
  console.log('🍃 MongoDB Collections:');
  console.log('┌─────────────────────────────┬─────────┐');
  console.log('│ Collection                  │ Count   │');
  console.log('├─────────────────────────────┼─────────┤');

  for (const collection of mongoStats.collectionStats) {
    const countDisplay = collection.count === -1 ? 'ERROR' : collection.count.toLocaleString();
    console.log(`│ ${collection.name.padEnd(27)} │ ${countDisplay.padStart(7)} │`);
  }

  console.log('└─────────────────────────────┴─────────┘\n');

  // Additional MongoDB statistics
  console.log('📈 Additional MongoDB Statistics:');
  console.log(`  - Total Items: ${mongoStats.itemCount.toLocaleString()}`);

  if (Object.keys(mongoStats.itemsByAppId).length > 0) {
    console.log('  - Items by App ID:');
    Object.entries(mongoStats.itemsByAppId).forEach(([appId, count]) => {
      const gameName = getGameName(parseInt(appId, 10));
      console.log(`    • ${gameName} (${appId}): ${count.toLocaleString()}`);
    });
  }

  console.log();
}

function getGameName(appId: number): string {
  const games = {
    730: 'CS:GO',
    570: 'Dota 2',
    440: 'Team Fortress 2',
    252490: 'Rust',
    578080: 'PUBG',
    753290: 'Warframe',
  };

  return games[appId] || `App ${appId}`;
}

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Execute bootstrap
bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});