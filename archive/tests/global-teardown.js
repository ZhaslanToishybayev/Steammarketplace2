// Global teardown for tests
module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');

  // Clean up any global resources
  if (global.testServer) {
    await new Promise(resolve => {
      global.testServer.close(resolve);
    });
  }

  // Clean up any test data
  if (global.testUtils && global.testUtils.cleanup) {
    await global.testUtils.cleanup();
  }

  console.log('✅ Test suite completed successfully!');
  console.log('📊 Check coverage reports in ./tests/reports/');
};