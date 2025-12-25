import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { config } from 'dotenv';

config();

interface BenchmarkResult {
  query: string;
  executionTime: number;
  rowsReturned?: number;
  success: boolean;
  error?: string;
}

class DatabaseBenchmark {
  private pgPool: Pool;
  private mongoClient: MongoClient;
  private redisClient: any;

  constructor() {
    this.pgPool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER || 'steam_user',
      password: process.env.POSTGRES_PASSWORD || 'steam_password',
      database: process.env.POSTGRES_DB || 'steam_marketplace',
      max: 10,
      idleTimeoutMillis: 30000,
    });

    this.mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/steam_marketplace');

    this.redisClient = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async connect() {
    await this.pgPool.connect();
    await this.mongoClient.connect();
    await this.redisClient.connect();
  }

  async disconnect() {
    await this.pgPool.end();
    await this.mongoClient.close();
    await this.redisClient.disconnect();
  }

  async runBenchmark(queryName: string, queryFn: () => Promise<any>): Promise<BenchmarkResult> {
    const startTime = Date.now();

    try {
      const result = await queryFn();
      const executionTime = Date.now() - startTime;

      return {
        query: queryName,
        executionTime,
        rowsReturned: Array.isArray(result) ? result.length : 1,
        success: true,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        query: queryName,
        executionTime,
        success: false,
        error: error.message,
      };
    }
  }

  async benchmarkQueries(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    console.log('Starting database benchmark...\n');

    // PostgreSQL benchmarks
    console.log('Running PostgreSQL benchmarks...');

    // User lookup by Steam ID
    results.push(
      await this.runBenchmark('User lookup by Steam ID', async () => {
        const client = await this.pgPool.connect();
        try {
          const result = await client.query(
            'SELECT * FROM users WHERE steam_id = $1 AND is_active = true',
            ['76561198000000000']
          );
          return result.rows;
        } finally {
          client.release();
        }
      })
    );

    // Trade history with pagination
    results.push(
      await this.runBenchmark('Trade history with pagination', async () => {
        const client = await this.pgPool.connect();
        try {
          const result = await client.query(`
            SELECT t.*, u.username, b.name as bot_name
            FROM trades t
            LEFT JOIN users u ON t.user_id = u.id
            LEFT JOIN bots b ON t.bot_id = b.id
            WHERE t.user_id = $1 AND t.status != 'expired'
            ORDER BY t.created_at DESC
            LIMIT $2 OFFSET $3
          `, ['user-id', 20, 0]);
          return result.rows;
        } finally {
          client.release();
        }
      })
    );

    // Inventory fetch with filters
    results.push(
      await this.runBenchmark('Inventory fetch with filters', async () => {
        const client = await this.pgPool.connect();
        try {
          const result = await client.query(`
            SELECT i.*, im.name, im.market_hash_name, im.tradable as item_tradable
            FROM inventory i
            LEFT JOIN items im ON i.item_id = im.class_id
            WHERE i.user_id = $1 AND i.app_id = $2 AND i.tradable = true
            ORDER BY i.created_at DESC
            LIMIT $3
          `, ['user-id', 730, 50]);
          return result.rows;
        } finally {
          client.release();
        }
      })
    );

    // Price history aggregations
    results.push(
      await this.runBenchmark('Price history aggregations', async () => {
        const client = await this.pgPool.connect();
        try {
          const result = await client.query(`
            SELECT
              DATE(price_date) as date,
              AVG(price) as avg_price,
              MIN(price) as min_price,
              MAX(price) as max_price,
              SUM(volume) as total_volume
            FROM item_prices
            WHERE market_hash_name = $1
              AND price_date >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(price_date)
            ORDER BY date DESC
            LIMIT 30
          `, ['AK-47 | Redline (Factory New)']);
          return result.rows;
        } finally {
          client.release();
        }
      })
    );

    // Transaction history
    results.push(
      await this.runBenchmark('Transaction history', async () => {
        const client = await this.pgPool.connect();
        try {
          const result = await client.query(`
            SELECT t.*, tr.trade_id, tr.trade_type
            FROM transactions t
            LEFT JOIN trades tr ON t.trade_id = tr.id
            WHERE t.user_id = $1
              AND t.created_at >= NOW() - INTERVAL '90 days'
            ORDER BY t.created_at DESC
            LIMIT $2
          `, ['user-id', 100]);
          return result.rows;
        } finally {
          client.release();
        }
      })
    );

    // MongoDB benchmarks
    console.log('Running MongoDB benchmarks...');

    // Item lookup by classId
    results.push(
      await this.runBenchmark('Item lookup by classId', async () => {
        const db = this.mongoClient.db('steam_marketplace');
        const collection = db.collection('items');
        const result = await collection.findOne({ classId: '12345' });
        return result ? [result] : [];
      })
    );

    // Bulk item metadata lookup
    results.push(
      await this.runBenchmark('Bulk item metadata lookup', async () => {
        const db = this.mongoClient.db('steam_marketplace');
        const collection = db.collection('items');
        const classIds = ['12345', '12346', '12347', '12348', '12349'];
        const result = await collection.find({ classId: { $in: classIds } }).toArray();
        return result;
      })
    );

    // Redis benchmarks
    console.log('Running Redis benchmarks...');

    // Cache hit
    results.push(
      await this.runBenchmark('Redis cache hit', async () => {
        await this.redisClient.set('test-key', JSON.stringify({ data: 'test' }), 'EX', 3600);
        const result = await this.redisClient.get('test-key');
        return result ? [result] : [];
      })
    );

    // Cache miss
    results.push(
      await this.runBenchmark('Redis cache miss', async () => {
        const result = await this.redisClient.get('non-existent-key');
        return result ? [result] : [];
      })
    );

    // Bulk operations
    results.push(
      await this.runBenchmark('Redis bulk operations', async () => {
        const keys = Array.from({ length: 100 }, (_, i) => `bulk-test-${i}`);
        const values = keys.map(key => JSON.stringify({ key, data: `data-${key}` }));

        // Set multiple keys
        await Promise.all(
          keys.map((key, i) => this.redisClient.set(key, values[i], 'EX', 3600))
        );

        // Get multiple keys
        const results = await Promise.all(keys.map(key => this.redisClient.get(key)));
        return results.filter(r => r !== null);
      })
    );

    return results;
  }

  generateReport(results: BenchmarkResult[]): void {
    console.log('\n' + '='.repeat(80));
    console.log('DATABASE BENCHMARK REPORT');
    console.log('='.repeat(80));

    const pgResults = results.filter(r => r.query.includes('PostgreSQL') || !r.query.includes('MongoDB') && !r.query.includes('Redis'));
    const mongoResults = results.filter(r => r.query.includes('MongoDB'));
    const redisResults = results.filter(r => r.query.includes('Redis'));

    console.log('\nPostgreSQL Results:');
    console.log('-'.repeat(40));
    pgResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.query}: ${result.executionTime}ms`);
      if (result.rowsReturned) {
        console.log(`   Rows returned: ${result.rowsReturned}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\nMongoDB Results:');
    console.log('-'.repeat(40));
    mongoResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.query}: ${result.executionTime}ms`);
      if (result.rowsReturned) {
        console.log(`   Rows returned: ${result.rowsReturned}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\nRedis Results:');
    console.log('-'.repeat(40));
    redisResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.query}: ${result.executionTime}ms`);
      if (result.rowsReturned) {
        console.log(`   Operations: ${result.rowsReturned}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    // Performance analysis
    console.log('\nPERFORMANCE ANALYSIS:');
    console.log('-'.repeat(40));

    const avgPgTime = pgResults.reduce((sum, r) => sum + r.executionTime, 0) / pgResults.length;
    const avgMongoTime = mongoResults.reduce((sum, r) => sum + r.executionTime, 0) / mongoResults.length;
    const avgRedisTime = redisResults.reduce((sum, r) => sum + r.executionTime, 0) / redisResults.length;

    console.log(`Average PostgreSQL query time: ${avgPgTime.toFixed(2)}ms`);
    console.log(`Average MongoDB query time: ${avgMongoTime.toFixed(2)}ms`);
    console.log(`Average Redis operation time: ${avgRedisTime.toFixed(2)}ms`);

    // Recommendations
    console.log('\nRECOMMENDATIONS:');
    console.log('-'.repeat(40));

    if (avgPgTime > 100) {
      console.log('⚠️  PostgreSQL queries are slow. Consider:');
      console.log('   - Adding missing indexes');
      console.log('   - Optimizing query patterns');
      console.log('   - Increasing connection pool size');
    }

    if (avgMongoTime > 50) {
      console.log('⚠️  MongoDB queries are slow. Consider:');
      console.log('   - Adding appropriate indexes');
      console.log('   - Optimizing collection structure');
      console.log('   - Reviewing query patterns');
    }

    if (avgRedisTime > 10) {
      console.log('⚠️  Redis operations are slow. Consider:');
      console.log('   - Checking Redis memory usage');
      console.log('   - Optimizing key patterns');
      console.log('   - Reviewing Redis configuration');
    }

    console.log('\n' + '='.repeat(80));
  }

  async runExplainAnalyze(query: string, params: any[] = []): Promise<void> {
    console.log(`\nRunning EXPLAIN ANALYZE for: ${query}`);

    const client = await this.pgPool.connect();
    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const result = await client.query(explainQuery, params);

      console.log('Query Plan:');
      console.log(JSON.stringify(result.rows[0].QUERY PLAN, null, 2));
    } finally {
      client.release();
    }
  }
}

// Main execution
async function main() {
  const benchmark = new DatabaseBenchmark();

  try {
    await benchmark.connect();
    const results = await benchmark.benchmarkQueries();
    benchmark.generateReport(results);

    // Run detailed analysis on slow queries
    console.log('\nRunning detailed query analysis...');
    await benchmark.runExplainAnalyze(
      'SELECT * FROM users WHERE steam_id = $1 AND is_active = true',
      ['76561198000000000']
    );
  } catch (error) {
    console.error('Benchmark failed:', error);
  } finally {
    await benchmark.disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { DatabaseBenchmark };