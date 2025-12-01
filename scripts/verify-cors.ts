#!/usr/bin/env ts-node

import axios, { AxiosResponse } from 'axios';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const TIMEOUT = parseInt(process.env.TIMEOUT || '10000');
const VERBOSE = process.env.VERBOSE === 'true' || process.argv.includes('--verbose');

interface CORSTestConfig {
  name: string;
  method: string;
  url: string;
  origin: string;
  expectedHeaders: string[];
  description: string;
}

interface CORSTestResult {
  name: string;
  passed: boolean;
  actualHeaders: Record<string, string>;
  missingHeaders: string[];
  unexpectedHeaders: string[];
  error?: string;
  description: string;
}

interface CORSReport {
  timestamp: string;
  baseUrl: string;
  frontendOrigin: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  results: CORSTestResult[];
  corsConfig: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    credentialsSupported: boolean;
    maxAge: number;
  };
}

class CORSVerifier {
  private results: CORSTestResult[] = [];
  private corsConfig: any = {};

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

  async runCORSTest(config: CORSTestConfig): Promise<CORSTestResult> {
    try {
      this.log(`Testing CORS for ${config.name}...`);

      const response = await axios({
        method: 'OPTIONS',
        url: `${BASE_URL}${config.url}`,
        headers: {
          'Origin': config.origin,
          'Access-Control-Request-Method': config.method,
          'Access-Control-Request-Headers': 'Content-Type,Authorization',
        },
        timeout: TIMEOUT,
        validateStatus: () => true,
      });

      const actualHeaders: Record<string, string> = {};
      const missingHeaders: string[] = [];
      const unexpectedHeaders: string[] = [];

      // Extract actual CORS headers
      Object.keys(response.headers).forEach(key => {
        if (key.toLowerCase().startsWith('access-control-')) {
          actualHeaders[key] = response.headers[key];
        }
      });

      // Check for expected headers
      config.expectedHeaders.forEach(header => {
        const headerKey = Object.keys(actualHeaders).find(k => k.toLowerCase() === header.toLowerCase());
        if (!headerKey) {
          missingHeaders.push(header);
        }
      });

      // Log results
      if (missingHeaders.length === 0) {
        this.log(`✅ ${config.name} - All CORS headers present`, 'success');
      } else {
        this.log(`❌ ${config.name} - Missing headers: ${missingHeaders.join(', ')}`, 'error');
      }

      this.logVerbose(`   Actual headers: ${JSON.stringify(actualHeaders, null, 2)}`);

      const result: CORSTestResult = {
        name: config.name,
        passed: missingHeaders.length === 0,
        actualHeaders,
        missingHeaders,
        unexpectedHeaders,
        description: config.description,
      };

      this.results.push(result);
      return result;

    } catch (error) {
      const axiosError = error as any;

      this.log(`❌ ${config.name} - Error: ${axiosError.message}`, 'error');

      const result: CORSTestResult = {
        name: config.name,
        passed: false,
        actualHeaders: {},
        missingHeaders: config.expectedHeaders,
        unexpectedHeaders: [],
        error: axiosError.message,
        description: config.description,
      };

      this.results.push(result);
      return result;
    }
  }

  async testBasicCORSEndpoints() {
    this.log('Testing basic CORS configuration...');

    const corsTests: CORSTestConfig[] = [
      {
        name: 'Health Endpoint CORS',
        method: 'GET',
        url: '/api/health',
        origin: FRONTEND_ORIGIN,
        expectedHeaders: [
          'access-control-allow-origin',
          'access-control-allow-methods',
          'access-control-allow-headers',
          'access-control-allow-credentials',
        ],
        description: 'Basic CORS test for health endpoint',
      },
      {
        name: 'Auth Endpoint CORS',
        method: 'GET',
        url: '/api/auth/steam',
        origin: FRONTEND_ORIGIN,
        expectedHeaders: [
          'access-control-allow-origin',
          'access-control-allow-methods',
          'access-control-allow-headers',
          'access-control-allow-credentials',
        ],
        description: 'CORS test for Steam OAuth endpoint',
      },
      {
        name: 'Inventory Endpoint CORS',
        method: 'GET',
        url: '/api/inventory',
        origin: FRONTEND_ORIGIN,
        expectedHeaders: [
          'access-control-allow-origin',
          'access-control-allow-methods',
          'access-control-allow-headers',
          'access-control-allow-credentials',
        ],
        description: 'CORS test for inventory endpoint',
      },
      {
        name: 'Pricing Endpoint CORS',
        method: 'GET',
        url: '/api/pricing/item/test',
        origin: FRONTEND_ORIGIN,
        expectedHeaders: [
          'access-control-allow-origin',
          'access-control-allow-methods',
          'access-control-allow-headers',
          'access-control-allow-credentials',
        ],
        description: 'CORS test for pricing endpoint',
      },
    ];

    for (const test of corsTests) {
      await this.runCORSTest(test);
    }
  }

