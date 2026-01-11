/**
 * Test Report Generator Utility for Complete E2E Flow
 *
 * Generates comprehensive test reports for the complete E2E flow test including
 * execution logs, performance metrics, error analysis, screenshots, and system
 * health monitoring. Creates both HTML and JSON reports with detailed analysis
 * and actionable insights.
 */

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import { existsSync, mkdirSync } from 'fs';
import Handlebars from 'handlebars';

export interface TestStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  duration: number;
  details: string;
  timestamp: string;
  metadata?: any;
}

export interface TestReportData {
  metadata: {
    testName: string;
    timestamp: string;
    duration: number;
    environment: {
      baseUrl: string;
      apiUrl: string;
      wsUrl: string;
    };
    configuration: any;
  };
  execution: {
    startTime: string;
    endTime: string;
    status: 'running' | 'completed' | 'failed';
    progress: number;
    steps: TestStep[];
  };
  performance: {
    metrics: any[];
    summary: {
      averagePageLoadTime: number;
      averageApiResponseTime: number;
      memoryUsage: number;
      networkRequests: number;
    };
    thresholds: any[];
    violations: any[];
  };
  errors: {
    count: number;
    details: Array<{
      timestamp: string;
      level: string;
      message: string;
      context?: string;
      stack?: string;
    }>;
    scenarios: Array<{
      name: string;
      passed: boolean;
      details: string;
    }>;
  };
  screenshots: Array<{
    name: string;
    path: string;
    timestamp: string;
    step: string;
  }>;
  logs: {
    summary: {
      total: number;
      errors: number;
      warnings: number;
      critical: number;
    };
    entries: Array<{
      timestamp: string;
      level: string;
      message: string;
      context?: string;
    }>;
  };
  systemHealth: {
    databaseConnections: number;
    activeUsers: number;
    botStatus: string;
    websocketConnections: number;
  };
  recommendations: string[];
  artifacts: {
    screenshots: string[];
    logs: string[];
    traces: string[];
    videos: string[];
  };
}

export class TestReportGenerator {
  private config: any;
  private reportData: TestReportData;
  private artifactsDir: string;
  private reportDir: string;

  constructor(config: any) {
    this.config = config;
    this.artifactsDir = join(process.cwd(), 'tests/e2e/artifacts');
    this.reportDir = join(this.artifactsDir, 'reports');

    // Ensure directories exist
    if (!existsSync(this.artifactsDir)) {
      mkdirSync(this.artifactsDir, { recursive: true });
    }
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }

