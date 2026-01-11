// Global setup for tests
module.exports = async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.STEAM_API_KEY = 'test_api_key_for_testing';
  process.env.STEAM_REALM = 'http://localhost:3000';

  // Mock console.log to reduce noise in tests (unless DEBUG is set)
  if (!process.env.DEBUG && !process.argv.includes('--verbose')) {
    console.log = () => {};
  }

  console.log('🧪 Starting Steam Marketplace test suite...');
  console.log('📋 Environment:', process.env.NODE_ENV);
  console.log('🔧 Test timeout:', process.env.JEST_TEST_TIMEOUT || '30000ms');
};