  async testDifferentOrigins() {
    this.log('Testing different origin configurations...');

    const originTests = [
      {
        name: 'Allowed Origin (localhost:3000)',
        origin: 'http://localhost:3000',
        shouldAllow: true,
      },
      {
        name: 'Allowed Origin (localhost:3001)',
        origin: 'http://localhost:3001',
        shouldAllow: true,
      },
      {
        name: 'HTTPS localhost',
        origin: 'https://localhost:3000',
        shouldAllow: true,
      },
      {
        name: 'Blocked Origin (example.com)',
        origin: 'https://example.com',
        shouldAllow: false,
      },
    ];

    for (const test of originTests) {
      try {
        const response = await axios({
          method: 'OPTIONS',
          url: `${BASE_URL}/api/health`,
          headers: {
            'Origin': test.origin,
            'Access-Control-Request-Method': 'GET',
          },
          timeout: TIMEOUT,
          validateStatus: () => true,
        });

        const allowOrigin = response.headers['access-control-allow-origin'];

        if (test.shouldAllow && allowOrigin === test.origin) {
          this.log(`✅ ${test.name} - Correctly allowed`, 'success');
        } else if (!test.shouldAllow && !allowOrigin) {
          this.log(`✅ ${test.name} - Correctly blocked`, 'success');
        } else if (test.shouldAllow && !allowOrigin) {
          this.log(`❌ ${test.name} - Should be allowed but was blocked`, 'error');
        } else {
          this.log(`❌ ${test.name} - Should be blocked but was allowed`, 'error');
        }

        this.logVerbose(`   Origin: ${test.origin}, Allow-Origin: ${allowOrigin}`);

      } catch (error) {
        this.log(`❌ ${test.name} - Error: ${error}`, 'error');
      }
    }
  }

  async testHTTPMethods() {
    this.log('Testing allowed HTTP methods...');

    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

    try {
      const response = await axios({
        method: 'OPTIONS',
        url: `${BASE_URL}/api/health`,
        headers: {
          'Origin': FRONTEND_ORIGIN,
        },
        timeout: TIMEOUT,
        validateStatus: () => true,
      });

      const allowedMethods = response.headers['access-control-allow-methods'];
      this.logVerbose(`Allowed methods header: ${allowedMethods}`);

      if (allowedMethods) {
        const methodsArray = allowedMethods.split(',').map(m => m.trim());
        const missingMethods = methods.filter(m => !methodsArray.includes(m));

        if (missingMethods.length === 0) {
          this.log(`✅ All expected methods are allowed: ${methods.join(', ')}`, 'success');
        } else {
          this.log(`❌ Missing methods: ${missingMethods.join(', ')}`, 'error');
        }
      } else {
        this.log('❌ No Access-Control-Allow-Methods header found', 'error');
      }

    } catch (error) {
      this.log(`❌ Error testing HTTP methods: ${error}`, 'error');
    }
  }