    // Initialize report data
    this.reportData = {
      metadata: {
        testName: '',
        timestamp: '',
        duration: 0,
        environment: {
          baseUrl: config.app?.baseUrl || '',
          apiUrl: config.app?.apiUrl || '',
          wsUrl: config.app?.wsUrl || ''
        },
        configuration: config
      },
      execution: {
        startTime: '',
        endTime: '',
        status: 'pending',
        progress: 0,
        steps: []
      },
      performance: {
        metrics: [],
        summary: {
          averagePageLoadTime: 0,
          averageApiResponseTime: 0,
          memoryUsage: 0,
          networkRequests: 0
        },
        thresholds: [],
        violations: []
      },
      errors: {
        count: 0,
        details: [],
        scenarios: []
      },
      screenshots: [],
      logs: {
        summary: {
          total: 0,
          errors: 0,
          warnings: 0,
          critical: 0
        },
        entries: []
      },
      systemHealth: {
        databaseConnections: 0,
        activeUsers: 0,
        botStatus: 'unknown',
        websocketConnections: 0
      },
      recommendations: [],
      artifacts: {
        screenshots: [],
        logs: [],
        traces: [],
        videos: []
      }
    };
  }

  /**
   * Start a new test report
   */
  async startReport(testName: string): Promise<void> {
    this.reportData.metadata.testName = testName;
    this.reportData.metadata.timestamp = new Date().toISOString();
    this.reportData.execution.startTime = new Date().toISOString();
    this.reportData.execution.status = 'running';

    console.log(`📊 Starting test report for: ${testName}`);
  }

  /**
   * Add a test step to the report
   */
  addStep(stepName: string, status: 'pending' | 'in_progress' | 'completed' | 'failed', duration: number, details: string, metadata?: any): void {
    const step: TestStep = {
      name: stepName,
      status,
      duration,
      details,
      timestamp: new Date().toISOString(),
      metadata
    };

    // Update existing step or add new one
    const existingStep = this.reportData.execution.steps.find(s => s.name === stepName);
    if (existingStep) {
      Object.assign(existingStep, step);
    } else {
      this.reportData.execution.steps.push(step);
    }

    // Update progress
    this.updateProgress();

    console.log(`📋 Step ${status}: ${stepName} (${duration}ms) - ${details}`);
  }

  /**
   * Add a screenshot to the report
   */
  async addScreenshot(stepName: string, screenshotPath: string): Promise<void> {
    const screenshot = {
      name: `${stepName}_${Date.now()}.png`,
      path: screenshotPath,
      timestamp: new Date().toISOString(),
      step: stepName
    };

    this.reportData.screenshots.push(screenshot);
    this.reportData.artifacts.screenshots.push(screenshotPath);

    console.log(`📸 Screenshot added for ${stepName}: ${screenshotPath}`);
  }

  /**
   * Add a log entry to the report
   */
  addLog(level: string, message: string, context?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    this.reportData.logs.entries.push(logEntry);

    // Update summary
    switch (level) {
      case 'error':
        this.reportData.logs.summary.errors++;
        this.reportData.logs.summary.total++;
        this.reportData.errors.count++;
        this.reportData.errors.details.push({
          timestamp: logEntry.timestamp,
          level: 'error',
          message,
          context
        });
        break;
      case 'warn':
        this.reportData.logs.summary.warnings++;
        this.reportData.logs.summary.total++;
        break;
      default:
        this.reportData.logs.summary.total++;
        break;
    }

    console.log(`📝 Log ${level}: ${message}`);
  }

  /**
   * Add a performance metric to the report
   */
  addMetric(name: string, value: number, unit: string, context?: string): void {
    const metric = {
      name,
      value,
      unit,
      context,
      timestamp: new Date().toISOString()
    };

    this.reportData.performance.metrics.push(metric);

    // Update summary metrics
    if (name === 'page_load_time') {
      const existing = this.reportData.performance.summary.averagePageLoadTime;
      this.reportData.performance.summary.averagePageLoadTime =
        existing > 0 ? (existing + value) / 2 : value;
    } else if (name === 'api_response_time') {
      const existing = this.reportData.performance.summary.averageApiResponseTime;
      this.reportData.performance.summary.averageApiResponseTime =
        existing > 0 ? (existing + value) / 2 : value;
    } else if (name === 'memory_used_heap') {
      this.reportData.performance.summary.memoryUsage = value;
    } else if (name === 'network_request_started') {
      this.reportData.performance.summary.networkRequests++;
    }

    console.log(`⚡ Metric: ${name} = ${value}${unit}`);
  }

  /**
   * Add an error scenario result to the report
   */
  addErrorScenario(name: string, passed: boolean, details: string): void {
    this.reportData.errors.scenarios.push({
      name,
      passed,
      details
    });

    console.log(`🧪 Error scenario ${passed ? 'passed' : 'failed'}: ${name} - ${details}`);
  }

  /**
   * Assert performance metric and add violation if failed
   */
  assertPerformance(metric: string, actualValue: number, threshold: string): void {
    const thresholdMatch = threshold.match(/([<>=]+)\s*(\d+)\s*(\w+)/);
    if (!thresholdMatch) return;

    const [, operator, thresholdValue, unit] = thresholdMatch;
    const thresholdNum = parseInt(thresholdValue);
    let violated = false;

    switch (operator) {
      case '<':
        violated = actualValue >= thresholdNum;
        break;
      case '>':
        violated = actualValue <= thresholdNum;
        break;
      case '<=':
        violated = actualValue > thresholdNum;
        break;
      case '>=':
        violated = actualValue < thresholdNum;
        break;
      case '=':
        violated = actualValue !== thresholdNum;
        break;
    }

    if (violated) {
      this.reportData.performance.violations.push({
        metric,
        actualValue,
        threshold: `${operator} ${thresholdValue}${unit}`,
        timestamp: new Date().toISOString(),
        severity: operator === '<' && actualValue > thresholdNum * 1.5 ? 'critical' : 'warning'
      });

      this.addLog('warn', `Performance threshold violated: ${metric} = ${actualValue}${unit}, expected ${threshold}`);
    }

    // Add threshold definition
    this.reportData.performance.thresholds.push({
      metric,
      operator,
      value: thresholdNum,
      unit
    });
  }

  /**
   * Add system health information
   */
  addSystemHealth(health: Partial<typeof this.reportData.systemHealth>): void {
    Object.assign(this.reportData.systemHealth, health);
    console.log('🏥 System health updated:', health);
  }

  /**
   * Add recommendation to the report
   */
  addRecommendation(recommendation: string): void {
    this.reportData.recommendations.push(recommendation);
    console.log(`💡 Recommendation: ${recommendation}`);
  }

  /**
   * Generate the final test report
   */
  async generateReport(): Promise<TestReportData> {
    this.reportData.execution.endTime = new Date().toISOString();
    this.reportData.execution.status = 'completed';
    this.reportData.metadata.duration = Date.now() - new Date(this.reportData.execution.startTime).getTime();

    // Generate recommendations
    this.generateRecommendations();

    // Collect artifacts
    await this.collectArtifacts();

    console.log('📊 Test report generated successfully');
    return this.reportData;
  }

  /**
   * Export report in specified format
   */
  async exportReport(format: 'html' | 'json' | 'markdown' = 'html'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let outputPath = '';

    switch (format) {
      case 'json':
        outputPath = await this.exportJsonReport(timestamp);
        break;
      case 'markdown':
        outputPath = await this.exportMarkdownReport(timestamp);
        break;
      case 'html':
      default:
        outputPath = await this.exportHtmlReport(timestamp);
        break;
    }

    console.log(`📄 Report exported to: ${outputPath}`);
    return outputPath;
  }

  /**
   * Export HTML report
   */
  private async exportHtmlReport(timestamp: string): Promise<string> {
    const templatePath = join(__dirname, 'templates', 'test-report.html');
    let template: string;

    try {
      template = await fs.readFile(templatePath, 'utf8');
    } catch {
      // Use built-in template if file doesn't exist
      template = this.getBuiltInHtmlTemplate();
    }

    const compiledTemplate = Handlebars.compile(template);
    const htmlContent = compiledTemplate(this.getTemplateContext());

    const outputPath = join(this.reportDir, `e2e-test-report-${timestamp}.html`);
    await fs.writeFile(outputPath, htmlContent, 'utf8');

    return outputPath;
  }

  /**
   * Export JSON report
   */
  private async exportJsonReport(timestamp: string): Promise<string> {
    const outputPath = join(this.reportDir, `e2e-test-report-${timestamp}.json`);
    const jsonContent = JSON.stringify(this.reportData, null, 2);
    await fs.writeFile(outputPath, jsonContent, 'utf8');
    return outputPath;
  }

  /**
   * Export Markdown report
   */
  private async exportMarkdownReport(timestamp: string): Promise<string> {
    const markdown = this.generateMarkdownReport();
    const outputPath = join(this.reportDir, `e2e-test-report-${timestamp}.md`);
    await fs.writeFile(outputPath, markdown, 'utf8');
    return outputPath;
  }

  /**
   * Get template context for HTML report
   */
  private getTemplateContext(): any {
    const passRate = this.reportData.execution.steps.length > 0
      ? (this.reportData.execution.steps.filter(s => s.status === 'completed').length /
        this.reportData.execution.steps.length) * 100
      : 0;

    const errorRate = this.reportData.performance.metrics.length > 0
      ? (this.reportData.performance.violations.length /
        this.reportData.performance.metrics.length) * 100
      : 0;

    return {
      ...this.reportData,
      summary: {
        passRate: passRate.toFixed(1),
        errorRate: errorRate.toFixed(2),
        totalSteps: this.reportData.execution.steps.length,
        completedSteps: this.reportData.execution.steps.filter(s => s.status === 'completed').length,
        failedSteps: this.reportData.execution.steps.filter(s => s.status === 'failed').length,
        totalErrors: this.reportData.errors.count,
        totalRecommendations: this.reportData.recommendations.length
      },
      durationFormatted: this.formatDuration(this.reportData.metadata.duration),
      timestampFormatted: new Date(this.reportData.metadata.timestamp).toLocaleString()
    };
  }

  /**
   * Generate built-in HTML template
   */
  private getBuiltInHtmlTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E Test Report - {{metadata.testName}}</title>
    <style>
        /* Inline CSS styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .header h2 {
            font-size: 1.5em;
            margin-bottom: 10px;
            opacity: 0.9;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }

        .summary-card h3 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 1.1em;
        }

        .metric {
            font-size: 2em;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }

        .label {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 10px;
        }

        .details {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .details span {
            font-size: 0.85em;
            color: #888;
        }

        .details .passed {
            color: #28a745;
        }

        .details .failed {
            color: #dc3545;
        }

        .details .total {
            color: #667eea;
        }

        .steps-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }

        .step-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #ddd;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .step-item.completed {
            border-left-color: #28a745;
        }

        .step-item.failed {
            border-left-color: #dc3545;
        }

        .step-item.in_progress {
            border-left-color: #ffc107;
        }

        .step-name {
            font-weight: bold;
            margin-bottom: 8px;
            color: #333;
        }

        .step-status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            margin-bottom: 8px;
        }

        .step-item.completed .step-status {
            background: #d4edda;
            color: #155724;
        }

        .step-item.failed .step-status {
            background: #f8d7da;
            color: #721c24;
        }

        .step-duration {
            color: #666;
            margin-bottom: 8px;
        }

        .step-details {
            color: #888;
            font-size: 0.9em;
            margin-bottom: 8px;
        }

        .step-timestamp {
            color: #aaa;
            font-size: 0.8em;
        }

        .violation-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #ffc107;
        }

        .violation-item.critical {
            border-left-color: #dc3545;
        }

        .violation-item.warning {
            border-left-color: #ffc107;
        }

        .errors-grid {
            display: grid;
            gap: 15px;
        }

        .error-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #dc3545;
        }

        .error-time {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 5px;
        }

        .error-level {
            display: inline-block;
            padding: 2px 8px;
            background: #dc3545;
            color: white;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            margin-bottom: 8px;
        }

        .error-message {
            font-weight: 500;
            margin-bottom: 8px;
        }

        .error-context {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            font-size: 0.9em;
            color: #666;
            border-left: 3px solid #6c757d;
        }

        .scenarios-grid {
            display: grid;
            gap: 15px;
        }

        .scenario-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #ddd;
        }

        .scenario-item.passed {
            border-left-color: #28a745;
        }

        .scenario-item.failed {
            border-left-color: #dc3545;
        }

        .recommendations-list {
            list-style: none;
            padding: 0;
        }

        .recommendations-list li {
            background: white;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #ffc107;
        }

        .screenshots-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .screenshot-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .screenshot-image {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin-bottom: 10px;
        }

        .screenshot-time {
            color: #aaa;
            font-size: 0.8em;
        }

        .footer {
            text-align: center;
            padding: 30px;
            color: #666;
            font-size: 0.9em;
            border-top: 1px solid #eee;
            margin-top: 30px;
        }

        .progress-bar {
            background: #f8f9fa;
            height: 20px;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 20px;
        }

        .progress-fill {
            background: linear-gradient(90deg, #28a745, #20c997);
            height: 100%;
            transition: width 0.3s ease;
        }

        .expanded .step-details {
            max-height: 200px;
            overflow-y: auto;
            background: #f8f9fa;
            padding: 10px;
            margin: 10px -15px -15px -15px;
            border-top: 1px solid #eee;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🧪 E2E Test Report</h1>
            <h2>{{metadata.testName}}</h2>
            <p class="timestamp">Generated: {{timestampFormatted}}</p>
            <p class="duration">Duration: {{durationFormatted}}</p>
        </header>

        <section class="executive-summary">
            <h2>📊 Executive Summary</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Test Execution</h3>
                    <div class="metric">{{summary.passRate}}%</div>
                    <div class="label">Pass Rate</div>
                    <div class="details">
                        <span class="passed">✅ {{summary.completedSteps}} Passed</span>
                        <span class="failed">❌ {{summary.failedSteps}} Failed</span>
                        <span class="total">📋 {{summary.totalSteps}} Total</span>
                    </div>
                </div>
                <div class="summary-card">
                    <h3>Performance</h3>
                    <div class="metric">{{performance.summary.averagePageLoadTime.toFixed(0)}}ms</div>
                    <div class="label">Avg Page Load</div>
                    <div class="details">
                        <span>{{performance.summary.averageApiResponseTime.toFixed(0)}}ms API</span>
                        <span>{{performance.summary.networkRequests}} requests</span>
                        <span>{{performance.violations.length}} violations</span>
                    </div>
                </div>
                <div class="summary-card">
                    <h3>System Health</h3>
                    <div class="metric">{{summary.totalErrors}}</div>
                    <div class="label">Errors Found</div>
                    <div class="details">
                        <span>Bots: {{systemHealth.botStatus}}</span>
                        <span>DB: {{systemHealth.databaseConnections}} conn</span>
                        <span>Users: {{systemHealth.activeUsers}}</span>
                    </div>
                </div>
            </div>
        </section>

        <section class="execution-flow">
            <h2>🔄 Test Execution Flow</h2>
            <div class="progress-bar">
                <div class="progress-fill" style="width: {{summary.passRate}}%"></div>
            </div>
            <div class="steps-grid">
                {{#each execution.steps}}
                <div class="step-item {{this.status}}">
                    <div class="step-name">{{this.name}}</div>
                    <div class="step-status">{{this.status}}</div>
                    <div class="step-duration">{{this.duration}}ms</div>
                    <div class="step-details">{{this.details}}</div>
                    <div class="step-timestamp">{{this.timestamp}}</div>
                </div>
                {{/each}}
            </div>
        </section>

        {{#if performance.violations.length}}
        <section class="performance-issues">
            <h2>⚠️ Performance Issues</h2>
            {{#each performance.violations}}
            <div class="violation-item {{this.severity}}">
                <h3>{{this.metric}}</h3>
                <p>Actual: {{this.actualValue}}{{this.unit}}</p>
                <p>Expected: {{this.threshold}}</p>
                <p>Severity: {{this.severity}}</p>
            </div>
            {{/each}}
        </section>
        {{/if}}

        {{#if errors.details.length}}
        <section class="error-analysis">
            <h2>❌ Error Analysis</h2>
            <div class="errors-grid">
                {{#each errors.details}}
                <div class="error-item">
                    <div class="error-time">{{this.timestamp}}</div>
                    <div class="error-level">{{this.level}}</div>
                    <div class="error-message">{{this.message}}</div>
                    {{#if this.context}}
                    <div class="error-context">{{this.context}}</div>
                    {{/if}}
                </div>
                {{/each}}
            </div>
        </section>
        {{/if}}

        {{#if errors.scenarios.length}}
        <section class="error-scenarios">
            <h2>🧪 Error Scenarios</h2>
            <div class="scenarios-grid">
                {{#each errors.scenarios}}
                <div class="scenario-item {{#if this.passed}}passed{{else}}failed{{/if}}">
                    <h3>{{this.name}}</h3>
                    <div class="scenario-status">{{#if this.passed}}✅ Passed{{else}}❌ Failed{{/if}}</div>
                    <p>{{this.details}}</p>
                </div>
                {{/each}}
            </div>
        </section>
        {{/if}}

        {{#if recommendations.length}}
        <section class="recommendations">
            <h2>💡 Recommendations</h2>
            <ul class="recommendations-list">
                {{#each recommendations}}
                <li>{{this}}</li>
                {{/each}}
            </ul>
        </section>
        {{/if}}

        {{#if screenshots.length}}
        <section class="screenshots">
            <h2>📸 Screenshots</h2>
            <div class="screenshots-grid">
                {{#each screenshots}}
                <div class="screenshot-item">
                    <h3>{{this.step}}</h3>
                    <img src="{{this.path}}" alt="{{this.name}}" class="screenshot-image">
                    <div class="screenshot-time">{{this.timestamp}}</div>
                </div>
                {{/each}}
            </div>
        </section>
        {{/if}}

        <footer class="footer">
            <p>Report generated by Steam Marketplace E2E Testing Framework</p>
            <p>Test Environment: {{metadata.environment.baseUrl}}</p>
        </footer>
    </div>

    <script>
        // Add interactivity
        document.addEventListener('DOMContentLoaded', function() {
            // Add click handlers for expanding details
            const stepItems = document.querySelectorAll('.step-item');
            stepItems.forEach(item => {
                item.addEventListener('click', function() {
                    this.classList.toggle('expanded');
                });
            });
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(): string {
    const passRate = this.reportData.execution.steps.length > 0
      ? (this.reportData.execution.steps.filter(s => s.status === 'completed').length /
        this.reportData.execution.steps.length) * 100
      : 0;

    return `# E2E Test Report: ${this.reportData.metadata.testName}

## Executive Summary

- **Test Name**: ${this.reportData.metadata.testName}
- **Duration**: ${this.formatDuration(this.reportData.metadata.duration)}
- **Generated**: ${new Date(this.reportData.metadata.timestamp).toLocaleString()}
- **Pass Rate**: ${passRate.toFixed(1)}%
- **Total Steps**: ${this.reportData.execution.steps.length}
- **Environment**: ${this.reportData.metadata.environment.baseUrl}

### Performance Summary

- **Average Page Load Time**: ${this.reportData.performance.summary.averagePageLoadTime.toFixed(0)}ms
- **Average API Response Time**: ${this.reportData.performance.summary.averageApiResponseTime.toFixed(0)}ms
- **Memory Usage**: ${(this.reportData.performance.summary.memoryUsage / 1024 / 1024).toFixed(1)}MB
- **Network Requests**: ${this.reportData.performance.summary.networkRequests}
- **Performance Violations**: ${this.reportData.performance.violations.length}

### Test Execution Flow

| Step | Status | Duration | Details |
|------|--------|----------|---------|
${this.reportData.execution.steps.map(step => `| ${step.name} | ${step.status} | ${step.duration}ms | ${step.details} |`).join('\n')}

### Error Analysis

**Total Errors**: ${this.reportData.errors.count}

${this.reportData.errors.details.map(error => `
#### ${error.timestamp} - ${error.level}
${error.message}
${error.context ? `**Context**: ${JSON.stringify(error.context)}` : ''}
`).join('\n')}

### Error Scenarios

${this.reportData.errors.scenarios.map(scenario => `
#### ${scenario.name}
**Status**: ${scenario.passed ? '✅ Passed' : '❌ Failed'}
**Details**: ${scenario.details}
`).join('\n')}

### Performance Issues

${this.reportData.performance.violations.map(violation => `
#### ${violation.metric}
- **Actual**: ${violation.actualValue}
- **Expected**: ${violation.threshold}
- **Severity**: ${violation.severity}
`).join('\n')}

### System Health

- **Database Connections**: ${this.reportData.systemHealth.databaseConnections}
- **Active Users**: ${this.reportData.systemHealth.activeUsers}
- **Bot Status**: ${this.reportData.systemHealth.botStatus}
- **WebSocket Connections**: ${this.reportData.systemHealth.websocketConnections}

### Recommendations

${this.reportData.recommendations.map(rec => `- ${rec}`).join('\n')}

### Screenshots

${this.reportData.screenshots.map(screenshot => `
#### ${screenshot.step}
![${screenshot.name}](${screenshot.path})
_Taken at ${screenshot.timestamp}_
`).join('\n')}

---
*Report generated by Steam Marketplace E2E Testing Framework*
`;
  }

  /**
   * Update progress based on completed steps
   */
  private updateProgress(): void {
    const totalSteps = this.reportData.execution.steps.length;
    const completedSteps = this.reportData.execution.steps.filter(s => s.status === 'completed').length;
    this.reportData.execution.progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): void {
    const { performance, errors, execution } = this.reportData;

    // Performance recommendations
    if (performance.summary.averagePageLoadTime > 3000) {
      this.reportData.recommendations.push('Page load times are slow. Consider optimizing assets and implementing lazy loading.');
    }

    if (performance.summary.averageApiResponseTime > 1000) {
      this.reportData.recommendations.push('API response times are slow. Review database queries and consider caching.');
    }

    if (performance.violations.length > 5) {
      this.reportData.recommendations.push('Multiple performance threshold violations detected. Prioritize performance optimization.');
    }

    // Error recommendations
    if (errors.count > 10) {
      this.reportData.recommendations.push('High error count detected. Review error handling and logging.');
    }

    if (errors.scenarios.filter(s => !s.passed).length > 3) {
      this.reportData.recommendations.push('Multiple error scenarios failed. Improve error handling resilience.');
    }

    // Test execution recommendations
    const failedSteps = execution.steps.filter(s => s.status === 'failed').length;
    if (failedSteps > execution.steps.length * 0.2) {
      this.reportData.recommendations.push('High test failure rate. Review test stability and environment setup.');
    }

    // System health recommendations
    if (this.reportData.systemHealth.botStatus !== 'online') {
      this.reportData.recommendations.push('Bot status is not online. Check bot configuration and connectivity.');
    }
  }

  /**
   * Collect test artifacts
   */
  private async collectArtifacts(): Promise<void> {
    const artifactsDir = join(process.cwd(), 'tests/e2e/artifacts');

    // Collect screenshots
    const screenshotsDir = join(artifactsDir, 'screenshots');
    if (existsSync(screenshotsDir)) {
      const files = await fs.readdir(screenshotsDir);
      this.reportData.artifacts.screenshots = files
        .filter(f => f.endsWith('.png'))
        .map(f => join('screenshots', f));
    }

    // Collect logs
    const logsDir = join(artifactsDir, 'logs');
    if (existsSync(logsDir)) {
      const files = await fs.readdir(logsDir);
      this.reportData.artifacts.logs = files
        .filter(f => f.endsWith('.log') || f.endsWith('.txt'))
        .map(f => join('logs', f));
    }

    // Collect traces
    const tracesDir = join(artifactsDir, 'traces');
    if (existsSync(tracesDir)) {
      const files = await fs.readdir(tracesDir);
      this.reportData.artifacts.traces = files
        .filter(f => f.endsWith('.zip'))
        .map(f => join('traces', f));
    }

    // Collect videos
    const videosDir = join(artifactsDir, 'videos');
    if (existsSync(videosDir)) {
      const files = await fs.readdir(videosDir);
      this.reportData.artifacts.videos = files
        .filter(f => f.endsWith('.webm'))
        .map(f => join('videos', f));
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(duration: number): string {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Export for use in tests
export default TestReportGenerator;