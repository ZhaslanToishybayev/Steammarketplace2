#!/usr/bin/env ts-node

import axios, { AxiosResponse, AxiosError } from 'axios';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const TIMEOUT = parseInt(process.env.TIMEOUT || '10000');
const VERBOSE = process.env.VERBOSE === 'true' || process.argv.includes('--verbose');

// Test configuration
interface TestConfig {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
  url: string;
  expectedStatus: number;
  headers?: Record<string, string>;
  authRequired?: boolean;
  description: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  status: number;
  responseTime: number;
  error?: string;
  description: string;
}

interface VerificationReport {
  timestamp: string;
  baseUrl: string;
  frontendOrigin: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  results: TestResult[];
  details: {
    backendInfo?: any;
    databaseStatus?: any;
    corsStatus?: any;
  };
}

class APIVerifier {
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}]`;

    switch (type) {
      case 'success':
        console.log(`${prefix} ${chalk.green('✅')} ${message}`);
        break;
      case 'error':
        console.log(`${prefix} ${chalk.red('❌')} ${message}`);
        break;
      case 'warning':
        console.log(`${prefix} ${chalk.yellow('⚠️')} ${message}`);
        break;
      default:
        console.log(`${prefix} ${chalk.blue('ℹ️')} ${message}`);
        break;
    }
  }

  private logVerbose(message: string) {
    if (VERBOSE) {
      this.log(message, 'info');
    }
  }

  async runTest(config: TestConfig): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const response = await axios({
        method: config.method,
        url: `${BASE_URL}${config.url}`,
        headers: config.headers,
        timeout: TIMEOUT,
        validateStatus: () => true, // Don't throw on any status code
      });

      const responseTime = Date.now() - startTime;
      const passed = response.status === config.expectedStatus;

      const result: TestResult = {
        name: config.name,
        passed,
        status: response.status,
        responseTime,
        description: config.description,
      };

      this.results.push(result);

      if (passed) {
        this.log(`✅ ${config.name} (${response.status} - ${responseTime}ms)`, 'success');
      } else {
        this.log(`❌ ${config.name} (Expected: ${config.expectedStatus}, Got: ${response.status} - ${responseTime}ms)`, 'error');
      }

      this.logVerbose(`   Response: ${JSON.stringify(response.data, null, 2)}`);

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const axiosError = error as AxiosError;

      const result: TestResult = {
        name: config.name,
        passed: false,
        status: axiosError.response?.status || 0,
        responseTime,
        error: axiosError.message || 'Unknown error',
        description: config.description,
      };

      this.results.push(result);

      this.log(`❌ ${config.name} (Error: ${axiosError.message} - ${responseTime}ms)`, 'error');
      this.logVerbose(`   Error details: ${axiosError.stack}`);

      return result;
    }
  }

  async testPublicEndpoints() {
    this.log('Testing public endpoints...');

    const publicTests: TestConfig[] = [
      {
        name: 'Health Check',
        method: 'GET',
        url: '/api/health',
        expectedStatus: 200,
        description: 'Main health check endpoint',
      },
      {
        name: 'Health Ready',
        method: 'GET',
        url: '/api/health/ready',
        expectedStatus: 200,
        description: 'Readiness health check',
      },
      {
        name: 'Health Live',
        method: 'GET',
        url: '/api/health/live',
        expectedStatus: 200,
        description: 'Liveness health check',
      },
      {
        name: 'Health Detailed',
        method: 'GET',
        url: '/api/health/detailed',
        expectedStatus: 200,
        description: 'Detailed health check with diagnostics',
      },
      {
        name: 'API Documentation',
        method: 'GET',
        url: '/api/docs',
        expectedStatus: 200,
        description: 'Swagger documentation endpoint',
      },
      {
        name: 'Metrics',
        method: 'GET',
        url: '/api/metrics',
        expectedStatus: 200,
        description: 'Prometheus metrics endpoint',
      },
      {
        name: 'Status Dashboard',
        method: 'GET',
        url: '/api/status',
        expectedStatus: 200,
        description: 'API status dashboard',
      },
    ];

    for (const test of publicTests) {
      await this.runTest(test);
    }
  }

  async testCORS() {
    this.log('Testing CORS configuration...');

    const corsTests: TestConfig[] = [
      {
        name: 'CORS Health Preflight',
        method: 'OPTIONS',
        url: '/api/health',
        expectedStatus: 200,
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type,Authorization',
        },
        description: 'CORS preflight request for health endpoint',
      },
      {
        name: 'CORS Auth Preflight',
        method: 'OPTIONS',
        url: '/api/auth/steam',
        expectedStatus: 200,
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Access-Control-Request-Method': 'GET',
        },
        description: 'CORS preflight request for auth endpoint',
      },
      {
        name: 'CORS with Origin Header',
        method: 'GET',
        url: '/api/health',
        expectedStatus: 200,
        headers: {
          'Origin': FRONTEND_ORIGIN,
        },
        description: 'Request with Origin header for CORS testing',
      },
    ];

    for (const test of corsTests) {
      await this.runTest(test);
    }
  }

  async testAuthEndpoints() {
    this.log('Testing authentication endpoints...');

    const authTests: TestConfig[] = [
      {
        name: 'Steam OAuth Initiation',
        method: 'GET',
        url: '/api/auth/steam',
        expectedStatus: 302,
        description: 'Steam OAuth initiation should redirect to Steam',
      },
      {
        name: 'Get Current User (No Auth)',
        method: 'GET',
        url: '/api/auth/me',
        expectedStatus: 401,
        description: 'Protected endpoint should return 401 without authentication',
      },
      {
        name: 'Refresh Token (No Auth)',
        method: 'POST',
        url: '/api/auth/refresh',
        expectedStatus: 401,
        description: 'Refresh endpoint should return 401 without authentication',
        headers: {
          'Content-Type': 'application/json',
        },
        authRequired: false,
      },
    ];

    for (const test of authTests) {
      await this.runTest(test);
    }
  }

  async testProtectedEndpoints() {
    this.log('Testing protected endpoints (should return 401 without JWT)...');

    const protectedTests: TestConfig[] = [
      {
        name: 'Get User Inventory',
        method: 'GET',
        url: '/api/inventory?appId=730&page=1&limit=10',
        expectedStatus: 401,
        description: 'Inventory endpoint should require authentication',
      },
      {
        name: 'Sync Inventory',
        method: 'POST',
        url: '/api/inventory/sync',
        expectedStatus: 401,
        headers: {
          'Content-Type': 'application/json',
        },
        description: 'Inventory sync should require authentication',
      },
      {
        name: 'Get Item Price',
        method: 'GET',
        url: '/api/pricing/item/test-item',
        expectedStatus: 401,
        description: 'Pricing endpoint should require authentication',
      },
      {
        name: 'Get Bot Management',
        method: 'GET',
        url: '/api/bots',
        expectedStatus: 401,
        description: 'Bot management should require authentication',
      },
      {
        name: 'Get Trade History',
        method: 'GET',
        url: '/api/trading/history?page=1&limit=10',
        expectedStatus: 401,
        description: 'Trade history should require authentication',
      },
    ];

    for (const test of protectedTests) {
      await this.runTest(test);
    }
  }

  async testDatabaseConnections() {
    this.log('Testing database connections via health endpoint...');

    try {
      const response = await axios.get(`${BASE_URL}/api/health/detailed`, { timeout: TIMEOUT });

      if (response.status === 200) {
        const healthData = response.data;

        // Check database status
        const dbStatus = healthData?.checks?.database?.status;
        if (dbStatus === 'healthy') {
          this.log('✅ Database connections are healthy', 'success');
        } else {
          this.log('❌ Database connections have issues', 'error');
          this.logVerbose(`Database status: ${JSON.stringify(healthData?.checks?.database, null, 2)}`);
        }

        // Check queue status
        const queueStatus = healthData?.checks?.queues?.status;
        if (queueStatus === 'healthy') {
          this.log('✅ Queue connections are healthy', 'success');
        } else {
          this.log('❌ Queue connections have issues', 'error');
          this.logVerbose(`Queue status: ${JSON.stringify(healthData?.checks?.queues, null, 2)}`);
        }

        // Check Redis status
        const redisStatus = healthData?.checks?.database?.details?.redis?.status;
        if (redisStatus === 'ok') {
          this.log('✅ Redis connection is healthy', 'success');
        } else {
          this.log('❌ Redis connection has issues', 'error');
        }
      }
    } catch (error) {
      this.log('❌ Could not retrieve detailed health information', 'error');
      this.logVerbose(`Error: ${error}`);
    }
  }

  async testBackendInfo() {
    this.log('Retrieving backend information...');

    try {
      const response = await axios.get(`${BASE_URL}/api/status`, { timeout: TIMEOUT });

      if (response.status === 200) {
        this.log('✅ Backend status endpoint is working', 'success');
        this.logVerbose(`Backend info: ${JSON.stringify(response.data, null, 2)}`);
        return response.data;
      }
    } catch (error) {
      this.log('⚠️ Backend status endpoint not available', 'warning');
    }

    return null;
  }

  generateReport(): VerificationReport {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      warnings: 0, // Could be calculated based on specific criteria
    };

    const report: VerificationReport = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      frontendOrigin: FRONTEND_ORIGIN,
      summary,
      results: this.results,
      details: {},
    };

    return report;
  }

  async saveReport(report: VerificationReport) {
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `api-verification-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);

    // Create symlink to latest report
    const latestPath = path.join(reportsDir, 'api-verification-latest.json');

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

    this.log(`📄 Report saved to: ${filepath}`);
  }

  printSummary(report: VerificationReport) {
    const { summary } = report;

    console.log('\n' + '='.repeat(60));
    console.log(chalk.bold('API VERIFICATION SUMMARY'));
    console.log('='.repeat(60));
    console.log(`📍 Base URL: ${chalk.cyan(BASE_URL)}`);
    console.log(`🌐 Frontend Origin: ${chalk.cyan(FRONTEND_ORIGIN)}`);
    console.log(`⏱️ Duration: ${Date.now() - this.startTime}ms`);
    console.log('');

    console.log(chalk.bold('📊 Results:'));
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   ✅ Passed: ${chalk.green(summary.passed)}`);
    console.log(`   ❌ Failed: ${chalk.red(summary.failed)}`);
    console.log(`   ⚠️ Warnings: ${chalk.yellow(summary.warnings)}`);
    console.log('');

    const passRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : '0';
    console.log(`📈 Pass Rate: ${passRate}%`);

    if (summary.failed > 0) {
      console.log('\n' + chalk.bold.red('❌ Failed Tests:'));
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`   • ${result.name}: ${result.error || `Status ${result.status}`}`);
        });
    }

    console.log('\n' + '='.repeat(60));

    if (summary.failed === 0) {
      console.log(chalk.bold.green('🎉 All tests passed! Backend API is ready for use.'));
    } else {
      console.log(chalk.bold.red('⚠️ Some tests failed. Please check the issues above.'));
    }
  }

  async run() {
    this.log('🚀 Starting API verification...', 'info');
    this.log(`📍 Testing against: ${BASE_URL}`, 'info');
    this.log(`🌐 Frontend origin: ${FRONTEND_ORIGIN}`, 'info');
    this.log('');

    // Run all test suites
    await this.testPublicEndpoints();
    await this.testCORS();
    await this.testAuthEndpoints();
    await this.testProtectedEndpoints();
    await this.testDatabaseConnections();
    const backendInfo = await this.testBackendInfo();

    // Generate and save report
    const report = this.generateReport();
    report.details.backendInfo = backendInfo;

    await this.saveReport(report);
    this.printSummary(report);

    // Exit with appropriate code
    process.exit(report.summary.failed > 0 ? 1 : 0);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${chalk.bold('API Verification Script')}

Usage: ts-node verify-api-endpoints.ts [options]

Options:
  --verbose, -v    Enable verbose logging
  --help, -h       Show this help message

Environment Variables:
  BASE_URL         Base URL for API (default: http://localhost:3001)
  FRONTEND_ORIGIN  Frontend origin for CORS testing (default: http://localhost:3000)
  TIMEOUT          Request timeout in ms (default: 10000)
  VERBOSE          Enable verbose mode (default: false)

Examples:
  ts-node verify-api-endpoints.ts
  ts-node verify-api-endpoints.ts --verbose
  BASE_URL=https://api.example.com ts-node verify-api-endpoints.ts
`);
  process.exit(0);
}

// Start verification
const verifier = new APIVerifier();
verifier.run().catch(error => {
  console.error(chalk.red('❌ Verification failed with error:'), error);
  process.exit(1);
});