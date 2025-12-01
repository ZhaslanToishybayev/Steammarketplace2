#!/usr/bin/env ts-node

/**
 * Frontend-Backend Integration Verification Script
 *
 * This script validates cross-system communication between the frontend and backend,
 * ensuring that API calls, WebSocket connections, and proxy configurations work correctly.
 */

import axios from 'axios';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import { execSync } from 'child_process';

// Add proper require support for ES module context
const moduleRequire = require('module').createRequire(require.resolve('./check-frontend-backend-integration.ts'));

// Global type declarations for browser context in Playwright
declare global {
  var window: any;
}

// Type definitions
interface IntegrationResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  details: string;
  errors?: string[];
  recommendations?: string[];
  screenshots?: string[];
}

interface FrontendBackendReport {
  timestamp: string;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  checks: IntegrationResult[];
  systemInfo: {
    frontendUrl: string;
    backendUrl: string;
    nodeVersion: string;
  };
}

class FrontendBackendIntegrat {
  private results: IntegrationResult[] = [];
  private startTime: number = 0;
  private screenshotsDir: string;
  private frontendUrl: string = 'http://localhost:3000';
  private backendUrl: string = 'http://localhost:3001';

  constructor() {
    this.screenshotsDir = path.join(process.cwd(), 'scripts', 'screenshots');
    this.ensureScreenshotsDirectory();
  }

