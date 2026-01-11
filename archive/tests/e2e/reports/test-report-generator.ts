/**
 * Test Report Generator for E2E Testing
 * Compiles E2E test results into comprehensive HTML/JSON reports
 */

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { existsSync, readdirSync } from 'fs';
import { testConfig } from '../setup/test-config';

export interface TestReportData {
  metadata: {
    timestamp: string;
    duration: number;
    environment: {
      baseUrl: string;
      apiUrl: string;
      wsUrl: string;
    };
    configuration: {
      features: any;
      timeouts: any;
      retry: any;
    };
  };
  testResults: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
    duration: number;
    suites: TestSuite[];
  };
  apiResults: {
    passed: number;
    failed: number;
    total: number;
    endpoints: ApiEndpoint[];
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    slowEndpoints: Array<{
      method: string;
      url: string;
      duration: number;
    }>;
  };
  logs: {
    summary: {
      totalLogs: number;
      errorCount: number;
      warnCount: number;
      uniqueErrors: number;
      anomaliesDetected: number;
    };
    errors: Array<{
      timestamp: string;
      message: string;
      context?: string;
    }>;
    anomalies: Array<{
      type: string;
      message: string;
      severity: string;
      description: string;
    }>;
  };
  metrics: {
    httpRequests: number;
    databaseQueries: number;
    cacheHitRatio: number;
    queueJobs: number;
  };
  database: {
    integrity: boolean;
    testUsers: number;
    testTrades: number;
    testItems: number;
  };
  artifacts: {
    screenshots: string[];
    videos: string[];
    logs: string[];
    reports: string[];
  };
}

export interface TestSuite {
  name: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  tests: TestCase[];
}

export interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshot?: string;
  video?: string;
}

export interface ApiEndpoint {
  method: string;
  url: string;
  passed: number;
  failed: number;
  averageDuration: number;
  errorRate: number;
}

export class TestReportGenerator {
  private artifactsDir: string;
  private timestamp: string;

  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.artifactsDir = join(process.cwd(), 'tests/e2e/artifacts');
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport(): Promise<{ htmlPath: string; jsonPath: string }> {
    console.log('📊 Generating comprehensive test report...');

    const reportData = await this.collectReportData();
    const htmlPath = await this.generateHtmlReport(reportData);
    const jsonPath = await this.generateJsonReport(reportData);

    console.log('✅ Test report generated successfully');
    console.log(`📄 HTML Report: ${htmlPath}`);
    console.log(`📄 JSON Report: ${jsonPath}`);

    return { htmlPath, jsonPath };
  }

  /**
   * Collect all report data from various sources
   */
  private async collectReportData(): Promise<TestReportData> {
    const startTime = Date.now();

    const reportData: TestReportData = {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: 0,
        environment: {
          baseUrl: testConfig.baseUrl,
          apiUrl: testConfig.apiUrl,
          wsUrl: testConfig.wsUrl,
        },
        configuration: {
          features: testConfig.features,
          timeouts: testConfig.timeouts,
          retry: testConfig.retry,
        },
      },
      testResults: {
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0,
        duration: 0,
        suites: [],
      },
      apiResults: {
        passed: 0,
        failed: 0,
        total: 0,
        endpoints: [],
      },
      performance: {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        errorRate: 0,
        slowEndpoints: [],
      },
      logs: {
        summary: {
          totalLogs: 0,
          errorCount: 0,
          warnCount: 0,
          uniqueErrors: 0,
          anomaliesDetected: 0,
        },
        errors: [],
        anomalies: [],
      },
      metrics: {
        httpRequests: 0,
        databaseQueries: 0,
        cacheHitRatio: 0,
        queueJobs: 0,
      },
      database: {
        integrity: false,
        testUsers: 0,
        testTrades: 0,
        testItems: 0,
      },
      artifacts: {
        screenshots: [],
        videos: [],
        logs: [],
        reports: [],
      },
    };

    // Collect Playwright test results
    await this.collectPlaywrightResults(reportData);

    // Collect API test results
    await this.collectApiResults(reportData);

    // Collect log analysis
    await this.collectLogAnalysis(reportData);

