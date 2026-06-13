#!/usr/bin/env ts-node

import axios, { AxiosResponse } from 'axios';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../apps/backend/.env') });

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
  details?: any;
}

class SteamIntegrationVerifier {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  private adminToken: string | null = null;
  private userToken: string | null = null;
  private results: TestResult[] = [];

  constructor(
    private verbose = false,
    private skipAuth = false,
    private outputFile?: string
  ) {}

  private log(message: string, color: 'green' | 'red' | 'yellow' | 'blue' | 'gray' = 'gray') {
    if (this.verbose) {
      console.log(chalk[color](message));
    }
  }

  private async runTest(name: string, testFn: () => Promise<{ status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any }>): Promise<void> {
    const startTime = performance.now();
    this.log(`\n🧪 Running: ${name}`, 'blue');

    try {
      const result = await testFn();
      const duration = performance.now() - startTime;

      this.results.push({
        name,
        status: result.status,
        message: result.message,
        duration,
        details: result.details
      });

      const statusIcon = result.status === 'PASS' ? '✅' : '❌';
      const statusColor = result.status === 'PASS' ? 'green' : 'red';
      this.log(`   ${statusIcon} ${name}: ${result.message} (${duration.toFixed(0)}ms)`, statusColor);

    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.results.push({
        name,
        status: 'FAIL',
        message: `Test failed: ${errorMessage}`,
        duration
      });

      this.log(`   ❌ ${name}: ${errorMessage} (${duration.toFixed(0)}ms)`, 'red');
    }
  }

