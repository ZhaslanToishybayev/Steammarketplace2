# Testing Configuration for Steam Marketplace

## Test Scripts
{
  "test:unit": "jest --testPathPattern=unit --coverage --verbose",
  "test:integration": "jest --testPathPattern=integration --coverage --verbose",
  "test:e2e": "jest --testPathPattern=e2e --verbose",
  "test:steam": "jest --testPathPattern=steam --verbose",
  "test:trading": "jest --testPathPattern=trading --verbose",
  "test:auth": "jest --testPathPattern=auth --verbose",
  "test:inventory": "jest --testPathPattern=inventory --verbose",
  "test:performance": "jest --testPathPattern=performance --verbose",
  "test:smoke": "jest --testPathPattern=smoke --verbose",
  "test:security": "jest --testPathPattern=security --verbose",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:ci": "jest --ci --coverage --watchAll=false --testTimeout=30000",
  "test:debug": "jest --debug",
  "test:verbose": "jest --verbose",
  "lint:tests": "eslint tests/**/*.js",
  "lint:fix": "eslint tests/**/*.js --fix"
}

## Test Environment Variables
NODE_ENV=test
STEAM_API_KEY=test_api_key_for_testing
STEAM_REALM=http://localhost:3000
REDIS_URL=redis://localhost:6379
DB_URL=mongodb://localhost:27017/test_marketplace
PORT=3000

## Coverage Configuration
COVERAGE_THRESHOLD_LINES=80
COVERAGE_THRESHOLD_FUNCTIONS=80
COVERAGE_THRESHOLD_BRANCHES=80
COVERAGE_THRESHOLD_STATEMENTS=80

## Test Ports
TEST_PORT=3000
INTEGRATION_TEST_PORT=3001
E2E_TEST_PORT=3002

## Browser Testing
HEADLESS=true
BROWSER_TIMEOUT=30000
PAGE_LOAD_TIMEOUT=10000

## API Testing
API_BASE_URL=http://localhost:3000
API_TIMEOUT=5000
RETRY_ATTEMPTS=3
RETRY_DELAY=1000

## Performance Testing
PERFORMANCE_THRESHOLD_LOAD_TIME=3000
PERFORMANCE_THRESHOLD_API_RESPONSE=2000
PERFORMANCE_THRESHOLD_MEMORY_USAGE=100

## Security Testing
SECURITY_AUDIT_LEVEL=moderate
SECRET_SCAN_ENABLED=true
VULNERABILITY_SCAN_ENABLED=true