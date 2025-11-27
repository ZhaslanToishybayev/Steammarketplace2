#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { Command, Option } from 'commander';
import { Logger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SeedingModule } from './seeding.module';
import { MarketSeeder } from './market-seeder';

async function bootstrap() {
  const program = new Command();

  program
    .name('db:seed')
    .description('Seed database with real Steam market data')
    .option('-c, --count <number>', 'Number of items to seed', '1000')
    .option('--only <type>', 'Type of seeding (currently only supports "market")', 'market')
    .option('--dry-run', 'Fetch data but don\'t save to database', false)
    .option('--verbose', 'Enable verbose logging', false);

  program.parse(process.argv);

  const options = program.opts();

  // Validate seeding type
  if (options.only !== 'market') {
    console.error(`❌ Unsupported seeding type: ${options.only}. Currently only "market" seeding is supported.`);
    process.exit(1);
  }

  try {
    // Initialize NestJS application context using the SeedingModule
    const app = await NestFactory.createApplicationContext(SeedingModule, {
      logger: false, // We'll use Winston logger
    });

    // Get the logger and seeder service
    const logger: LoggerService = app.get(WINSTON_MODULE_NEST_PROVIDER);
    const marketSeeder = app.get(MarketSeeder);

    // Parse options
    const targetCount = parseInt(options.count, 10);
    const dryRun = options.dryRun;
    const verbose = options.verbose;

    // Log start
    logger.log('🚀 Starting database seeding process', {
      targetCount,
      dryRun,
      seedingType: options.only,
    });

    // Execute seeding
    const result = await marketSeeder.seed({
      targetCount,
      dryRun,
      verbose,
      seedingType: options.only,
    });

    // Log results
    logger.log('✅ Database seeding completed successfully', {
      itemsCreated: result.itemsCreated,
      pricesFetched: result.pricesFetched,
      errors: result.errors,
      duration: result.duration,
    });

    // Display summary
    console.log('\n📊 Seeding Summary:');
    console.log(`   Items created: ${result.itemsCreated}`);
    console.log(`   Prices fetched: ${result.pricesFetched}`);
    console.log(`   Errors encountered: ${result.errors}`);
    console.log(`   Duration: ${result.duration}ms`);

    if (result.errors > 0) {
      console.log(`\n⚠️  ${result.errors} errors occurred during seeding. Check logs for details.`);
    }

    await app.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);

    // Try to close app gracefully if it was created
    try {
      // We don't have access to app here, but we can try to exit gracefully
      process.exit(1);
    } catch (closeError) {
      process.exit(1);
    }
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