  async testHeaders() {
    this.log('Testing allowed headers...');

    const expectedHeaders = ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'];

    try {
      const response = await axios({
        method: 'OPTIONS',
        url: `${BASE_URL}/api/health`,
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Access-Control-Request-Method': 'GET',
        },
        timeout: TIMEOUT,
        validateStatus: () => true,
      });

      const allowedHeaders = response.headers['access-control-allow-headers'];
      this.logVerbose(`Allowed headers header: ${allowedHeaders}`);

      if (allowedHeaders) {
        const headersArray = allowedHeaders.split(',').map(h => h.trim());
        const missingHeaders = expectedHeaders.filter(h => !headersArray.includes(h));

        if (missingHeaders.length === 0) {
          this.log(`✅ All expected headers are allowed: ${expectedHeaders.join(', ')}`, 'success');
        } else {
          this.log(`❌ Missing headers: ${missingHeaders.join(', ')}`, 'error');
        }
      } else {
        this.log('❌ No Access-Control-Allow-Headers header found', 'error');
      }

    } catch (error) {
      this.log(`❌ Error testing headers: ${error}`, 'error');
    }
  }

  async testCredentials() {
    this.log('Testing credentials support...');

    try {
      const response = await axios({
        method: 'OPTIONS',
        url: `${BASE_URL}/api/health`,
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization',
        },
        timeout: TIMEOUT,
        validateStatus: () => true,
      });

      const credentialsSupported = response.headers['access-control-allow-credentials'];

      if (credentialsSupported === 'true') {
        this.log('✅ Credentials are supported (Access-Control-Allow-Credentials: true)', 'success');
      } else {
        this.log(`❌ Credentials not supported or missing: ${credentialsSupported}`, 'error');
      }

    } catch (error) {
      this.log(`❌ Error testing credentials: ${error}`, 'error');
    }
  }

  async testActualRequests() {
    this.log('Testing actual CORS requests (not just preflight)...');

    const testRequests = [
      {
        name: 'GET request with Origin',
        method: 'GET',
        url: '/api/health',
      },
      {
        name: 'POST request with Origin',
        method: 'POST',
        url: '/api/auth/refresh',
        data: {},
      },
    ];

    for (const test of testRequests) {
      try {
        const response = await axios({
          method: test.method,
          url: `${BASE_URL}${test.url}`,
          headers: {
            'Origin': FRONTEND_ORIGIN,
            ...(test.method === 'POST' && {
              'Content-Type': 'application/json',
            }),
          },
          data: test.data || {},
          timeout: TIMEOUT,
          validateStatus: () => true,
        });

        const corsHeaders = Object.keys(response.headers).filter(h =>
          h.toLowerCase().startsWith('access-control-')
        );

        if (corsHeaders.length > 0) {
          this.log(`✅ ${test.name} - CORS headers present in actual request`, 'success');
          this.logVerbose(`   CORS headers: ${corsHeaders.join(', ')}`);
        } else {
          this.log(`⚠️ ${test.name} - No CORS headers in actual request`, 'warning');
        }

      } catch (error) {
        this.log(`❌ ${test.name} - Error: ${error}`, 'error');
      }
    }
  }

  async extractCORSConfig() {
    this.log('Extracting CORS configuration from responses...');

    try {
      const response = await axios({
        method: 'OPTIONS',
        url: `${BASE_URL}/api/health`,
        headers: {
          'Origin': FRONTEND_ORIGIN,
          'Access-Control-Request-Method': 'GET',
        },
        timeout: TIMEOUT,
        validateStatus: () => true,
      });

      this.corsConfig = {
        allowedOrigins: [FRONTEND_ORIGIN], // This would need to be extracted from server config
        allowedMethods: response.headers['access-control-allow-methods']?.split(',').map(m => m.trim()) || [],
        allowedHeaders: response.headers['access-control-allow-headers']?.split(',').map(h => h.trim()) || [],
        credentialsSupported: response.headers['access-control-allow-credentials'] === 'true',
        maxAge: parseInt(response.headers['access-control-max-age'] || '86400'),
      };

      this.logVerbose(`CORS Configuration: ${JSON.stringify(this.corsConfig, null, 2)}`);

    } catch (error) {
      this.log(`❌ Error extracting CORS config: ${error}`, 'error');
    }
  }

  generateReport(): CORSReport {
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      warnings: 0, // Could be calculated based on specific criteria
    };

    const report: CORSReport = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      frontendOrigin: FRONTEND_ORIGIN,
      summary,
      results: this.results,
      corsConfig: this.corsConfig,
    };

    return report;
  }

  async saveReport(report: CORSReport) {
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cors-verification-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);

    // Create symlink to latest report
    const latestPath = path.join(reportsDir, 'cors-verification-latest.json');

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

    this.log(`📄 Report saved to: ${filepath}`);
  }

  printSummary(report: CORSReport) {
    const { summary } = report;

    console.log('\n' + '='.repeat(60));
    console.log(chalk.bold('CORS VERIFICATION SUMMARY'));
    console.log('='.repeat(60));
    console.log(`📍 Base URL: ${chalk.cyan(BASE_URL)}`);
    console.log(`🌐 Frontend Origin: ${chalk.cyan(FRONTEND_ORIGIN)}`);
    console.log('');

    console.log(chalk.bold('📊 Results:'));
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   ✅ Passed: ${chalk.green(summary.passed)}`);
    console.log(`   ❌ Failed: ${chalk.red(summary.failed)}`);
    console.log(`   ⚠️ Warnings: ${chalk.yellow(summary.warnings)}`);
    console.log('');

    const passRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : '0';
    console.log(`📈 Pass Rate: ${passRate}%`);

    console.log('\n' + chalk.bold('🔧 CORS Configuration:'));
    console.log(`   Allowed Origins: ${report.corsConfig.allowedOrigins?.join(', ') || 'None'}`);
    console.log(`   Allowed Methods: ${report.corsConfig.allowedMethods?.join(', ') || 'None'}`);
    console.log(`   Allowed Headers: ${report.corsConfig.allowedHeaders?.join(', ') || 'None'}`);
    console.log(`   Credentials Supported: ${report.corsConfig.credentialsSupported ? 'Yes' : 'No'}`);
    console.log(`   Max Age: ${report.corsConfig.maxAge} seconds`);

    if (summary.failed > 0) {
      console.log('\n' + chalk.bold.red('❌ Failed Tests:'));
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`   • ${result.name}: ${result.error || 'Missing headers: ' + result.missingHeaders.join(', ')}`);
        });
    }

    console.log('\n' + '='.repeat(60));

    if (summary.failed === 0) {
      console.log(chalk.bold.green('🎉 All CORS tests passed! Frontend can successfully communicate with backend.'));
    } else {
      console.log(chalk.bold.red('⚠️ Some CORS tests failed. Frontend may have issues communicating with backend.'));
    }
  }

  async run() {
    this.log('🚀 Starting CORS verification...', 'info');
    this.log(`📍 Testing against: ${BASE_URL}`, 'info');
    this.log(`🌐 Frontend origin: ${FRONTEND_ORIGIN}`, 'info');
    this.log('');

    // Run all CORS test suites
    await this.testBasicCORSEndpoints();
    await this.testDifferentOrigins();
    await this.testHTTPMethods();
    await this.testHeaders();
    await this.testCredentials();
    await this.testActualRequests();
    await this.extractCORSConfig();

    // Generate and save report
    const report = this.generateReport();
    await this.saveReport(report);
    this.printSummary(report);

    // Exit with appropriate code
    process.exit(report.summary.failed > 0 ? 1 : 0);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${chalk.bold('CORS Verification Script')}

Usage: ts-node verify-cors.ts [options]

Options:
  --verbose, -v    Enable verbose logging
  --help, -h       Show this help message

Environment Variables:
  BASE_URL         Base URL for API (default: http://localhost:3001)
  FRONTEND_ORIGIN  Frontend origin for CORS testing (default: http://localhost:3000)
  TIMEOUT          Request timeout in ms (default: 10000)
  VERBOSE          Enable verbose mode (default: false)

Examples:
  ts-node verify-cors.ts
  ts-node verify-cors.ts --verbose
  BASE_URL=https://api.example.com ts-node verify-cors.ts
`);
  process.exit(0);
}

// Start verification
const verifier = new CORSVerifier();
verifier.run().catch(error => {
  console.error(chalk.red('❌ CORS verification failed with error:'), error);
  process.exit(1);
});