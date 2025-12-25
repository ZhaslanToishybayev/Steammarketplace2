/**
 * Playwright Global Teardown Script
 * Runs once after all tests to cleanup the test environment
 */

import { testConfig } from './test-config';
import TestDataSeeder from './test-data-seeder';
import { botManager } from './bot-simulator';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const sleep = promisify(setTimeout);

export default async function globalTeardown(): Promise<void> {
  console.log('🧹 Starting E2E test global teardown...');

  try {
    // 1. Stop bot simulator
    console.log('🤖 Stopping bot simulator...');
    await stopBotSimulator();

    // 2. Cleanup test data (optional)
    if (process.env.CLEANUP_TEST_DATA !== 'false') {
      console.log('🗑️  Cleaning up test data...');
      await cleanupTestData();
    }

    // 3. Collect logs
    console.log('📋 Collecting logs...');
    await collectLogs();

    // 4. Export metrics
    console.log('📊 Exporting metrics...');
    await exportMetrics();

    // 5. Database snapshot
    console.log('💾 Creating database snapshot...');
    await createDatabaseSnapshot();

    // 6. Generate final report
    console.log('📈 Generating final report...');
    await generateFinalReport();

    // 7. Archive artifacts
    console.log('📦 Archiving artifacts...');
    await archiveArtifacts();

    console.log('✅ Global teardown completed successfully');

    // Log summary
    logTeardownSummary();

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid failing teardown
  }
}

async function stopBotSimulator(): Promise<void> {
  try {
    await botManager.stopAll();
    console.log('✅ Bot simulator stopped');
  } catch (error) {
    console.warn('⚠️  Failed to stop bot simulator:', error);
  }
}

async function cleanupTestData(): Promise<void> {
  const seeder = new TestDataSeeder();

  try {
    await seeder.cleanup();
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.warn('⚠️  Failed to cleanup test data:', error);
  } finally {
    await seeder.disconnect();
  }
}

