#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { Command } from 'commander';
import { Logger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DataSource } from 'typeorm';
import { Connection } from 'mongoose';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { WinstonModule } from 'nest-winston';
import { databaseConfig } from '../../config/database.config';
import { mongodbConfig } from '../../config/mongodb.config';
import { loggerConfig } from '../../config/logger.config';

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
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => loggerConfig(configService),
    }),
  ],
})
class VerificationModule {}

async function bootstrap() {
  const program = new Command();

  program
    .name('db:verify')
    .description('Verify database tables and collections exist');

  program.parse();

  try {
    console.log('🔍 Verifying database initialization...\n');

    // Initialize NestJS application context
    const app = await NestFactory.createApplicationContext(
      VerificationModule,
      {
        logger: false, // We'll use Winston logger
      }
    );

    // Get the logger and database connections
    const logger: LoggerService = app.get(WINSTON_MODULE_NEST_PROVIDER);
    const dataSource: DataSource = app.get(DataSource);
    const mongooseConnection: Connection = app.get(Connection);

    // Expected PostgreSQL tables (based on currently implemented entities for initial marketplace flow)
    const expectedTables = [
      'users',
      'refresh_tokens',
      'bots',
      'trades',
      'trade_items',
      'item_prices',
      'balances',
      'transactions',
    ];

    // Expected MongoDB collections
    const expectedCollections = [
      'items',
    ];

    let allVerified = true;

    // Check PostgreSQL tables
    console.log('✅ PostgreSQL Tables:');
    try {
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();

      for (const tableName of expectedTables) {
        const result = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          )
        `, [tableName]);

        if (result[0].exists) {
          console.log(`  ✅ ${tableName}`);
        } else {
          console.log(`  ❌ ${tableName}`);
          allVerified = false;
        }
      }

      await queryRunner.release();
    } catch (error) {
      console.log(`  ❌ Error checking PostgreSQL tables: ${error.message}`);
      allVerified = false;
    }

    console.log();

    // Check MongoDB collections
    console.log('✅ MongoDB Collections:');
    try {
      const collections = await mongooseConnection.db.listCollections().toArray();
      const collectionNames = collections.map(col => col.name);

      for (const collectionName of expectedCollections) {
        if (collectionNames.includes(collectionName)) {
          console.log(`  ✅ ${collectionName}`);
        } else {
          console.log(`  ❌ ${collectionName}`);
          allVerified = false;
        }
      }

      // Show all collections for debugging
      if (collectionNames.length > 0) {
        console.log('\n📋 All MongoDB collections:');
        collectionNames.forEach(name => console.log(`   - ${name}`));
      }
    } catch (error) {
      console.log(`  ❌ Error checking MongoDB collections: ${error.message}`);
      allVerified = false;
    }

    console.log();

    // Final verification result
    if (allVerified) {
      console.log('🎉 All database objects verified successfully!');
      logger.log('Database verification completed successfully');
      await app.close();
      process.exit(0);
    } else {
      console.log('❌ Some database objects are missing. Please check the output above.');
      logger.error('Database verification failed - some tables/collections are missing');
      await app.close();
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    console.error(error.stack);

    process.exit(1);
  }
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