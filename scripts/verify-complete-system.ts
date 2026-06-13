#!/usr/bin/env ts-node

/**
 * Complete System Integration Verification Script
 *
 * This script orchestrates all existing verification tools into a unified workflow
 * that validates the complete Steam Marketplace system end-to-end before production deployment.
 *
 * Features:
 * - Pre-flight environment checks
 * - Backend API verification
 * - Database seeding validation
 * - Steam integration testing
 * - Frontend-backend integration checks
 * - Real-time WebSocket verification
 * - Performance testing
 * - Comprehensive reporting
 */

import axios from 'axios';
import chalk from 'chalk';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';

// Add proper require support for ES module context
const moduleRequire = require('module').createRequire(require.resolve('./verify-complete-system.ts'));

// Type definitions
interface VerificationResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  details: string;
  errors?: string[];
  recommendations?: string[];
}

interface SystemVerificationReport {
  timestamp: string;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
  };
  phases: {
    [phase: string]: {
      status: 'pass' | 'fail';
      duration: number;
      checks: VerificationResult[];
    };
  };
  systemInfo: {
    nodeVersion: string;
    platform: string;
    dockerVersion?: string;
    dockerServices?: string[];
  };
}

class SystemVerifier {
  private results: VerificationResult[] = [];
  private startTime: number = 0;
  private reportDir: string = path.join(process.cwd(), 'scripts', 'reports');

  constructor() {
    this.ensureReportDirectory();
  }

