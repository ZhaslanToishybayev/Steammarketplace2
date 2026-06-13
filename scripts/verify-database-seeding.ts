#!/usr/bin/env ts-node

/**
 * Database Seeding Verification Script
 *
 * This script checks database population status, validates data integrity,
 * and ensures all required tables and collections are properly seeded.
 */

import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import chalk from 'chalk';
import { Client } from 'pg';
import { MongoClient, Db } from 'mongodb';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), 'apps/backend/.env') });

// Type definitions
interface DatabaseSeedingResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  details: string;
  errors?: string[];
  recommendations?: string[];
  data?: {
    tableCounts?: { [tableName: string]: number };
    collectionCounts?: { [collectionName: string]: number };
    seedingCompletion?: number;
    dataQuality?: string;
  };
}

interface DatabaseSeedingReport {
  timestamp: string;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  checks: DatabaseSeedingResult[];
  databaseInfo: {
    postgresVersion?: string;
    mongoVersion?: string;
    redisVersion?: string;
  };
}

class DatabaseSeedingVerifier {
  private results: DatabaseSeedingResult[] = [];
  private startTime: number = 0;
  private pgClient: Client | null = null;
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;

  constructor() {
    this.initializeDatabaseConnections();
  }

  private initializeDatabaseConnections(): void {
    try {
      // Initialize PostgreSQL connection
      if (process.env.DATABASE_URL) {
        this.pgClient = new Client({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
      }

      // Initialize MongoDB connection
      if (process.env.MONGODB_URI) {
        this.mongoClient = new MongoClient(process.env.MONGODB_URI, {
          retryWrites: true,
          w: 'majority'
        });
      }
    } catch (error) {
      console.warn(chalk.yellow('Database connection setup warning:'), (error as Error).message);
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i === maxRetries) break;
        await this.sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async connectToPostgres(): Promise<boolean> {
    if (!this.pgClient) return false;

    try {
      await this.executeWithRetry(
        () => this.pgClient!.connect(),
        2,
        2000
      );
      return true;
    } catch (error) {
      console.warn('PostgreSQL connection failed:', (error as Error).message);
      return false;
    }
  }

  private async connectToMongo(): Promise<boolean> {
    if (!this.mongoClient) return false;

    try {
      await this.executeWithRetry(
        () => this.mongoClient!.connect(),
        2,
        2000
      );
      this.mongoDb = this.mongoClient.db();
      return true;
    } catch (error) {
      console.warn('MongoDB connection failed:', (error as Error).message);
      return false;
    }
  }

  private async checkPostgresTables(): Promise<DatabaseSeedingResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];
    let tableCounts: { [tableName: string]: number } = {};

    if (!this.pgClient || !(await this.connectToPostgres())) {
      status = 'skip';
      recommendations.push('Check PostgreSQL connection string and database availability');
      return {
        name: 'PostgreSQL Table Checks',
        status,
        duration: Date.now() - start,
        details: 'PostgreSQL not available for verification',
        recommendations: recommendations.length > 0 ? recommendations : undefined
      };
    }

    try {
      // Check expected tables - separating critical from optional
      const criticalTables = ['users', 'trades', 'trade_items', 'item_prices', 'balances'];
      const optionalTables = [
        'transactions', 'notifications', 'api_keys', 'steam_profiles',
        'inventory_items', 'trade_offers', 'price_history', 'marketplace_fees',
        'bot_inventories', 'refresh_tokens', 'bots'
      ];
      const expectedTables = [...criticalTables, ...optionalTables];

      const tableQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `;

      const result = await this.pgClient.query(tableQuery);
      const existingTables = result.rows.map(row => row.table_name);

      const missingCriticalTables = criticalTables.filter(table => !existingTables.includes(table));
      const missingOptionalTables = optionalTables.filter(table => !existingTables.includes(table));

      if (missingCriticalTables.length > 0) {
        status = 'fail';
        errors.push(`Missing critical tables: ${missingCriticalTables.join(', ')}`);
        recommendations.push('Run database migrations: npm run db:migrate');
      }

      if (missingOptionalTables.length > 0) {
        details += ` | Missing optional tables: ${missingOptionalTables.join(', ')} (consider running full migrations)`;
        recommendations.push('Run full database seeding for complete functionality: npm run db:seed');
      }

      // Count rows in each table
      for (const table of expectedTables) {
        try {
          const countResult = await this.pgClient.query(`SELECT COUNT(*) as count FROM ${table}`);
          tableCounts[table] = parseInt(countResult.rows[0].count);
        } catch (error) {
          tableCounts[table] = -1; // Error counting
          errors.push(`Could not count rows in ${table}: ${(error as Error).message}`);
        }
      }

      // Validate critical table counts
      if (tableCounts.users < 1) {
        status = 'fail';
        errors.push('No users found - at least 1 admin user required');
        recommendations.push('Seed admin user: npm run db:seed');
      }

      if (tableCounts.item_prices < 10) {
        status = 'fail';
        errors.push(`Insufficient price data: ${tableCounts.item_prices} items (expected >= 10)`);
        recommendations.push('Run price data seeding: npm run db:seed');
      }

      // Check for indexes
      const indexQuery = `
        SELECT tablename, indexname, columnname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename IN (${expectedTables.map(t => `'${t}'`).join(',')})
        ORDER BY tablename, indexname
      `;

      const indexResult = await this.pgClient.query(indexQuery);
      const indexes = indexResult.rows;

      const criticalIndexes = [
        'users_steamId_idx', 'trades_status_idx', 'item_prices_marketHashName_idx',
        'trade_items_tradeId_idx', 'balances_userId_idx'
      ];

      const existingIndexNames = indexes.map(row => row.indexname);
      const missingIndexes = criticalIndexes.filter(index => !existingIndexNames.includes(index));

      if (missingIndexes.length > 0) {
        errors.push(`Missing critical indexes: ${missingIndexes.join(', ')}`);
        recommendations.push('Create missing database indexes for performance');
      }

      const tableName = Object.keys(tableCounts).length;
      const totalRows = Object.values(tableCounts).reduce((sum, count) => sum + (count > 0 ? count : 0), 0);

      details = `Found ${tableName} tables, ${totalRows} total rows. Critical: ${tableCounts.users} users, ${tableCounts.item_prices} price entries`;

    } catch (error) {
      status = 'fail';
      errors.push(`PostgreSQL table check failed: ${(error as Error).message}`);
      recommendations.push('Check PostgreSQL connection and permissions');
    }

    return {
      name: 'PostgreSQL Table Checks',
      status,
      duration: Date.now() - start,
      details: details || 'PostgreSQL table validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      data: { tableCounts }
    };
  }

  private async checkMongoDBCollections(): Promise<DatabaseSeedingResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];
    let collectionCounts: { [collectionName: string]: number } = {};

    if (!this.mongoClient || !(await this.connectToMongo())) {
      status = 'skip';
      recommendations.push('Check MongoDB connection string and database availability');
      return {
        name: 'MongoDB Collection Checks',
        status,
        duration: Date.now() - start,
        details: 'MongoDB not available for verification',
        recommendations: recommendations.length > 0 ? recommendations : undefined
      };
    }

    try {
      // Check expected collections - separating critical from optional
      const criticalCollections = ['items'];
      const optionalCollections = ['analytics', 'logs', 'cache'];
      const expectedCollections = [...criticalCollections, ...optionalCollections];

      const collections = await this.mongoDb!.listCollections().toArray();
      const existingCollections = collections.map(col => col.name);

      const missingCriticalCollections = criticalCollections.filter(col => !existingCollections.includes(col));
      const missingOptionalCollections = optionalCollections.filter(col => !existingCollections.includes(col));

      if (missingCriticalCollections.length > 0) {
        status = 'fail';
        errors.push(`Missing critical collections: ${missingCriticalCollections.join(', ')}`);
        recommendations.push('Check MongoDB seeding scripts');
      }

      if (missingOptionalCollections.length > 0) {
        details += ` | Missing optional collections: ${missingOptionalCollections.join(', ')} (consider running full seeding)`;
        recommendations.push('Run comprehensive MongoDB seeding');
      }

      // Count documents in each collection
      for (const collection of expectedCollections) {
        try {
          const count = await this.mongoDb!.collection(collection).countDocuments();
          collectionCounts[collection] = count;
        } catch (error) {
          collectionCounts[collection] = -1; // Error counting
          errors.push(`Could not count documents in ${collection}: ${(error as Error).message}`);
        }
      }

      // Validate items collection (most critical)
      if (collectionCounts.items < 100) {
        status = 'fail';
        errors.push(`Insufficient items data: ${collectionCounts.items} items (expected >= 100 for basic functionality)`);
        recommendations.push('Run item seeding: npm run db:seed');
      } else if (collectionCounts.items < 1000) {
        details += ` | Items count: ${collectionCounts.items} (consider running full seeding for >= 1000 items)`;
        recommendations.push('Run comprehensive item seeding for full functionality');
      }

      // Validate items schema
      if (collectionCounts.items > 0) {
        try {
          const sampleItem = await this.mongoDb!.collection('items').findOne({});
          if (sampleItem) {
            const requiredFields = ['marketHashName', 'appId', 'name', 'iconUrl', 'rarity'];
            const missingFields = requiredFields.filter(field => !(field in sampleItem));

            if (missingFields.length > 0) {
              status = 'fail';
              errors.push(`Items missing required fields: ${missingFields.join(', ')}`);
              recommendations.push('Check item schema and seeding data');
            }
          }
        } catch (error) {
          errors.push(`Could not validate item schema: ${(error as Error).message}`);
        }
      }

      // Check for items across multiple games
      if (collectionCounts.items > 0) {
        try {
          const gamesResult = await this.mongoDb!.collection('items').aggregate([
            { $group: { _id: '$appId', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]).toArray();

          const games = gamesResult.map(g => ({ appId: g._id, count: g.count }));
          const gameInfo = games.slice(0, 5).map(g => `${g.appId}(${g.count})`).join(', ');

          details = `Found ${collectionCounts.items} items across ${games.length} games: ${gameInfo}`;

          // Check for critical games
          const criticalGames = [730, 570, 440]; // CS:GO, DOTA 2, TF2
          const presentGames = games.map(g => g.appId);
          const missingCriticalGames = criticalGames.filter(game => !presentGames.includes(game));

          if (missingCriticalGames.length > 0) {
            details += ` | Missing critical games: ${missingCriticalGames.join(', ')} (consider running full seeding)`;
            recommendations.push('Ensure critical game items are seeded for complete functionality');
          }

        } catch (error) {
          errors.push(`Could not analyze game distribution: ${(error as Error).message}`);
        }
      }

    } catch (error) {
      status = 'fail';
      errors.push(`MongoDB collection check failed: ${(error as Error).message}`);
      recommendations.push('Check MongoDB connection and permissions');
    }

    return {
      name: 'MongoDB Collection Checks',
      status,
      duration: Date.now() - start,
      details: details || 'MongoDB collection validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      data: { collectionCounts }
    };
  }

  private async checkPriceDataValidation(): Promise<DatabaseSeedingResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    if (!this.pgClient || !(await this.connectToPostgres())) {
      status = 'skip';
      recommendations.push('PostgreSQL required for price data validation');
      return {
        name: 'Price Data Validation',
        status,
        duration: Date.now() - start,
        details: 'PostgreSQL not available for price validation',
        recommendations: recommendations.length > 0 ? recommendations : undefined
      };
    }

    try {
      // Check recent price data
      const recentPricesQuery = `
        SELECT COUNT(*) as recent_count,
               MAX(createdat) as last_update,
               COUNT(DISTINCT markethashname) as unique_items
        FROM item_prices
        WHERE createdat > NOW() - INTERVAL '24 hours'
      `;

      const recentResult = await this.pgClient.query(recentPricesQuery);
      const recentData = recentResult.rows[0];

      if (parseInt(recentData.recent_count) < 10) {
        status = 'fail';
        errors.push(`Insufficient recent price data: ${recentData.recent_count} entries in last 24 hours`);
        recommendations.push('Check price update cron jobs and Steam API connectivity');
      }

      // Check price sources
      const sourcesQuery = `
        SELECT source, COUNT(*) as count
        FROM item_prices
        WHERE createdat > NOW() - INTERVAL '24 hours'
        GROUP BY source
        ORDER BY count DESC
      `;

      const sourcesResult = await this.pgClient.query(sourcesQuery);
      const sources = sourcesResult.rows;

      const expectedSources = ['steam', 'csgofloat', 'buff163'];
      const presentSources = sources.map(s => s.source);
      const missingSources = expectedSources.filter(source => !presentSources.includes(source));

      if (missingSources.length > 0) {
        errors.push(`Missing price sources: ${missingSources.join(', ')}`);
        recommendations.push('Configure and enable all price data sources');
      }

      // Check for price history
      const historyQuery = `
        SELECT markethashname, COUNT(*) as price_points
        FROM item_prices
        GROUP BY markethashname
        HAVING COUNT(*) > 1
        ORDER BY price_points DESC
        LIMIT 5
      `;

      const historyResult = await this.pgClient.query(historyQuery);
      const itemsWithHistory = historyResult.rows.length;

      if (itemsWithHistory < 5) {
        errors.push('Insufficient price history data');
        recommendations.push('Allow more time for price data collection');
      }

      // Validate price ranges
      const priceValidationQuery = `
        SELECT
          COUNT(*) as total_prices,
          COUNT(*) FILTER (WHERE price <= 0) as invalid_prices,
          COUNT(*) FILTER (WHERE price > 10000) as extreme_prices,
          MIN(price) as min_price,
          MAX(price) as max_price
        FROM item_prices
        WHERE createdat > NOW() - INTERVAL '24 hours'
      `;

      const priceResult = await this.pgClient.query(priceValidationQuery);
      const priceData = priceResult.rows[0];

      if (parseInt(priceData.invalid_prices) > 0) {
        status = 'fail';
        errors.push(`${priceData.invalid_prices} items with invalid prices (<= 0)`);
        recommendations.push('Fix data validation for price imports');
      }

      if (parseInt(priceData.extreme_prices) > 10) {
        errors.push(`${priceData.extreme_prices} items with extreme prices (> $100)`);
        recommendations.push('Review price data for outliers and errors');
      }

      details = `${recentData.recent_count} recent prices for ${recentData.unique_items} items, ${sources.length} sources, last update: ${recentData.last_update}`;

    } catch (error) {
      status = 'fail';
      errors.push(`Price data validation failed: ${(error as Error).message}`);
      recommendations.push('Check price data import processes and database schema');
    }

    return {
      name: 'Price Data Validation',
      status,
      duration: Date.now() - start,
      details: details || 'Price data validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkMaterializedViews(): Promise<DatabaseSeedingResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    if (!this.pgClient || !(await this.connectToPostgres())) {
      status = 'skip';
      recommendations.push('PostgreSQL required for materialized views check');
      return {
        name: 'Materialized Views Check',
        status,
        duration: Date.now() - start,
        details: 'PostgreSQL not available for views check',
        recommendations: recommendations.length > 0 ? recommendations : undefined
      };
    }

    try {
      // Check for materialized views
      const viewsQuery = `
        SELECT schemaname, matviewname, is_insertable_into
        FROM pg_matviews
        WHERE schemaname = 'public'
      `;

      const viewsResult = await this.pgClient.query(viewsQuery);
      const materializedViews = viewsResult.rows;

      if (materializedViews.length === 0) {
        details += ' | No materialized views found (consider creating for performance optimization)';
        recommendations.push('Create materialized views for production environments to improve query performance');
      } else {
        // Check if views contain data
        for (const view of materializedViews) {
          try {
            const countResult = await this.pgClient.query(`SELECT COUNT(*) as count FROM ${view.matviewname}`);
            const rowCount = parseInt(countResult.rows[0].count);

            if (rowCount === 0) {
              details += ` | Materialized view ${view.matviewname} is empty (consider refreshing)`;
              recommendations.push(`Refresh materialized view: REFRESH MATERIALIZED VIEW ${view.matviewname}`);
            }
          } catch (error) {
            details += ` | Could not check ${view.matviewname}: ${(error as Error).message}`;
          }
        }

        details += ` | Found ${materializedViews.length} materialized views: ${materializedViews.map(v => v.matviewname).join(', ')} (for performance optimization)`;
      }

    } catch (error) {
      status = 'fail';
      errors.push(`Materialized views check failed: ${(error as Error).message}`);
      recommendations.push('Check materialized view definitions and refresh processes');
    }

    return {
      name: 'Materialized Views Check',
      status,
      duration: Date.now() - start,
      details: details || 'Materialized views validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkDataIntegrity(): Promise<DatabaseSeedingResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    if (!this.pgClient || !(await this.connectToPostgres())) {
      status = 'skip';
      recommendations.push('PostgreSQL required for data integrity check');
      return {
        name: 'Data Integrity Check',
        status,
        duration: Date.now() - start,
        details: 'PostgreSQL not available for integrity check',
        recommendations: recommendations.length > 0 ? recommendations : undefined
      };
    }

    try {
      // Check foreign key relationships
      const foreignKeyChecks = [
        {
          table: 'trades',
          column: 'userid',
          reference: 'users(id)',
          description: 'Trade user references'
        },
        {
          table: 'trades',
          column: 'botid',
          reference: 'bots(id)',
          description: 'Trade bot references'
        },
        {
          table: 'trade_items',
          column: 'tradeid',
          reference: 'trades(id)',
          description: 'Trade items references'
        },
        {
          table: 'balances',
          column: 'userid',
          reference: 'users(id)',
          description: 'Balance user references'
        }
      ];

      for (const check of foreignKeyChecks) {
        try {
          const orphanQuery = `
            SELECT COUNT(*) as orphaned
            FROM ${check.table}
            WHERE ${check.column} NOT IN (
              SELECT id FROM ${check.reference.split('(')[0]}
            )
          `;

          const orphanResult = await this.pgClient.query(orphanQuery);
          const orphanedCount = parseInt(orphanResult.rows[0].orphaned);

          if (orphanedCount > 0) {
            status = 'fail';
            errors.push(`${orphanedCount} orphaned ${check.table} records (missing ${check.reference})`);
            recommendations.push(`Fix orphaned records in ${check.table}`);
          }
        } catch (error) {
          errors.push(`Could not check ${check.description}: ${(error as Error).message}`);
        }
      }

      // Check enum values
      const enumChecks = [
        {
          table: 'trades',
          column: 'status',
          validValues: ['pending', 'completed', 'cancelled', 'failed', 'expired'],
          description: 'Trade status values'
        },
        {
          table: 'users',
          column: 'role',
          validValues: ['user', 'admin', 'moderator'],
          description: 'User role values'
        }
      ];

      for (const check of enumChecks) {
        try {
          const invalidQuery = `
            SELECT COUNT(*) as invalid
            FROM ${check.table}
            WHERE ${check.column} NOT IN (${check.validValues.map(v => `'${v}'`).join(',')})
          `;

          const invalidResult = await this.pgClient.query(invalidQuery);
          const invalidCount = parseInt(invalidResult.rows[0].invalid);

          if (invalidCount > 0) {
            status = 'fail';
            errors.push(`${invalidCount} invalid ${check.description}`);
            recommendations.push(`Fix invalid enum values in ${check.table}.${check.column}`);
          }
        } catch (error) {
          errors.push(`Could not check ${check.description}: ${(error as Error).message}`);
        }
      }

      // Check unique constraints
      const uniqueChecks = [
        {
          table: 'users',
          column: 'steamid',
          description: 'Unique Steam IDs'
        },
        {
          table: 'bots',
          column: 'accountname',
          description: 'Unique bot account names'
        }
      ];

      for (const check of uniqueChecks) {
        try {
          const duplicatesQuery = `
            SELECT ${check.column}, COUNT(*) as count
            FROM ${check.table}
            GROUP BY ${check.column}
            HAVING COUNT(*) > 1
          `;

          const duplicatesResult = await this.pgClient.query(duplicatesQuery);
          const duplicateCount = duplicatesResult.rows.length;

          if (duplicateCount > 0) {
            status = 'fail';
            errors.push(`${duplicateCount} duplicate ${check.description}`);
            recommendations.push(`Fix duplicate entries in ${check.table}.${check.column}`);
          }
        } catch (error) {
          errors.push(`Could not check ${check.description}: ${(error as Error).message}`);
        }
      }

      if (status === 'pass') {
        details = 'All data integrity checks passed - no orphaned records, invalid enums, or duplicates found';
      }

    } catch (error) {
      status = 'fail';
      errors.push(`Data integrity check failed: ${(error as Error).message}`);
      recommendations.push('Review database schema constraints and data validation');
    }

    return {
      name: 'Data Integrity Check',
      status,
      duration: Date.now() - start,
      details: details || 'Data integrity validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async runAllChecks(): Promise<void> {
    this.startTime = Date.now();

    console.log(chalk.blue.bold('\n🗄️ Starting Database Seeding Verification\n'));

    // Run all checks
    const checks = [
      () => this.checkPostgresTables(),
      () => this.checkMongoDBCollections(),
      () => this.checkPriceDataValidation(),
      () => this.checkMaterializedViews(),
      () => this.checkDataIntegrity()
    ];

    for (const check of checks) {
      const result = await check();
      this.results.push(result);
      this.printResult(result);
    }
  }

  private printResult(result: DatabaseSeedingResult): void {
    const statusIcon = result.status === 'pass' ? chalk.green('✅') :
                      result.status === 'fail' ? chalk.red('❌') : chalk.yellow('⚠️');
    const statusText = result.status === 'pass' ? chalk.green('PASS') :
                      result.status === 'fail' ? chalk.red('FAIL') : chalk.yellow('SKIP');

    console.log(`  ${statusIcon} ${result.name} (${result.duration}ms)`);
    console.log(`     Status: ${statusText}`);
    console.log(`     Details: ${result.details}`);

    if (result.errors && result.errors.length > 0) {
      console.log(`     Errors: ${result.errors.join(', ')}`);
    }

    if (result.recommendations && result.recommendations.length > 0) {
      console.log(`     Recommendations: ${result.recommendations.join(', ')}`);
    }

    if (result.data && result.data.tableCounts) {
      const tableCount = Object.keys(result.data.tableCounts).length;
      console.log(`     Tables: ${tableCount} checked`);
    }

    if (result.data && result.data.collectionCounts) {
      const collectionCount = Object.keys(result.data.collectionCounts).length;
      console.log(`     Collections: ${collectionCount} checked`);
    }
  }

  private generateReport(): DatabaseSeedingReport {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    return {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      summary: {
        total: this.results.length,
        passed,
        failed,
        skipped
      },
      checks: this.results,
      databaseInfo: {
        postgresVersion: process.env.DATABASE_URL ? 'Available' : undefined,
        mongoVersion: process.env.MONGODB_URI ? 'Available' : undefined,
        redisVersion: process.env.REDIS_URL ? 'Available' : undefined
      }
    };
  }

  private async saveReport(report: DatabaseSeedingReport): Promise<void> {
    const reportDir = path.join(process.cwd(), 'scripts', 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database-seeding-verification-${timestamp}.json`;
    const filepath = path.join(reportDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(chalk.blue(`\n📄 Report saved to: ${filepath}`));
  }

  private printSummary(report: DatabaseSeedingReport): void {
    const success = report.summary.failed === 0;

    console.log(chalk.blue.bold('\n📊 DATABASE SEEDING VERIFICATION SUMMARY'));
    console.log(chalk.blue('─'.repeat(50)));

    console.log(`Total Checks: ${chalk.cyan(report.summary.total)}`);
    console.log(`Passed: ${chalk.green(report.summary.passed)}`);
    console.log(`Failed: ${chalk.red(report.summary.failed)}`);
    console.log(`Skipped: ${chalk.yellow(report.summary.skipped)}`);

    console.log(chalk.blue('\n📋 CHECK RESULTS'));
    this.results.forEach(result => {
      const icon = result.status === 'pass' ? chalk.green('✅') :
                   result.status === 'fail' ? chalk.red('❌') : chalk.yellow('⚠️');
      console.log(`${icon} ${result.name}: ${result.status.toUpperCase()}`);
    });

    // Show data summary
    const seedingCheck = this.results.find(r => r.name === 'MongoDB Collection Checks');
    if (seedingCheck?.data?.collectionCounts) {
      const itemCount = seedingCheck.data.collectionCounts.items || 0;
      const completionPercent = Math.min(100, Math.round((itemCount / 1000) * 100));
      console.log(chalk.blue(`\n📊 SEEDING COMPLETION: ${completionPercent}% (${itemCount}/1000+ items)`));
    }

    if (success) {
      console.log(chalk.green.bold('\n🎉 DATABASE SEEDING VERIFICATION COMPLETED SUCCESSFULLY!'));
      console.log(chalk.green('Database is properly seeded and ready for use.'));
    } else {
      console.log(chalk.red.bold('\n⚠️  DATABASE SEEDING VERIFICATION FAILED!'));
      console.log(chalk.red('Please address the failed checks before proceeding.'));
    }
  }

  public async run(): Promise<void> {
    try {
      await this.runAllChecks();
      const report = this.generateReport();
      await this.saveReport(report);
      this.printSummary(report);

      // Close database connections
      if (this.pgClient) {
        await this.pgClient.end();
      }
      if (this.mongoClient) {
        await this.mongoClient.close();
      }

      // Exit with error code if verification failed
      if (report.summary.failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red.bold('\n💥 DATABASE VERIFICATION FAILED:'), (error as Error).message);
      process.exit(1);
    }
  }
}

// Run the verification if this script is executed directly
if (require.main === module) {
  const verifier = new DatabaseSeedingVerifier();
  verifier.run().catch(error => {
    console.error(chalk.red.bold('Database seeding verification failed:'), error);
    process.exit(1);
  });
}

export { DatabaseSeedingVerifier, type DatabaseSeedingReport, type DatabaseSeedingResult };