    // Collect metrics data
    await this.collectMetricsData(reportData);

    // Collect database inspection results
    await this.collectDatabaseData(reportData);

    // Collect artifacts
    await this.collectArtifacts(reportData);

    reportData.metadata.duration = Date.now() - startTime;

    return reportData;
  }

  /**
   * Collect Playwright test results
   */
  private async collectPlaywrightResults(reportData: TestReportData): Promise<void> {
    const resultsFile = join(this.artifactsDir, 'test-results.json');
    const playwrightReportDir = join(this.artifactsDir, 'playwright-report');

    if (existsSync(resultsFile)) {
      try {
        const results = JSON.parse(await fs.readFile(resultsFile, 'utf8'));

        reportData.testResults.passed = results.stats?.passed || 0;
        reportData.testResults.failed = results.stats?.failed || 0;
        reportData.testResults.skipped = results.stats?.skipped || 0;
        reportData.testResults.total = results.stats?.total || 0;
        reportData.testResults.duration = results.stats?.duration || 0;

        // Parse individual test suites
        if (results.suites) {
          for (const suite of results.suites) {
            const testSuite: TestSuite = {
              name: suite.name,
              passed: suite.tests?.filter(t => t.status === 'passed').length || 0,
              failed: suite.tests?.filter(t => t.status === 'failed').length || 0,
              skipped: suite.tests?.filter(t => t.status === 'skipped').length || 0,
              total: suite.tests?.length || 0,
              duration: suite.duration || 0,
              tests: [],
            };

            // Parse individual tests
            if (suite.tests) {
              for (const test of suite.tests) {
                const testCase: TestCase = {
                  name: test.name,
                  status: test.status,
                  duration: test.duration || 0,
                  error: test.error?.message,
                  screenshot: test.screenshot,
                  video: test.video,
                };
                testSuite.tests.push(testCase);
              }
            }

            reportData.testResults.suites.push(testSuite);
          }
        }
      } catch (error) {
        console.warn('⚠️  Failed to parse Playwright results:', error);
      }
    }
  }

  /**
   * Collect API test results
   */
  private async collectApiResults(reportData: TestReportData): Promise<void> {
    const apiResultsFile = join(this.artifactsDir, 'api-test-results.json');

    if (existsSync(apiResultsFile)) {
      try {
        const results = JSON.parse(await fs.readFile(apiResultsFile, 'utf8'));

        reportData.apiResults.passed = results.passed || 0;
        reportData.apiResults.failed = results.failed || 0;
        reportData.apiResults.total = results.total || 0;
        reportData.apiResults.endpoints = results.endpoints || [];
      } catch (error) {
        console.warn('⚠️  Failed to parse API results:', error);
      }
    }
  }

  /**
   * Collect log analysis results
   */
  private async collectLogAnalysis(reportData: TestReportData): Promise<void> {
    const logAnalysisFile = join(this.artifactsDir, 'logs', 'log-analysis.json');
    const logAnalysisMd = join(this.artifactsDir, 'logs', 'log-analysis.md');

    if (existsSync(logAnalysisFile)) {
      try {
        const analysis = JSON.parse(await fs.readFile(logAnalysisFile, 'utf8'));
        reportData.logs = analysis;
      } catch (error) {
        console.warn('⚠️  Failed to parse log analysis:', error);
      }
    } else if (existsSync(logAnalysisMd)) {
      // Parse markdown log analysis
      try {
        const content = await fs.readFile(logAnalysisMd, 'utf8');
        const lines = content.split('\n');

        // Extract summary information
        const summaryMatch = content.match(/## Summary\s*\n([\s\S]*?)## /);
        if (summaryMatch) {
          const summaryText = summaryMatch[1];
          reportData.logs.summary.totalLogs = this.extractNumber(summaryText, 'Total Logs:');
          reportData.logs.summary.errorCount = this.extractNumber(summaryText, 'Errors:');
          reportData.logs.summary.warnCount = this.extractNumber(summaryText, 'Warnings:');
          reportData.logs.summary.uniqueErrors = this.extractNumber(summaryText, 'Unique Errors:');
          reportData.logs.summary.anomaliesDetected = this.extractNumber(summaryText, 'Anomalies Detected:');
        }
      } catch (error) {
        console.warn('⚠️  Failed to parse log analysis markdown:', error);
      }
    }
  }

  /**
   * Collect metrics data
   */
  private async collectMetricsData(reportData: TestReportData): Promise<void> {
    const metricsFile = join(this.artifactsDir, 'metrics', 'metrics-snapshot.json');

    if (existsSync(metricsFile)) {
      try {
        const metrics = JSON.parse(await fs.readFile(metricsFile, 'utf8'));

        reportData.metrics.httpRequests = metrics.httpRequests || 0;
        reportData.metrics.databaseQueries = metrics.databaseQueries || 0;
        reportData.metrics.cacheHitRatio = metrics.cacheHitRatio || 0;
        reportData.metrics.queueJobs = metrics.queueJobs || 0;

        // Extract performance metrics
        if (metrics.performance) {
          reportData.performance.averageResponseTime = metrics.performance.averageResponseTime || 0;
          reportData.performance.p95ResponseTime = metrics.performance.p95ResponseTime || 0;
          reportData.performance.errorRate = metrics.performance.errorRate || 0;
          reportData.performance.slowEndpoints = metrics.performance.slowEndpoints || [];
        }
      } catch (error) {
        console.warn('⚠️  Failed to parse metrics data:', error);
      }
    }
  }

  /**
   * Collect database inspection results
   */
  private async collectDatabaseData(reportData: TestReportData): Promise<void> {
    const dbSnapshotFile = join(this.artifactsDir, 'db-snapshots', 'database-inspection.json');

    if (existsSync(dbSnapshotFile)) {
      try {
        const inspection = JSON.parse(await fs.readFile(dbSnapshotFile, 'utf8'));

        reportData.database.integrity = inspection.integrity || false;
        reportData.database.testUsers = inspection.testUsers || 0;
        reportData.database.testTrades = inspection.testTrades || 0;
        reportData.database.testItems = inspection.testItems || 0;
      } catch (error) {
        console.warn('⚠️  Failed to parse database inspection:', error);
      }
    }
  }

  /**
   * Collect test artifacts
   */
  private async collectArtifacts(reportData: TestReportData): Promise<void> {
    // Collect screenshots
    const screenshotsDir = join(this.artifactsDir, 'screenshots');
    if (existsSync(screenshotsDir)) {
      const files = readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
      reportData.artifacts.screenshots = files.map(f => join('screenshots', f));
    }

    // Collect videos
    const videosDir = join(this.artifactsDir, 'videos');
    if (existsSync(videosDir)) {
      const files = readdirSync(videosDir).filter(f => f.endsWith('.webm'));
      reportData.artifacts.videos = files.map(f => join('videos', f));
    }

    // Collect logs
    const logsDir = join(this.artifactsDir, 'logs');
    if (existsSync(logsDir)) {
      const files = readdirSync(logsDir).filter(f => f.endsWith('.log') || f.endsWith('.txt'));
      reportData.artifacts.logs = files.map(f => join('logs', f));
    }

    // Collect reports
    const reportsDir = join(this.artifactsDir, 'reports');
    if (existsSync(reportsDir)) {
      const files = readdirSync(reportsDir).filter(f => f.endsWith('.html') || f.endsWith('.json'));
      reportData.artifacts.reports = files.map(f => join('reports', f));
    }
  }

  /**
   * Generate HTML report
   */
  private async generateHtmlReport(reportData: TestReportData): Promise<string> {
    const htmlContent = this.generateHtmlTemplate(reportData);
    const outputPath = join(this.artifactsDir, 'reports', `e2e-test-report-${this.timestamp}.html`);

    await fs.writeFile(outputPath, htmlContent, 'utf8');
    return outputPath;
  }

  /**
   * Generate JSON report
   */
  private async generateJsonReport(reportData: TestReportData): Promise<string> {
    const outputPath = join(this.artifactsDir, 'reports', `e2e-test-report-${this.timestamp}.json`);
    const jsonContent = JSON.stringify(reportData, null, 2);

    await fs.writeFile(outputPath, jsonContent, 'utf8');
    return outputPath;
  }

  /**
   * Generate HTML template
   */
  private generateHtmlTemplate(data: TestReportData): string {
    const passRate = data.testResults.total > 0
      ? ((data.testResults.passed / data.testResults.total) * 100).toFixed(1)
      : '0';

    const criticalIssues = this.findCriticalIssues(data);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E Test Report - ${new Date(data.metadata.timestamp).toLocaleString()}</title>
    <style>
        ${this.getReportStyles()}
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🧪 E2E Test Report</h1>
            <p class="timestamp">Generated: ${new Date(data.metadata.timestamp).toLocaleString()}</p>
            <p class="duration">Duration: ${(data.metadata.duration / 1000).toFixed(2)}s</p>
        </header>

        ${criticalIssues.length > 0 ? `
        <section class="critical-issues">
            <h2>🚨 Critical Issues</h2>
            <div class="issues-grid">
                ${criticalIssues.map(issue => `
                <div class="issue-card">
                    <h3>${issue.type}</h3>
                    <p>${issue.description}</p>
                </div>
                `).join('')}
            </div>
        </section>
        ` : ''}

        <section class="executive-summary">
            <h2>📊 Executive Summary</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Test Results</h3>
                    <div class="metric">
                        <span class="value">${passRate}%</span>
                        <span class="label">Pass Rate</span>
                    </div>
                    <div class="details">
                        <span class="passed">✅ ${data.testResults.passed} Passed</span>
                        <span class="failed">❌ ${data.testResults.failed} Failed</span>
                        <span class="skipped">⏭️ ${data.testResults.skipped} Skipped</span>
                    </div>
                </div>

                <div class="summary-card">
                    <h3>API Tests</h3>
                    <div class="metric">
                        <span class="value">${data.apiResults.total}</span>
                        <span class="label">Endpoints Tested</span>
                    </div>
                    <div class="details">
                        <span class="passed">✅ ${data.apiResults.passed} Passed</span>
                        <span class="failed">❌ ${data.apiResults.failed} Failed</span>
                    </div>
                </div>

                <div class="summary-card">
                    <h3>Performance</h3>
                    <div class="metric">
                        <span class="value">${data.performance.averageResponseTime.toFixed(0)}ms</span>
                        <span class="label">Avg Response Time</span>
                    </div>
                    <div class="details">
                        <span>Error Rate: ${data.performance.errorRate.toFixed(2)}%</span>
                        <span>P95: ${data.performance.p95ResponseTime}ms</span>
                    </div>
                </div>

                <div class="summary-card">
                    <h3>System Health</h3>
                    <div class="metric">
                        <span class="value">${data.logs.summary.errorCount}</span>
                        <span class="label">Errors Found</span>
                    </div>
                    <div class="details">
                        <span>Unique Errors: ${data.logs.summary.uniqueErrors}</span>
                        <span>Anomalies: ${data.logs.summary.anomaliesDetected}</span>
                    </div>
                </div>
            </div>
        </section>

        <section class="test-results">
            <h2>🧪 Test Results by Module</h2>
            ${data.testResults.suites.map(suite => `
            <div class="suite-section">
                <h3>${suite.name} <span class="suite-stats">(${suite.passed}/${suite.total} passed)</span></h3>
                <div class="tests-grid">
                    ${suite.tests.map(test => `
                    <div class="test-item ${test.status}">
                        <div class="test-name">${test.name}</div>
                        <div class="test-status">${test.status}</div>
                        <div class="test-duration">${test.duration}ms</div>
                        ${test.error ? `<div class="test-error">${test.error}</div>` : ''}
                        ${test.screenshot ? `<div class="test-artifact"><a href="${test.screenshot}">Screenshot</a></div>` : ''}
                    </div>
                    `).join('')}
                </div>
            </div>
            `).join('')}
        </section>

        <section class="performance-analysis">
            <h2>⚡ Performance Analysis</h2>
            <div class="performance-grid">
                <div class="performance-card">
                    <h3>Response Times</h3>
                    <div>Average: ${data.performance.averageResponseTime.toFixed(0)}ms</div>
                    <div>P95: ${data.performance.p95ResponseTime}ms</div>
                </div>
                <div class="performance-card">
                    <h3>Error Rate</h3>
                    <div>${data.performance.errorRate.toFixed(2)}%</div>
                </div>
                <div class="performance-card">
                    <h3>Slow Endpoints</h3>
                    ${data.performance.slowEndpoints.slice(0, 5).map(ep => `
                    <div>${ep.method} ${ep.url} - ${ep.duration}ms</div>
                    `).join('')}
                </div>
            </div>
        </section>

        <section class="logs-analysis">
            <h2>📋 Log Analysis</h2>
            <div class="logs-summary">
                <div>Total Logs: ${data.logs.summary.totalLogs}</div>
                <div class="error-count">Errors: ${data.logs.summary.errorCount}</div>
                <div>Warnings: ${data.logs.summary.warnCount}</div>
                <div>Unique Errors: ${data.logs.summary.uniqueErrors}</div>
                <div>Anomalies: ${data.logs.summary.anomaliesDetected}</div>
            </div>

            ${data.logs.errors.length > 0 ? `
            <div class="errors-section">
                <h3>Recent Errors</h3>
                ${data.logs.errors.slice(0, 10).map(error => `
                <div class="log-entry">
                    <div class="log-time">${error.timestamp}</div>
                    <div class="log-message">${error.message}</div>
                    ${error.context ? `<div class="log-context">${error.context}</div>` : ''}
                </div>
                `).join('')}
            </div>
            ` : ''}

            ${data.logs.anomalies.length > 0 ? `
            <div class="anomalies-section">
                <h3>Detected Anomalies</h3>
                ${data.logs.anomalies.map(anomaly => `
                <div class="anomaly-card ${anomaly.severity}">
                    <h4>${anomaly.type}</h4>
                    <p>${anomaly.message}</p>
                    <p class="anomaly-description">${anomaly.description}</p>
                </div>
                `).join('')}
            </div>
            ` : ''}
        </section>

        <section class="artifacts">
            <h2>📁 Test Artifacts</h2>
            <div class="artifacts-grid">
                ${data.artifacts.screenshots.length > 0 ? `
                <div class="artifact-section">
                    <h3>Screenshots (${data.artifacts.screenshots.length})</h3>
                    ${data.artifacts.screenshots.map(screenshot => `
                    <div class="artifact-item">
                        <a href="${screenshot}">${basename(screenshot)}</a>
                    </div>
                    `).join('')}
                </div>
                ` : ''}

                ${data.artifacts.videos.length > 0 ? `
                <div class="artifact-section">
                    <h3>Videos (${data.artifacts.videos.length})</h3>
                    ${data.artifacts.videos.map(video => `
                    <div class="artifact-item">
                        <a href="${video}">${basename(video)}</a>
                    </div>
                    `).join('')}
                </div>
                ` : ''}

                ${data.artifacts.logs.length > 0 ? `
                <div class="artifact-section">
                    <h3>Logs (${data.artifacts.logs.length})</h3>
                    ${data.artifacts.logs.map(log => `
                    <div class="artifact-item">
                        <a href="${log}">${basename(log)}</a>
                    </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        </section>

        <footer class="footer">
            <p>Report generated by Steam Marketplace E2E Testing Framework</p>
            <p>For issues and questions, see the <a href="tests/e2e/manual/issue-template.md">issue template</a></p>
        </footer>
    </div>
</body>
</html>`;
  }

  /**
   * Get CSS styles for the report
   */
  private getReportStyles(): string {
    return `
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #2c7be5;
            margin-bottom: 10px;
        }
        .executive-summary {
            margin: 30px 0;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .summary-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 15px 0;
            color: #495057;
        }
        .metric {
            font-size: 2em;
            font-weight: bold;
            color: #2c7be5;
            margin: 10px 0;
        }
        .metric .label {
            font-size: 0.5em;
            color: #6c757d;
            display: block;
        }
        .details {
            display: flex;
            flex-direction: column;
            gap: 5px;
            font-size: 0.9em;
        }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .error-count { color: #dc3545; font-weight: bold; }
        .test-results {
            margin: 30px 0;
        }
        .suite-section {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
        }
        .tests-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }
        .test-item {
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #dee2e6;
        }
        .test-item.passed { background-color: #d4edda; border-color: #c3e6cb; }
        .test-item.failed { background-color: #f8d7da; border-color: #f5c6cb; }
        .test-item.skipped { background-color: #fff3cd; border-color: #ffeaa7; }
        .test-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .test-status {
            font-size: 0.9em;
            margin-bottom: 5px;
        }
        .test-error {
            color: #dc3545;
            font-size: 0.8em;
            margin-top: 5px;
        }
        .suite-stats {
            font-size: 0.9em;
            color: #6c757d;
        }
        .performance-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .performance-card {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            text-align: center;
        }
        .logs-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin: 20px 0;
        }
        .log-entry {
            padding: 10px;
            margin: 5px 0;
            background: #f8f9fa;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9em;
        }
        .log-time {
            color: #6c757d;
            font-size: 0.8em;
        }
        .anomaly-card {
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid;
        }
        .anomaly-card.high {
            background-color: #f8d7da;
            border-left-color: #dc3545;
        }
        .anomaly-card.medium {
            background-color: #fff3cd;
            border-left-color: #ffc107;
        }
        .anomaly-card.low {
            background-color: #d1ecf1;
            border-left-color: #17a2b8;
        }
        .artifacts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .artifact-section {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .artifact-item {
            margin: 5px 0;
            padding: 5px 0;
        }
        .critical-issues {
            margin: 20px 0;
            padding: 20px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
        }
        .issues-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .issue-card {
            padding: 15px;
            background: white;
            border-radius: 8px;
            border-left: 4px solid #dc3545;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
        }
        a {
            color: #2c7be5;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        h2, h3 {
            color: #495057;
            margin: 25px 0 15px 0;
        }
        h4 {
            margin: 15px 0 10px 0;
            color: #495057;
        }
        .anomaly-description {
            font-style: italic;
            color: #6c757d;
            margin-top: 5px;
        }
    `;
  }

  /**
   * Find critical issues in the report data
   */
  private findCriticalIssues(data: TestReportData): Array<{ type: string; description: string }> {
    const issues: Array<{ type: string; description: string }> = [];

    // Check test failure rate
    const failureRate = data.testResults.total > 0
      ? (data.testResults.failed / data.testResults.total) * 100
      : 0;

    if (failureRate > 20) {
      issues.push({
        type: 'High Test Failure Rate',
        description: `${failureRate.toFixed(1)}% of tests failed (${data.testResults.failed}/${data.testResults.total})`
      });
    }

    // Check error rate
    if (data.performance.errorRate > 5) {
      issues.push({
        type: 'High API Error Rate',
        description: `API error rate is ${data.performance.errorRate.toFixed(2)}%`
      });
    }

    // Check for critical errors
    if (data.logs.summary.errorCount > 50) {
      issues.push({
        type: 'High Error Count',
        description: `${data.logs.summary.errorCount} errors found in logs`
      });
    }

    // Check for anomalies
    if (data.logs.summary.anomaliesDetected > 10) {
      issues.push({
        type: 'Multiple Anomalies',
        description: `${data.logs.summary.anomaliesDetected} system anomalies detected`
      });
    }

    return issues;
  }

  /**
   * Extract number from text using regex
   */
  private extractNumber(text: string, pattern: string): number {
    const match = text.match(new RegExp(`${pattern}\\s*(\\d+)`));
    return match ? parseInt(match[1]) : 0;
  }
}

// CLI usage
if (require.main === module) {
  const generator = new TestReportGenerator();

  generator.generateReport()
    .then(({ htmlPath, jsonPath }) => {
      console.log('✅ Report generation completed');
      console.log(`📄 HTML: ${htmlPath}`);
      console.log(`📄 JSON: ${jsonPath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Report generation failed:', error);
      process.exit(1);
    });
}