  private ensureReportDirectory(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
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

  private async runCommand(command: string, args: string[] = [], timeout: number = 30000): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'pipe', shell: true });

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Command timed out after ${timeout}ms: ${command} ${args.join(' ')}`));
      }, timeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, code });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  private async checkEnvironment(): Promise<VerificationResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    try {
      // Check .env files
      const envFiles = ['.env', 'apps/backend/.env'];
      const missingEnvFiles: string[] = [];

      for (const envFile of envFiles) {
        if (!fs.existsSync(path.join(process.cwd(), envFile))) {
          missingEnvFiles.push(envFile);
        }
      }

      if (missingEnvFiles.length > 0) {
        status = 'fail';
        errors.push(`Missing environment files: ${missingEnvFiles.join(', ')}`);
        recommendations.push('Create missing .env files from examples');
      }

      // Check required environment variables
      const requiredVars = [
        'STEAM_API_KEY',
        'JWT_SECRET',
        'DATABASE_URL',
        'MONGODB_URI',
        'REDIS_URL'
      ];

      const missingVars: string[] = [];
      for (const varName of requiredVars) {
        if (!process.env[varName]) {
          missingVars.push(varName);
        }
      }

      if (missingVars.length > 0) {
        status = 'fail';
        errors.push(`Missing environment variables: ${missingVars.join(', ')}`);
        recommendations.push('Set missing environment variables in .env files');
      }

      // Check Docker services
      try {
        const { stdout } = await this.executeWithRetry(
          () => this.runCommand('docker', ['ps', '--format', 'table {{.Names}}\\t{{.Status}}']),
          2,
          2000
        );

        const runningServices = stdout
          .split('\n')
          .filter(line => line.includes('Up') || line.includes('healthy'))
          .map(line => line.split(/\s+/)[0])
          .filter(name => name && name !== 'NAMES');

        const requiredServices = ['postgres', 'mongodb', 'redis'];
        const missingServices = requiredServices.filter(service =>
          !runningServices.some(name => name.includes(service))
        );

        if (missingServices.length > 0) {
          status = 'fail';
          errors.push(`Docker services not running: ${missingServices.join(', ')}`);
          recommendations.push('Run: docker-compose up -d');
        }

        details = `Found ${runningServices.length} running Docker services: ${runningServices.join(', ')}`;
      } catch (error) {
        status = 'fail';
        errors.push('Docker not available or services not running');
        recommendations.push('Install Docker and run: docker-compose up -d');
      }

      // Check port availability
      const ports = [3000, 3001, 5432, 27017, 6379];
      const usedPorts: number[] = [];

      for (const port of ports) {
        try {
          await axios.get(`http://localhost:${port}`, { timeout: 1000 });
          usedPorts.push(port);
        } catch (error) {
          // Port is not in use, which is expected
        }
      }

      if (usedPorts.length > 0) {
        details += ` | Ports in use: ${usedPorts.join(', ')} (expected for running services)`;
      }

    } catch (error) {
      status = 'fail';
      errors.push(`Environment check failed: ${(error as Error).message}`);
      recommendations.push('Check system requirements and environment setup');
    }

    return {
      name: 'Environment & Infrastructure Check',
      status,
      duration: Date.now() - start,
      details: details || 'Environment validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkBackendAPI(): Promise<VerificationResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    try {
      // Run existing API verification script
      const { code, stderr } = await this.runCommand('npm', ['run', 'verify:api'], 30000);

      if (code !== 0) {
        status = 'fail';
        errors.push(`Backend API verification failed: ${stderr}`);
        recommendations.push('Check backend logs and fix API issues');
      } else {
        details = 'All API endpoints responding correctly';
      }

      // Additional health checks
      try {
        const healthResponse = await this.executeWithRetry(
          () => axios.get('http://localhost:3001/api/health', { timeout: 5000 }),
          2,
          3000
        );

        if (healthResponse.status !== 200) {
          status = 'fail';
          errors.push(`Health endpoint returned status ${healthResponse.status}`);
        }
      } catch (error) {
        status = 'fail';
        errors.push('Backend health endpoint not accessible');
        recommendations.push('Start backend server: npm run dev:backend');
      }

    } catch (error) {
      status = 'fail';
      errors.push(`Backend API check failed: ${(error as Error).message}`);
      recommendations.push('Ensure backend is running and accessible');
    }

    return {
      name: 'Backend API Verification',
      status,
      duration: Date.now() - start,
      details: details || 'Backend API validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkDatabaseSeeding(): Promise<VerificationResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    try {
      // Run database seeding verification
      const { code, stderr } = await this.runCommand('ts-node', ['scripts/verify-database-seeding.ts'], 60000);

      if (code !== 0) {
        status = 'fail';
        errors.push(`Database seeding verification failed: ${stderr}`);
        recommendations.push('Run database seeding: npm run db:seed');
      } else {
        details = 'Database seeding verification completed successfully';
      }

    } catch (error) {
      status = 'fail';
      errors.push(`Database seeding check failed: ${(error as Error).message}`);
      recommendations.push('Check database connections and run seeding');
    }

    return {
      name: 'Database Seeding Check',
      status,
      duration: Date.now() - start,
      details: details || 'Database seeding validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkSteamIntegration(): Promise<VerificationResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    try {
      // Run existing Steam integration verification
      const { code, stderr } = await this.runCommand('npm', ['run', 'verify:steam-integration'], 60000);

      if (code !== 0) {
        status = 'fail';
        errors.push(`Steam integration verification failed: ${stderr}`);
        recommendations.push('Check Steam API configuration and credentials');
      } else {
        details = 'Steam integration verification completed successfully';
      }

    } catch (error) {
      status = 'fail';
      errors.push(`Steam integration check failed: ${(error as Error).message}`);
      recommendations.push('Verify Steam API key and OAuth configuration');
    }

    return {
      name: 'Steam Integration Verification',
      status,
      duration: Date.now() - start,
      details: details || 'Steam integration validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkFrontend(): Promise<VerificationResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    try {
      // Check frontend server
      try {
        const response = await this.executeWithRetry(
          () => axios.get('http://localhost:3000', { timeout: 5000 }),
          2,
          3000
        );

        if (response.status !== 200 || !response.data.includes('<html')) {
          status = 'fail';
          errors.push('Frontend server not responding correctly');
          recommendations.push('Start frontend server: npm run dev:frontend');
        } else {
          details = 'Frontend server responding';
        }
      } catch (error) {
        status = 'fail';
        errors.push('Frontend server not accessible');
        recommendations.push('Start frontend server: npm run dev:frontend');
      }

      // Run frontend-backend integration check
      const { code, stderr } = await this.runCommand('ts-node', ['scripts/check-frontend-backend-integration.ts'], 60000);

      if (code !== 0) {
        status = 'fail';
        errors.push(`Frontend-backend integration check failed: ${stderr}`);
        recommendations.push('Check frontend configuration and API proxy settings');
      } else {
        details += ' | Frontend-backend integration verified';
      }

    } catch (error) {
      status = 'fail';
      errors.push(`Frontend check failed: ${(error as Error).message}`);
      recommendations.push('Ensure frontend is running and properly configured');
    }

    return {
      name: 'Frontend & Integration Check',
      status,
      duration: Date.now() - start,
      details: details || 'Frontend validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkRealTimeFeatures(): Promise<VerificationResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    try {
      // Check WebSocket connectivity
      const io = moduleRequire('socket.io-client');

      const socket = io('http://localhost:3001', {
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
          reject(new Error('WebSocket connection timeout'));
        }, 5000);
      });

      details = 'WebSocket connection established successfully';

    } catch (error) {
      status = 'fail';
      errors.push(`WebSocket connection failed: ${(error as Error).message}`);
      recommendations.push('Check Socket.io server configuration and ensure backend is running');
    }

    return {
      name: 'Real-Time Features Check',
      status,
      duration: Date.now() - start,
      details: details || 'Real-time features validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async checkPerformance(): Promise<VerificationResult> {
    const start = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let details = '';
    let errors: string[] = [];
    let recommendations: string[] = [];

    try {
      const performanceTests = [
        { url: 'http://localhost:3001/api/health', name: 'Health endpoint', maxTime: 100 },
        { url: 'http://localhost:3001/api/auth/steam', name: 'Steam auth endpoint', maxTime: 2000 },
        { url: 'http://localhost:3000', name: 'Frontend homepage', maxTime: 3000 }
      ];

      const timings: { [key: string]: number } = {};

      for (const test of performanceTests) {
        const testStart = Date.now();
        try {
          await axios.get(test.url, { timeout: test.maxTime });
          const duration = Date.now() - testStart;
          timings[test.name] = duration;

          if (duration > test.maxTime) {
            status = 'fail';
            errors.push(`${test.name} took ${duration}ms (max: ${test.maxTime}ms)`);
          }
        } catch (error) {
          status = 'fail';
          errors.push(`${test.name} failed: ${(error as Error).message}`);
        }
      }

      details = `Performance test results: ${Object.entries(timings).map(([name, time]) => `${name}: ${time}ms`).join(', ')}`;

    } catch (error) {
      status = 'fail';
      errors.push(`Performance check failed: ${(error as Error).message}`);
      recommendations.push('Check server performance and optimize slow endpoints');
    }

    return {
      name: 'Performance Check',
      status,
      duration: Date.now() - start,
      details: details || 'Performance validation completed',
      errors: errors.length > 0 ? errors : undefined,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  private async runAllChecks(): Promise<void> {
    this.startTime = Date.now();

    console.log(chalk.blue.bold('\n🚀 Starting Complete System Integration Verification\n'));

    // Phase 1: Environment & Infrastructure
    console.log(chalk.yellow('📋 Phase 1: Environment & Infrastructure'));
    const envResult = await this.checkEnvironment();
    this.results.push(envResult);
    this.printResult(envResult);

    // Phase 2: Backend API
    console.log(chalk.yellow('\n🔧 Phase 2: Backend API Verification'));
    const backendResult = await this.checkBackendAPI();
    this.results.push(backendResult);
    this.printResult(backendResult);

    // Phase 3: Database Seeding
    console.log(chalk.yellow('\n🗄️  Phase 3: Database Seeding Check'));
    const dbResult = await this.checkDatabaseSeeding();
    this.results.push(dbResult);
    this.printResult(dbResult);

    // Phase 4: Steam Integration
    console.log(chalk.yellow('\n🎮 Phase 4: Steam Integration Verification'));
    const steamResult = await this.checkSteamIntegration();
    this.results.push(steamResult);
    this.printResult(steamResult);

    // Phase 5: Frontend & Integration
    console.log(chalk.yellow('\n🌐 Phase 5: Frontend & Integration Check'));
    const frontendResult = await this.checkFrontend();
    this.results.push(frontendResult);
    this.printResult(frontendResult);

    // Phase 6: Real-Time Features
    console.log(chalk.yellow('\n⚡ Phase 6: Real-Time Features Check'));
    const realtimeResult = await this.checkRealTimeFeatures();
    this.results.push(realtimeResult);
    this.printResult(realtimeResult);

    // Phase 7: Performance
    console.log(chalk.yellow('\n🏃 Phase 7: Performance Check'));
    const performanceResult = await this.checkPerformance();
    this.results.push(performanceResult);
    this.printResult(performanceResult);
  }

  private printResult(result: VerificationResult): void {
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
  }

  private generateReport(): SystemVerificationReport {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    // Get Docker version and running services
    let dockerVersion: string | undefined;
    let dockerServices: string[] | undefined;

    try {
      const dockerInfo = execSync('docker --version', { encoding: 'utf8' }).trim();
      dockerVersion = dockerInfo;

      const servicesOutput = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf8' });
      dockerServices = servicesOutput.trim().split('\n').filter(name => name);
    } catch (error) {
      // Docker not available
    }

    const report: SystemVerificationReport = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      summary: {
        total: this.results.length,
        passed,
        failed,
        skipped,
        successRate: Math.round((passed / this.results.length) * 100)
      },
      phases: {
        'Environment & Infrastructure': {
          status: this.results[0]?.status === 'pass' ? 'pass' : 'fail',
          duration: this.results[0]?.duration || 0,
          checks: [this.results[0]]
        },
        'Backend API': {
          status: this.results[1]?.status === 'pass' ? 'pass' : 'fail',
          duration: this.results[1]?.duration || 0,
          checks: [this.results[1]]
        },
        'Database Seeding': {
          status: this.results[2]?.status === 'pass' ? 'pass' : 'fail',
          duration: this.results[2]?.duration || 0,
          checks: [this.results[2]]
        },
        'Steam Integration': {
          status: this.results[3]?.status === 'pass' ? 'pass' : 'fail',
          duration: this.results[3]?.duration || 0,
          checks: [this.results[3]]
        },
        'Frontend & Integration': {
          status: this.results[4]?.status === 'pass' ? 'pass' : 'fail',
          duration: this.results[4]?.duration || 0,
          checks: [this.results[4]]
        },
        'Real-Time Features': {
          status: this.results[5]?.status === 'pass' ? 'pass' : 'fail',
          duration: this.results[5]?.duration || 0,
          checks: [this.results[5]]
        },
        'Performance': {
          status: this.results[6]?.status === 'pass' ? 'pass' : 'fail',
          duration: this.results[6]?.duration || 0,
          checks: [this.results[6]]
        }
      },
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        dockerVersion,
        dockerServices
      }
    };

    return report;
  }

  private async saveReport(report: SystemVerificationReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `complete-system-verification-${timestamp}.json`;
    const filepath = path.join(this.reportDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(chalk.blue(`\n📄 Report saved to: ${filepath}`));
  }

  private printSummary(report: SystemVerificationReport): void {
    const success = report.summary.failed === 0;

    console.log(chalk.blue.bold('\n📊 VERIFICATION SUMMARY'));
    console.log(chalk.blue('─'.repeat(50)));

    console.log(`Total Checks: ${chalk.cyan(report.summary.total)}`);
    console.log(`Passed: ${chalk.green(report.summary.passed)}`);
    console.log(`Failed: ${chalk.red(report.summary.failed)}`);
    console.log(`Skipped: ${chalk.yellow(report.summary.skipped)}`);
    console.log(`Success Rate: ${chalk.blue(`${report.summary.successRate}%`)} (Informational)`);

    console.log(chalk.blue('\n📋 PHASE RESULTS'));
    Object.entries(report.phases).forEach(([phase, data]) => {
      const icon = data.status === 'pass' ? chalk.green('✅') : chalk.red('❌');
      console.log(`${icon} ${phase}: ${data.status === 'pass' ? chalk.green('PASS') : chalk.red('FAIL')} (${data.duration}ms)`);
    });

    if (success) {
      console.log(chalk.green.bold('\n🎉 SYSTEM VERIFICATION COMPLETED SUCCESSFULLY!'));
      console.log(chalk.green('The Steam Marketplace system is ready for production deployment.'));
    } else {
      console.log(chalk.red.bold('\n⚠️  SYSTEM VERIFICATION FAILED!'));
      console.log(chalk.red('Please address all failed checks before deploying to production.'));
      console.log(chalk.red('Critical requirement: All checks must pass for production deployment.'));
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
      console.error(chalk.red.bold('\n💥 VERIFICATION SCRIPT FAILED:'), (error as Error).message);
      process.exit(1);
    }
  }
}

// Run the verification if this script is executed directly
if (require.main === module) {
  const verifier = new SystemVerifier();
  verifier.run().catch(error => {
    console.error(chalk.red.bold('Verification failed:'), error);
    process.exit(1);
  });
}

export { SystemVerifier, type SystemVerificationReport, type VerificationResult };