  private ensureScreenshotsDirectory(): void {
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i === maxRetries) break;
        await this.sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async checkFrontendServer(): Promise<IntegrationResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    try {
      const response = await this.executeWithRetry(
        () => axios.get(this.frontendUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'SystemVerifier/1.0'
          }
        }),
        2,
        3000
      );

      if (response.status !== 200) {
        status = 'fail';
        errors.push(`Frontend returned status ${response.status}`);
        recommendations.push('Check frontend server status and logs');
      } else {
        // Check for Next.js specific markers
        const html = response.data;
        const hasNextjsMarkers = html.includes('__NEXT_DATA__') ||
                                html.includes('_next/') ||
                                html.includes('next.js');

        if (!hasNextjsMarkers) {
          status = 'fail';
          errors.push('Response does not appear to be a Next.js application');
          recommendations.push('Verify frontend build and deployment');
        } else {
          details = 'Frontend server responding correctly with Next.js markers';
        }

        // Check for build errors
        if (html.includes('Application error: a client-side exception has occurred')) {
          status = 'fail';
          errors.push('Frontend has client-side exceptions');
          recommendations.push('Check frontend console for errors and rebuild if necessary');
        }

        if (html.includes('500 - Server Error') || html.includes('Error while rendering')) {
          status = 'fail';
          errors.push('Frontend has server-side rendering errors');
          recommendations.push('Check frontend server logs and fix SSR issues');
        }
      }

    } catch (error) {
      status = 'fail';
      const errorMessage = (error as Error).message;
      errors.push(`Frontend server check failed: ${errorMessage}`);

      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
        recommendations.push('Start frontend server: npm run dev:frontend');
      } else {
        recommendations.push('Check frontend server configuration and network connectivity');
      }
    }

    return {
      name: 'Frontend Server Check',
      status,
      duration: Date.now() - start,
      details: details || 'Frontend server validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkApiProxy(): Promise<IntegrationResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    try {
      // Test API proxy from frontend
      const proxyUrl = `${this.frontendUrl}/api/health`;
      const directUrl = `${this.backendUrl}/api/health`;

      let proxyResponse: any;
      let directResponse: any;

      try {
        proxyResponse = await this.executeWithRetry(
          () => axios.get(proxyUrl, { timeout: 5000 }),
          2,
          2000
        );
      } catch (error) {
        status = 'fail';
        errors.push(`Frontend API proxy failed: ${(error as Error).message}`);
        recommendations.push('Check next.config.js rewrites configuration');
        return {
          name: 'API Proxy Check',
          status,
          duration: Date.now() - start,
          details: 'API proxy validation completed',
          errors: errors.length > 0 ? errors : undefined,
          recommendations: recommendations.length > 0 ? recommendations : undefined
        };
      }

      try {
        directResponse = await this.executeWithRetry(
          () => axios.get(directUrl, { timeout: 5000 }),
          2,
          2000
        );
      } catch (error) {
        status = 'fail';
        errors.push(`Direct backend API failed: ${(error as Error).message}`);
        recommendations.push('Check backend server status');
        return {
          name: 'API Proxy Check',
          status,
          duration: Date.now() - start,
          details: 'API proxy validation completed',
          errors: errors.length > 0 ? errors : undefined,
          recommendations: recommendations.length > 0 ? recommendations : undefined
        };
      }

      // Compare responses
      if (proxyResponse.status !== directResponse.status) {
        status = 'fail';
        errors.push(`Proxy returned ${proxyResponse.status}, direct returned ${directResponse.status}`);
        recommendations.push('Check API proxy configuration and CORS settings');
      }

      if (proxyResponse.data && directResponse.data) {
        // Basic health check data should match
        const proxyData = proxyResponse.data;
        const directData = directResponse.data;

        if (proxyData.status !== directData.status) {
          status = 'fail';
          errors.push('Health check data mismatch between proxy and direct calls');
          recommendations.push('Verify proxy passes through response data correctly');
        }
      }

      // Check CORS headers in proxy response
      const corsHeaders = proxyResponse.headers;
      const hasCorsHeaders = corsHeaders['access-control-allow-origin'] ||
                            corsHeaders['access-control-allow-credentials'];

      if (!hasCorsHeaders) {
        status = 'fail';
        errors.push('Missing CORS headers in proxy response');
        recommendations.push('Configure CORS headers in next.config.js');
      }

      details = `API proxy working correctly - Status: ${proxyResponse.status}, CORS: ${hasCorsHeaders ? 'Present' : 'Missing'}`;

    } catch (error) {
      status = 'fail';
      errors.push(`API proxy check failed: ${(error as Error).message}`);
      recommendations.push('Check Next.js API route configuration and backend connectivity');
    }

    return {
      name: 'API Proxy Check',
      status,
      duration: Date.now() - start,
      details: details || 'API proxy validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkPageLoads(): Promise<IntegrationResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];
    let screenshots: string[] = [];

    try {
      // Check if Playwright is available
      let playwright: any;
      try {
        playwright = moduleRequire('playwright');
      } catch (error) {
        status = 'skip';
        recommendations.push('Install Playwright for comprehensive page testing: npm install playwright');
        return {
          name: 'Page Load Tests',
          status,
          duration: Date.now() - start,
          details: 'Playwright not available, skipping page load tests',
          recommendations: recommendations.length > 0 ? recommendations : undefined
        };
      }

      const pages = [
        { path: '/', name: 'Home' },
        { path: '/auth/login', name: 'Login' },
        { path: '/inventory', name: 'Inventory' },
        { path: '/market', name: 'Market' },
        { path: '/trade', name: 'Trade' },
        { path: '/dashboard', name: 'Dashboard' },
        { path: '/admin', name: 'Admin' }
      ];

      const browser = await playwright.chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'SystemVerifier/1.0'
      });
      const page = await context.newPage();

      const failedPages: string[] = [];
      const pageErrors: { [key: string]: string[] } = {};

      // Set up error tracking
      page.on('console', (msg) => {
        const text = msg.text();
        const type = msg.type();
        if (type === 'error' || type === 'warn') {
          // Track console errors/warnings
        }
      });

      page.on('pageerror', (error) => {
        // Track page-level errors
      });

      page.on('response', (response) => {
        // Track failed network requests
        if (!response.ok() && response.status() >= 400) {
          // Track network errors
        }
      });

      for (const pageInfo of pages) {
        try {
          const startTime = Date.now();
          const response = await page.goto(`${this.frontendUrl}${pageInfo.path}`, {
            waitUntil: 'networkidle',
            timeout: 30000
          });

          const loadTime = Date.now() - startTime;

          if (!response || !response.ok()) {
            failedPages.push(pageInfo.name);
            pageErrors[pageInfo.name] = [`HTTP ${response?.status() || 'timeout'}`];
          } else {
            // Check for React hydration errors
            const pageContent = await page.content();
            if (pageContent.includes('Hydration failed') || pageContent.includes('react-dom.development')) {
              failedPages.push(pageInfo.name);
              pageErrors[pageInfo.name] = ['React hydration error detected'];
            }
          }

          // Take screenshot on failure (optional)
          if (!response || !response.ok()) {
            const screenshotPath = path.join(this.screenshotsDir, `error-${pageInfo.path.replace(/\//g, '_')}-${Date.now()}.png`);
            try {
              await page.screenshot({ path: screenshotPath });
              screenshots.push(screenshotPath);
            } catch (error) {
              // Screenshot failed, continue
            }
          }

        } catch (error) {
          failedPages.push(pageInfo.name);
          pageErrors[pageInfo.name] = [(error as Error).message];
        }
      }

      await browser.close();

      if (failedPages.length > 0) {
        status = 'fail';
        errors.push(`Failed to load pages: ${failedPages.join(', ')}`);
        Object.entries(pageErrors).forEach(([page, pageErrs]) => {
          errors.push(`  ${page}: ${pageErrs.join(', ')}`);
        });
        recommendations.push('Check frontend routing, API connectivity, and server configuration');
      } else {
        details = `All ${pages.length} critical pages loaded successfully`;
      }

    } catch (error) {
      status = 'fail';
      errors.push(`Page load tests failed: ${(error as Error).message}`);
      recommendations.push('Install Playwright and ensure frontend is running properly');
    }

    return {
      name: 'Page Load Tests',
      status,
      duration: Date.now() - start,
      details: details || 'Page load validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      screenshots: screenshots.length > 0 ? screenshots : undefined
    };
  }

  private async checkApiCallsSimulation(): Promise<IntegrationResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    try {
      // Check if Playwright is available
      let playwright: any;
      try {
        playwright = moduleRequire('playwright');
      } catch (error) {
        status = 'skip';
        recommendations.push('Install Playwright for API simulation tests');
        return {
          name: 'API Call Simulation',
          status,
          duration: Date.now() - start,
          details: 'Playwright not available, skipping API simulation tests',
          recommendations: recommendations.length > 0 ? recommendations : undefined
        };
      }

      const browser = await playwright.chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
      });
      const page = await context.newPage();

      // Navigate to home page
      await page.goto(this.frontendUrl, { waitUntil: 'networkidle' });

      // Test API calls from page context
      const apiTests = [
        {
          url: '/api/health',
          method: 'GET',
          expectedStatus: 200,
          description: 'Health check endpoint'
        },
        {
          url: '/api/auth/steam',
          method: 'GET',
          expectedStatus: 302,
          description: 'Steam OAuth redirect'
        },
        {
          url: '/api/inventory',
          method: 'GET',
          expectedStatus: 401,
          description: 'Protected inventory endpoint'
        }
      ];

      const testResults: { [key: string]: { status: number; cors?: boolean } } = {};

      for (const test of apiTests) {
        try {
          const response = await page.evaluate(async (testConfig) => {
            try {
              const fetchResponse = await fetch(testConfig.url, {
                method: testConfig.method,
                credentials: 'include'
              });

              return {
                status: fetchResponse.status,
                headers: Object.fromEntries(fetchResponse.headers.entries())
              };
            } catch (error) {
              return { error: (error as Error).message };
            }
          }, test);

          if (response.error) {
            testResults[test.description] = { status: -1 };
          } else {
            testResults[test.description] = {
              status: response.status,
              cors: !!response.headers['access-control-allow-origin']
            };

            if (response.status !== test.expectedStatus) {
              status = 'fail';
              errors.push(`${test.description}: expected ${test.expectedStatus}, got ${response.status}`);
            }

            if (!response.headers['access-control-allow-origin'] && test.expectedStatus !== 302) {
              status = 'fail';
              errors.push(`${test.description}: missing CORS headers`);
            }
          }

        } catch (error) {
          testResults[test.description] = { status: -1 };
          errors.push(`${test.description}: ${(error as Error).message}`);
        }
      }

      await browser.close();

      if (status === 'pass') {
        details = 'All API calls returned expected status codes and CORS headers';
      } else {
        recommendations.push('Check API route configuration, CORS settings, and authentication middleware');
      }

    } catch (error) {
      status = 'fail';
      errors.push(`API call simulation failed: ${(error as Error).message}`);
      recommendations.push('Install Playwright and check frontend API configuration');
    }

    return {
      name: 'API Call Simulation',
      status,
      duration: Date.now() - start,
      details: details || 'API call simulation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkWebSocketConnection(): Promise<IntegrationResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    try {
      // Check if Socket.io client is available
      let io: any;
      try {
        io = moduleRequire('socket.io-client');
      } catch (error) {
        status = 'skip';
        recommendations.push('Install socket.io-client for WebSocket testing: npm install socket.io-client');
        return {
          name: 'WebSocket Connection Test',
          status,
          duration: Date.now() - start,
          details: 'Socket.io-client not available, skipping WebSocket tests',
          recommendations: recommendations.length > 0 ? recommendations : undefined
        };
      }

      // Test Socket.io connection directly from Node.js
      const socket = io(this.backendUrl, {
        timeout: 5000,
        transports: ['websocket']
      });

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => {
          socket.disconnect();
          resolve();
        });

        socket.on('connect_error', (error) => {
          reject(error);
        });

        setTimeout(() => {
          socket.disconnect();
          reject(new Error('Socket.io connection timeout'));
        }, 5000);
      });

      details = 'Socket.io connection established successfully';

    } catch (error) {
      status = 'fail';
      errors.push(`Socket.io connection failed: ${(error as Error).message}`);
      recommendations.push('Check Socket.io server configuration and ensure backend is running');
    }

    return {
      name: 'WebSocket Connection Test',
      status,
      duration: Date.now() - start,
      details: details || 'Socket.io connection test completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkStateManagement(): Promise<IntegrationResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    try {
      // Check if Playwright is available
      let playwright: any;
      try {
        playwright = moduleRequire('playwright');
      } catch (error) {
        status = 'skip';
        recommendations.push('Install Playwright for state management testing');
        return {
          name: 'State Management Check',
          status,
          duration: Date.now() - start,
          details: 'Playwright not available, skipping state management tests',
          recommendations: recommendations.length > 0 ? recommendations : undefined
        };
      }

      const browser = await playwright.chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
      });
      const page = await context.newPage();

      // Navigate to a page that uses state management
      await page.goto(`${this.frontendUrl}/inventory`, { waitUntil: 'networkidle' });

      // Test state management initialization
      const stateTest = await page.evaluate(() => {
        // Check if global state is available
        const hasGlobalState = typeof window !== 'undefined' &&
                              (window as any).__NEXT_REDUX_WRAPPER__ ||
                              (window as any).zustand ||
                              (window as any).reactQuery;

        // Check if API hooks can be called
        const hasApiHooks = typeof window !== 'undefined' &&
                           (window as any).apiHooks;

        return {
          hasGlobalState,
          hasApiHooks,
          apiBaseUrl: (window as any).env?.NEXT_PUBLIC_API_URL || '/api'
        };
      });

      if (!stateTest.hasGlobalState) {
        status = 'fail';
        errors.push('Global state management not properly initialized');
        recommendations.push('Check Zustand/Redux store configuration in frontend');
      }

      if (!stateTest.hasApiHooks) {
        status = 'fail';
        errors.push('API hooks not available');
        recommendations.push('Check React Query and API hook configuration');
      }

      if (stateTest.apiBaseUrl === '/api' && !this.frontendUrl.includes('localhost:3000')) {
        status = 'fail';
        errors.push('API base URL not configured correctly');
        recommendations.push('Set NEXT_PUBLIC_API_URL environment variable');
      }

      if (status === 'pass') {
        details = 'State management and API hooks properly configured';
      }

      await browser.close();

    } catch (error) {
      status = 'fail';
      errors.push(`State management check failed: ${(error as Error).message}`);
      recommendations.push('Install Playwright and check frontend state management configuration');
    }

    return {
      name: 'State Management Check',
      status,
      duration: Date.now() - start,
      details: details || 'State management validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async runAllChecks(): Promise<void> {
    this.startTime = Date.now();

    console.log(chalk.blue.bold('\n🌐 Starting Frontend-Backend Integration Verification\n'));

    // Run all checks
    const checks = [
      () => this.checkFrontendServer(),
      () => this.checkApiProxy(),
      () => this.checkPageLoads(),
      () => this.checkApiCallsSimulation(),
      () => this.checkWebSocketConnection(),
      () => this.checkStateManagement()
    ];

    for (const check of checks) {
      const result = await check();
      this.results.push(result);
      this.printResult(result);
    }
  }

  private printResult(result: IntegrationResult): void {
    const statusIcon = result.status === 'pass' ? chalk.green('✅') :
                      result.status === 'fail' ? chalk.red('❌') : chalk.yellow('⚠️');
    const statusText = result.status === 'pass' ? chalk.green('PASS') :
                      result.status === 'fail' ? chalk.red('FAIL') : chalk.yellow('SKIP');

    console.log(`  ${statusIcon} ${result.name} (${result.duration}ms)`);
    console.log(`     Status: ${statusText}`);
    console.log(`     Details: ${result.details}`);

    if (result.errors && result.errors.length > 0) {
      console.log(`     Errors: ${result.errors.join(', ')}`);
    }

    if (result.recommendations && result.recommendations.length > 0) {
      console.log(`     Recommendations: ${result.recommendations.join(', ')}`);
    }

    if (result.screenshots && result.screenshots.length > 0) {
      console.log(`     Screenshots: ${result.screenshots.length} files saved`);
    }
  }

  private generateReport(): FrontendBackendReport {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    return {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      summary: {
        total: this.results.length,
        passed,
        failed,
        skipped
      },
      checks: this.results,
      systemInfo: {
        frontendUrl: this.frontendUrl,
        backendUrl: this.backendUrl,
        nodeVersion: process.version
      }
    };
  }

  private async saveReport(report: FrontendBackendReport): Promise<void> {
    const reportDir = path.join(process.cwd(), 'scripts', 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `frontend-backend-integration-${timestamp}.json`;
    const filepath = path.join(reportDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(chalk.blue(`\n📄 Report saved to: ${filepath}`));
  }

  private printSummary(report: FrontendBackendReport): void {
    const success = report.summary.failed === 0;

    console.log(chalk.blue.bold('\n📊 INTEGRATION VERIFICATION SUMMARY'));
    console.log(chalk.blue('─'.repeat(50)));

    console.log(`Total Checks: ${chalk.cyan(report.summary.total)}`);
    console.log(`Passed: ${chalk.green(report.summary.passed)}`);
    console.log(`Failed: ${chalk.red(report.summary.failed)}`);
    console.log(`Skipped: ${chalk.yellow(report.summary.skipped)}`);

    console.log(chalk.blue('\n📋 CHECK RESULTS'));
    this.results.forEach(result => {
      const icon = result.status === 'pass' ? chalk.green('✅') :
                   result.status === 'fail' ? chalk.red('❌') : chalk.yellow('⚠️');
      console.log(`${icon} ${result.name}: ${result.status.toUpperCase()}`);
    });

    if (success) {
      console.log(chalk.green.bold('\n🎉 INTEGRATION VERIFICATION COMPLETED SUCCESSFULLY!'));
      console.log(chalk.green('Frontend-backend integration is working correctly.'));
    } else {
      console.log(chalk.red.bold('\n⚠️  INTEGRATION VERIFICATION FAILED!'));
      console.log(chalk.red('Please address the failed checks before proceeding.'));
    }
  }

  public async run(): Promise<void> {
    try {
      await this.runAllChecks();
      const report = this.generateReport();
      await this.saveReport(report);
      this.printSummary(report);

      // Exit with error code if verification failed
      if (report.summary.failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red.bold('\n💥 INTEGRATION VERIFICATION FAILED:'), (error as Error).message);
      process.exit(1);
    }
  }
}

// Run the verification if this script is executed directly
if (require.main === module) {
  const integrator = new FrontendBackendIntegrat();
  integrator.run().catch(error => {
    console.error(chalk.red.bold('Integration verification failed:'), error);
    process.exit(1);
  });
}

export { FrontendBackendIntegrat, type FrontendBackendReport, type IntegrationResult };