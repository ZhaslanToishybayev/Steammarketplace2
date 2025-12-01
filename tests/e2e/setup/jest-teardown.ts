/**
 * Jest Teardown for E2E API Tests
 * Runs after all API tests to cleanup the test environment
 */

import { testConfig } from '../setup/test-config';
import TestDataSeeder from '../setup/test-data-seeder';
import { botManager } from '../setup/bot-simulator';

export default async (): Promise<void> => {
  console.log('🧹 Tearing down E2E API tests...');

  try {
    // Stop bot simulator
    await botManager.stopAll();
    console.log('✅ Bot simulator stopped');

    // Cleanup test data if not disabled
    if (process.env.CLEANUP_TEST_DATA !== 'false') {
      const seeder = new TestDataSeeder();
      await seeder.cleanup();
      await seeder.disconnect();
      console.log('✅ Test data cleaned up');
    }

    // Log test statistics
    const botStats = botManager.getStatistics();
    console.log('📊 API Test Summary:');
    console.log(`   Bot Statistics: ${botStats.onlineBots}/${botStats.totalBots} bots online`);
    console.log(`   Test Data Cleanup: ${process.env.CLEANUP_TEST_DATA !== 'false' ? 'Enabled' : 'Disabled'}`);

    console.log('✅ E2E API test teardown completed');

  } catch (error) {
    console.error('❌ E2E API test teardown failed:', error);
    // Don't throw error to avoid failing teardown
  }
};