async function collectLogs(): Promise<void> {
  try {
    const artifactsDir = './tests/e2e/artifacts/logs';
    const backendLogsDir = './apps/backend/logs';

    if (!existsSync(backendLogsDir)) {
      console.warn('⚠️  Backend logs directory not found');
      return;
    }

    // Copy backend logs
    const { exec } = require('child_process');
    const promisifiedExec = promisify(exec);

    await promisifiedExec(`cp -r ${backendLogsDir}/* ${artifactsDir}/ 2>/dev/null || true`);

    // Collect Docker logs
    const dockerLogs = [
      'steam-marketplace-backend',
      'steam-marketplace-frontend',
      'steam-marketplace-postgres',
      'steam-marketplace-mongo',
      'steam-marketplace-redis'
    ];

    for (const container of dockerLogs) {
      try {
        const logs = await promisifiedExec(`docker logs ${container} 2>/dev/null || true`);
        if (logs.trim()) {
          await writeFile(`${artifactsDir}/${container}-docker.log`, logs);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to collect logs for ${container}:`, error);
      }
    }

    console.log('✅ Logs collected');
  } catch (error) {
    console.warn('⚠️  Failed to collect logs:', error);
  }
}

async function exportMetrics(): Promise<void> {
  try {
    const artifactsDir = './tests/e2e/artifacts/metrics';

    // Query Prometheus for metrics snapshot
    const prometheusUrl = `http://localhost:${testConfig.databases.redis.port === '6379' ? '9090' : '9090'}`;

    const metrics = {
      timestamp: new Date().toISOString(),
      httpMetrics: {},
      databaseMetrics: {},
      redisMetrics: {},
      queueMetrics: {},
    };

    // Collect HTTP metrics
    try {
      const httpResponse = await fetch(`${prometheusUrl}/api/v1/query?query=http_requests_total`);
      const httpData = await httpResponse.json();
      metrics.httpMetrics = httpData;
    } catch (error) {
      console.warn('⚠️  Failed to collect HTTP metrics:', error);
    }

    // Collect database metrics
    try {
      const dbResponse = await fetch(`${prometheusUrl}/api/v1/query?query=pg_stat_database`);
      const dbData = await dbResponse.json();
      metrics.databaseMetrics = dbData;
    } catch (error) {
      console.warn('⚠️  Failed to collect database metrics:', error);
    }

    // Collect Redis metrics
    try {
      const redisResponse = await fetch(`${prometheusUrl}/api/v1/query?query=redis_connected_clients`);
      const redisData = await redisResponse.json();
      metrics.redisMetrics = redisData;
    } catch (error) {
      console.warn('⚠️  Failed to collect Redis metrics:', error);
    }

    // Save metrics snapshot
    await writeFile(`${artifactsDir}/metrics-snapshot.json`, JSON.stringify(metrics, null, 2));

    console.log('✅ Metrics exported');
  } catch (error) {
    console.warn('⚠️  Failed to export metrics:', error);
  }
}

async function createDatabaseSnapshot(): Promise<void> {
  try {
    const artifactsDir = './tests/e2e/artifacts/db-snapshots';

    // PostgreSQL dump
    try {
      const { exec } = require('child_process');
      const promisifiedExec = promisify(exec);

      await promisifiedExec(
        `docker exec steam-marketplace-postgres pg_dump -U ${testConfig.databases.postgres.username} ${testConfig.databases.postgres.database} > ${artifactsDir}/postgres-snapshot.sql`
      );

      console.log('✅ PostgreSQL snapshot created');
    } catch (error) {
      console.warn('⚠️  Failed to create PostgreSQL snapshot:', error);
    }

    // MongoDB dump
    try {
      const { exec } = require('child_process');
      const promisifiedExec = promisify(exec);

      await promisifiedExec(
        `docker exec steam-marketplace-mongo mongodump --db ${testConfig.databases.mongodb.uri.split('/').pop()} --archive > ${artifactsDir}/mongodb-snapshot.archive`
      );

      console.log('✅ MongoDB snapshot created');
    } catch (error) {
      console.warn('⚠️  Failed to create MongoDB snapshot:', error);
    }

  } catch (error) {
    console.warn('⚠️  Failed to create database snapshots:', error);
  }
}

async function generateFinalReport(): Promise<void> {
  try {
    const artifactsDir = './tests/e2e/artifacts/reports';

    // Generate summary report
    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        baseUrl: testConfig.baseUrl,
        apiUrl: testConfig.apiUrl,
        wsUrl: testConfig.wsUrl,
      },
      botStatistics: botManager.getStatistics(),
      testConfiguration: {
        features: testConfig.features,
        timeouts: testConfig.timeouts,
        retry: testConfig.retry,
      },
      cleanupConfig: {
        cleanupTestData: process.env.CLEANUP_TEST_DATA !== 'false',
      },
    };

    await writeFile(`${artifactsDir}/teardown-summary.json`, JSON.stringify(summary, null, 2));

    console.log('✅ Final report generated');
  } catch (error) {
    console.warn('⚠️  Failed to generate final report:', error);
  }
}

async function archiveArtifacts(): Promise<void> {
  try {
    const artifactsDir = './tests/e2e/artifacts';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `e2e-test-artifacts-${timestamp}.zip`;

    const { exec } = require('child_process');
    const promisifiedExec = promisify(exec);

    await promisifiedExec(`cd ${artifactsDir}/.. && zip -r ${archiveName} artifacts/`);

    console.log(`✅ Artifacts archived to: ${artifactsDir}/../${archiveName}`);
  } catch (error) {
    console.warn('⚠️  Failed to archive artifacts:', error);
  }
}

function logTeardownSummary(): void {
  const botStats = botManager.getStatistics();

  console.log('\n📋 Teardown Summary:');
  console.log(`   Bot Statistics: ${botStats.onlineBots}/${botStats.totalBots} bots online, ${botStats.totalActiveTrades} active trades`);
  console.log(`   Test Data Cleanup: ${process.env.CLEANUP_TEST_DATA !== 'false' ? 'Enabled' : 'Disabled'}`);
  console.log(`   Artifacts Location: ./tests/e2e/artifacts/`);
  console.log(`   Reports Generated: teardown-summary.json, metrics-snapshot.json`);
  console.log('   🎉 E2E test suite completed!');
  console.log('');
}