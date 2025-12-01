/**
 * Playwright Global Setup Script
 * Runs once before all tests to prepare the test environment
 */

import { testConfig } from './test-config';
import TestDataSeeder from './test-data-seeder';
import { botManager } from './bot-simulator';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';

const sleep = promisify(setTimeout);

export default async function globalSetup(): Promise<void> {
  console.log('🚀 Starting E2E test global setup...');

  try {
    // 1. Verify Docker services are running
    console.log('🐳 Verifying Docker services...');
    await verifyDockerServices();

    // 2. Verify backend is running
    console.log('🔧 Verifying backend service...');
    await verifyBackendService();

    // 3. Verify frontend is running
    console.log('🌐 Verifying frontend service...');
    await verifyFrontendService();

    // 4. Seed test data
    console.log('📦 Seeding test data...');
    await seedTestData();

    // 5. Initialize bot simulator
    console.log('🤖 Initializing bot simulator...');
    await initializeBotSimulator();

    // 6. Clear Redis cache
    console.log('🧹 Clearing Redis cache...');
    await clearRedisCache();

    // 7. Create test artifacts directory
    console.log('📁 Creating test artifacts directory...');
    await createArtifactsDirectory();

    console.log('✅ Global setup completed successfully');

    // Log environment summary
    logEnvironmentSummary();

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function verifyDockerServices(): Promise<void> {
  const services = ['postgres', 'mongodb', 'redis'];

  for (const service of services) {
    let attempts = 0;
    const maxAttempts = 3;
    const delay = 10000; // 10 seconds

    while (attempts < maxAttempts) {
      try {
        const isHealthy = await checkServiceHealth(service);
        if (isHealthy) {
          console.log(`✅ ${service} service is healthy`);
          break;
        }
      } catch (error) {
        console.log(`⚠️  ${service} service not ready (attempt ${attempts + 1}/${maxAttempts})`);
      }

      attempts++;
      if (attempts < maxAttempts) {
        await sleep(delay);
      }
    }

    if (attempts === maxAttempts) {
      throw new Error(`❌ ${service} service failed health check after ${maxAttempts} attempts`);
    }
  }
}

async function checkServiceHealth(service: string): Promise<boolean> {
  try {
    const { exec } = require('child_process');
    const promisifiedExec = promisify(exec);

    switch (service) {
      case 'postgres':
        const { execSync } = require('child_process');
        execSync('docker exec steam-marketplace-postgres pg_isready -U steam_user -d steam_marketplace', { stdio: 'ignore' });
        return true;

      case 'mongodb':
        execSync('docker exec steam-marketplace-mongo mongosh --eval "db.runCommand(\'ping\').ok" --quiet', { stdio: 'ignore' });
        return true;

      case 'redis':
        execSync('docker exec steam-marketplace-redis redis-cli ping', { stdio: 'ignore' });
        return true;

      default:
        return false;
    }
  } catch {
    return false;
  }
}

async function verifyBackendService(): Promise<void> {
  let attempts = 0;
  const maxAttempts = 12; // 2 minutes with 10-second intervals
  const delay = 10000; // 10 seconds

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${testConfig.apiUrl}/health`);
      if (response.ok) {
        const health = await response.json();
        console.log(`✅ Backend service is healthy:`, health);
        return;
      }
    } catch (error) {
      console.log(`⚠️  Backend service not ready (attempt ${attempts + 1}/${maxAttempts})`);
    }

    attempts++;
    if (attempts < maxAttempts) {
      await sleep(delay);
    }
  }

  throw new Error(`❌ Backend service failed health check after ${maxAttempts} attempts`);
}

async function verifyFrontendService(): Promise<void> {
  let attempts = 0;
  const maxAttempts = 12; // 2 minutes with 10-second intervals
  const delay = 10000; // 10 seconds

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(testConfig.baseUrl);
      if (response.ok) {
        console.log(`✅ Frontend service is ready`);
        return;
      }
    } catch (error) {
      console.log(`⚠️  Frontend service not ready (attempt ${attempts + 1}/${maxAttempts})`);
    }

    attempts++;
    if (attempts < maxAttempts) {
      await sleep(delay);
    }
  }

  throw new Error(`❌ Frontend service failed health check after ${maxAttempts} attempts`);
}

async function seedTestData(): Promise<void> {
  const seeder = new TestDataSeeder();

  try {
    await seeder.seedAll();
  } finally {
    await seeder.disconnect();
  }
}

async function initializeBotSimulator(): Promise<void> {
  // Add test bots to manager
  botManager.addBot({
    accountName: 'testbot1',
    sharedSecret: 'test-shared-secret-1',
    identitySecret: 'test-identity-secret-1',
    steamId: '76561198012345678',
  });

  botManager.addBot({
    accountName: 'testbot2',
    sharedSecret: 'test-shared-secret-2',
    identitySecret: 'test-identity-secret-2',
    steamId: '76561198087654321',
  });

  // Start all bots
  await botManager.startAll();

  // Configure bots for testing
  const bots = botManager.getAllBots();
  bots.forEach(bot => {
    bot.configure({
      loginDelay: 1000,
      tradeAcceptanceDelay: 2000,
      failureRate: 0.05, // 5% failure rate for testing
    });
  });

  console.log(`🤖 Bot simulator initialized with ${bots.length} bots`);
}

async function clearRedisCache(): Promise<void> {
  try {
    const { createClient } = require('redis');
    const redis = createClient({
      url: `redis://:${testConfig.databases.redis.password}@localhost:${testConfig.databases.redis.port}`,
    });

    await redis.connect();
    await redis.flushDb();
    await redis.disconnect();

    console.log('✅ Redis cache cleared');
  } catch (error) {
    console.warn('⚠️  Failed to clear Redis cache:', error);
  }
}

async function createArtifactsDirectory(): Promise<void> {
  const artifactsDir = './tests/e2e/artifacts';
  const subdirs = ['screenshots', 'videos', 'logs', 'reports', 'metrics', 'db-snapshots'];

  try {
    await mkdir(artifactsDir, { recursive: true });

    for (const subdir of subdirs) {
      await mkdir(`${artifactsDir}/${subdir}`, { recursive: true });
    }

    console.log(`✅ Created artifacts directory: ${artifactsDir}`);
  } catch (error) {
    console.warn('⚠️  Failed to create artifacts directory:', error);
  }
}

function logEnvironmentSummary(): void {
  console.log('\n📋 Test Environment Summary:');
  console.log(`   Base URL: ${testConfig.baseUrl}`);
  console.log(`   API URL: ${testConfig.apiUrl}`);
  console.log(`   WebSocket URL: ${testConfig.wsUrl}`);
  console.log(`   Test Users: ${Object.keys(testConfig.users).join(', ')}`);
  console.log(`   Bot Count: ${botManager.getAllBots().length}`);
  console.log(`   Feature Flags: ${Object.entries(testConfig.features).filter(([, enabled]) => enabled).map(([feature]) => feature).join(', ')}`);
  console.log('');
}