  async testBackendHealth(): Promise<{ status: 'PASS' | 'FAIL', message: string, details?: any }> {
    try {
      const response: AxiosResponse = await axios.get(`${this.baseUrl}/api/health`, {
        timeout: 10000
      });

      if (response.status === 200 && response.data.status === 'ok') {
        const services = response.data.services;
        const allUp = Object.values(services).every((status: any) => status === 'up');

        if (allUp) {
          return {
            status: 'PASS',
            message: 'Backend health check passed - all services up'
          };
        } else {
          return {
            status: 'FAIL',
            message: `Some services down: ${JSON.stringify(services)}`,
            details: services
          };
        }
      } else {
        return {
          status: 'FAIL',
          message: `Health check failed with status ${response.status}`
        };
      }
    } catch (error) {
      return {
        status: 'FAIL',
        message: `Health check failed: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  async testSteamAPIConnectivity(): Promise<{ status: 'PASS' | 'FAIL', message: string }> {
    const apiKey = process.env.STEAM_API_KEY;

    if (!apiKey) {
      return {
        status: 'FAIL',
        message: 'STEAM_API_KEY not set in environment'
      };
    }

    try {
      // Test with Steam's GetPlayerSummaries API using a known Steam ID
      const response: AxiosResponse = await axios.get(
        'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/',
        {
          params: {
            key: apiKey,
            steamids: '76561197960435530' // Gabe Newell's Steam ID
          },
          timeout: 10000
        }
      );

      if (response.status === 200 && response.data.response.players.length > 0) {
        return {
          status: 'PASS',
          message: 'Steam API connectivity verified'
        };
      } else {
        return {
          status: 'FAIL',
          message: 'Steam API returned unexpected response'
        };
      }
    } catch (error) {
      return {
        status: 'FAIL',
        message: `Steam API connectivity failed: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  async testSteamOAuthEndpoints(): Promise<{ status: 'PASS' | 'FAIL', message: string, details?: any }> {
    try {
      // Test the Steam OAuth initiation endpoint
      const response: AxiosResponse = await axios.get(`${this.baseUrl}/api/auth/steam`, {
        timeout: 10000,
        maxRedirects: 0,
        validateStatus: (status) => status < 400 || status === 302
      });

      if (response.status === 302) {
        const redirectUrl = response.headers.location || response.headers.Location;

        if (redirectUrl && redirectUrl.includes('steamcommunity.com/openid/login')) {
          return {
            status: 'PASS',
            message: 'Steam OAuth endpoints working correctly'
          };
        } else {
          return {
            status: 'FAIL',
            message: 'Steam OAuth redirect URL incorrect',
            details: { redirectUrl }
          };
        }
      } else {
        return {
          status: 'FAIL',
          message: `Steam OAuth endpoint returned status ${response.status}`
        };
      }
    } catch (error) {
      return {
        status: 'FAIL',
        message: `Steam OAuth test failed: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  async testDatabaseConnections(): Promise<{ status: 'PASS' | 'FAIL', message: string, details?: any }> {
    const details: any = {};

    try {
      // Test PostgreSQL connection
      try {
        const pgResponse: AxiosResponse = await axios.get(`${this.baseUrl}/api/health/database`, {
          timeout: 5000
        });
        details.postgres = pgResponse.data.status === 'ok' ? 'up' : 'down';
      } catch (error) {
        details.postgres = 'down';
        details.postgresError = error instanceof Error ? error.message : error;
      }

      // Test Redis connection
      try {
        const redisResponse: AxiosResponse = await axios.get(`${this.baseUrl}/api/health/redis`, {
          timeout: 5000
        });
        details.redis = redisResponse.data.status === 'ok' ? 'up' : 'down';
      } catch (error) {
        details.redis = 'down';
        details.redisError = error instanceof Error ? error.message : error;
      }

      const allUp = details.postgres === 'up' && details.redis === 'up';

      if (allUp) {
        return {
          status: 'PASS',
          message: 'All database connections healthy',
          details
        };
      } else {
        return {
          status: 'FAIL',
          message: 'Some database connections down',
          details
        };
      }
    } catch (error) {
      return {
        status: 'FAIL',
        message: `Database connection test failed: ${error instanceof Error ? error.message : error}`,
        details
      };
    }
  }

  async testBotManagementEndpoints(): Promise<{ status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any }> {
    if (this.skipAuth) {
      return {
        status: 'SKIP',
        message: 'Skipping bot management tests (auth skipped)'
      };
    }

    if (!this.adminToken) {
      return {
        status: 'SKIP',
        message: 'No admin token available; skipping bot management tests'
      };
    }

    const testBotData = {
      accountName: 'test-bot-' + Date.now(),
      password: 'TestPassword123!',
      sharedSecret: 'dGVzdHNlY3JldHRlc3RzZWNyZXQ=',
      identitySecret: 'aWRlbnRpdHlzZWNyZXR0ZXN0c2VjcmV0',
      apiKey: process.env.STEAM_API_KEY,
      maxConcurrentTrades: 3
    };

    try {
      // Test GET /api/bots
      const getResponse: AxiosResponse = await axios.get(`${this.baseUrl}/api/bots`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 5000
      });

      if (getResponse.status !== 200) {
        return {
          status: 'FAIL',
          message: `GET /api/bots failed with status ${getResponse.status}`
        };
      }

      // Test POST /api/bots (create bot)
      const createResponse: AxiosResponse = await axios.post(`${this.baseUrl}/api/bots`, testBotData, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      if (createResponse.status !== 201) {
        return {
          status: 'FAIL',
          message: `POST /api/bots failed with status ${createResponse.status}`
        };
      }

      const createdBot = createResponse.data;
      const botId = createdBot.id;

      // Test DELETE /api/bots/:id (cleanup)
      const deleteResponse: AxiosResponse = await axios.delete(`${this.baseUrl}/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 5000
      });

      if (deleteResponse.status !== 200) {
        this.log(`Warning: Failed to cleanup test bot ${botId}`, 'yellow');
      }

      return {
        status: 'PASS',
        message: 'Bot management endpoints working correctly',
        details: {
          createBot: createResponse.status === 201,
          listBots: getResponse.status === 200,
          cleanup: deleteResponse.status === 200
        }
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: `Bot management test failed: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  async testInventoryEndpoints(): Promise<{ status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any }> {
    if (this.skipAuth) {
      return {
        status: 'SKIP',
        message: 'Skipping inventory tests (auth skipped)'
      };
    }

    if (!this.userToken) {
      return {
        status: 'SKIP',
        message: 'No user token available; skipping inventory tests'
      };
    }

    try {
      // Test GET /api/inventory
      const getInventoryResponse: AxiosResponse = await axios.get(`${this.baseUrl}/api/inventory`, {
        headers: { Authorization: `Bearer ${this.userToken}` },
        timeout: 5000
      });

      if (getInventoryResponse.status !== 200) {
        return {
          status: 'FAIL',
          message: `GET /api/inventory failed with status ${getInventoryResponse.status}`
        };
      }

      // Test POST /api/inventory/sync (this may take longer)
      const syncResponse: AxiosResponse = await axios.post(`${this.baseUrl}/api/inventory/sync`, {}, {
        headers: { Authorization: `Bearer ${this.userToken}` },
        timeout: 30000 // 30 seconds for sync operation
      });

      if (syncResponse.status !== 200) {
        return {
          status: 'FAIL',
          message: `POST /api/inventory/sync failed with status ${syncResponse.status}`
        };
      }

      return {
        status: 'PASS',
        message: 'Inventory endpoints working correctly',
        details: {
          getInventory: getInventoryResponse.status === 200,
          syncInventory: syncResponse.status === 200
        }
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: `Inventory test failed: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  async runAuthenticationFlow(): Promise<{ status: 'PASS' | 'FAIL' | 'SKIP', message: string }> {
    if (this.skipAuth) {
      return {
        status: 'SKIP',
        message: 'Skipping authentication flow (auth skipped)'
      };
    }

    try {
      // This would require a full OAuth flow which is complex to automate
      // For now, we'll just check if we can get a test token or use existing ones
      this.adminToken = process.env.TEST_ADMIN_TOKEN || null;
      this.userToken = process.env.TEST_USER_TOKEN || this.adminToken;

      if (!this.adminToken) {
        return {
          status: 'SKIP',
          message: 'No test tokens available, skipping authenticated tests'
        };
      }

      // Test token validation
      const response: AxiosResponse = await axios.get(`${this.baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 5000
      });

      if (response.status === 200) {
        return {
          status: 'PASS',
          message: 'Authentication flow test completed'
        };
      } else {
        return {
          status: 'FAIL',
          message: 'Authentication token validation failed'
        };
      }
    } catch (error) {
      return {
        status: 'FAIL',
        message: `Authentication test failed: ${error instanceof Error ? error.message : error}`
      };
    }
  }

  async generateReport(): Promise<void> {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const skippedTests = this.results.filter(r => r.status === 'SKIP').length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n' + '='.repeat(80));
    console.log(chalk.blue.bold('🧪 STEAM INTEGRATION VERIFICATION REPORT'));
    console.log('='.repeat(80));

    console.log(`\n📊 Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   ⏭️  Skipped: ${skippedTests}`);
    console.log(`   ⏱️  Total Time: ${totalTime.toFixed(0)}ms`);

    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    console.log(`   📈 Pass Rate: ${passRate.toFixed(1)}%`);

    console.log(`\n📋 Detailed Results:`);
    this.results.forEach((result, index) => {
      const statusIcon = result.status === 'PASS' ? '✅' :
                        result.status === 'FAIL' ? '❌' : '⏭️';
      const statusColor = result.status === 'PASS' ? 'green' :
                         result.status === 'FAIL' ? 'red' : 'yellow';

      console.log(`   ${index + 1}. ${statusIcon} ${result.name}`);
      console.log(`      ${result.message} (${result.duration.toFixed(0)}ms)`);
    });

    if (failedTests > 0) {
      console.log(`\n🔍 Failed Tests Details:`);
      this.results.filter(r => r.status === 'FAIL').forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.name}: ${result.message}`);
        if (result.details) {
          console.log(`      Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      });
    }

    // Determine overall status
    const overallStatus = failedTests === 0 ? 'PASS' : 'FAIL';
    const statusMessage = overallStatus === 'PASS'
      ? '🎉 All tests passed! Steam integration is working correctly.'
      : '⚠️  Some tests failed. Please review the issues above.';

    console.log(`\n🎯 Overall Status: ${overallStatus === 'PASS' ? chalk.green.bold('PASS') : chalk.red.bold('FAIL')}`);
    console.log(statusMessage);

    // Exit with error code if tests failed
    if (overallStatus === 'FAIL') {
      process.exit(1);
    }

    // Save report to file if requested
    if (this.outputFile) {
      const reportData = {
        timestamp: new Date().toISOString(),
        summary: {
          total: totalTests,
          passed: passedTests,
          failed: failedTests,
          skipped: skippedTests,
          passRate: passRate,
          totalTime: totalTime
        },
        results: this.results,
        overallStatus: overallStatus
      };

      fs.writeFileSync(this.outputFile, JSON.stringify(reportData, null, 2));
      console.log(`\n📄 Report saved to: ${this.outputFile}`);
    }
  }

  async runAllTests(): Promise<void> {
    console.log(chalk.blue.bold('🚀 Starting Steam Integration Verification...\n'));

    // Core infrastructure tests
    await this.runTest('Backend Health Check', () => this.testBackendHealth());
    await this.runTest('Steam API Connectivity', () => this.testSteamAPIConnectivity());
    await this.runTest('Steam OAuth Endpoints', () => this.testSteamOAuthEndpoints());
    await this.runTest('Database Connections', () => this.testDatabaseConnections());

    // Authentication flow
    await this.runTest('Authentication Flow', () => this.runAuthenticationFlow());

    // Authenticated endpoint tests
    await this.runTest('Bot Management Endpoints', () => this.testBotManagementEndpoints());
    await this.runTest('Inventory Endpoints', () => this.testInventoryEndpoints());

    // Generate final report
    await this.generateReport();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const skipAuth = args.includes('--skip-auth');
  let outputFile = args.find((arg, index) => args[index - 1] === '--output');

  if (outputFile && !args.includes('--output')) {
    outputFile = undefined;
  }

  if (!outputFile && args.includes('--output')) {
    outputFile = `scripts/reports/steam-integration-verification-${Date.now()}.json`;
  }

  // Ensure reports directory exists
  if (outputFile) {
    const reportsDir = path.dirname(outputFile);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  }

  const verifier = new SteamIntegrationVerifier(verbose, skipAuth, outputFile);
  await verifier.runAllTests();
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled Promise Rejection:'), error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Fatal Error:'), error);
    process.exit(1);
  });
}

export { SteamIntegrationVerifier };