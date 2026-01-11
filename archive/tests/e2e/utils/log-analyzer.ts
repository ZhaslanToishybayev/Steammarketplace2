/**
 * Log Analysis Utility for E2E Testing
 * Parses and analyzes system logs during E2E test runs
 */

import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { testConfig } from '../setup/test-config';

export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  context?: string;
  message: string;
  stack?: string;
  metadata?: any;
}

export interface LogAnalysisResult {
  summary: {
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    debugCount: number;
    uniqueErrors: number;
    anomaliesDetected: number;
  };
  errors: LogEntry[];
  warnings: LogEntry[];
  performance: {
    slowRequests: Array<{
      method: string;
      url: string;
      duration: number;
      timestamp: string;
    }>;
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
  };
  patterns: {
    errorPatterns: Array<{
      pattern: string;
      count: number;
      firstSeen: string;
      lastSeen: string;
    }>;
    frequentMessages: Array<{
      message: string;
      count: number;
      context?: string;
    }>;
  };
  audit: {
    adminActions: LogEntry[];
    userActions: LogEntry[];
    securityEvents: LogEntry[];
  };
  anomalies: Array<{
    type: string;
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

export class LogAnalyzer {
  private logFiles: string[] = [];
  private logEntries: LogEntry[] = [];

  constructor() {
    this.initializeLogFiles();
  }

  /**
   * Initialize log file paths
   */
  private initializeLogFiles(): void {
    const logDir = join(process.cwd(), 'apps/backend/logs');

    this.logFiles = [
      join(logDir, 'combined.log'),
      join(logDir, 'error.log'),
      join(logDir, 'access.log'),
      join(logDir, 'application.log')
    ].filter(file => existsSync(file));
  }

  /**
   * Parse all log files
   */
  async parseLogs(): Promise<void> {
    console.log('🔍 Parsing log files...');

    this.logEntries = [];

    for (const logFile of this.logFiles) {
      try {
        const content = await fs.readFile(logFile, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines) {
          const entry = this.parseLogLine(line);
          if (entry) {
            this.logEntries.push(entry);
          }
        }

        console.log(`📄 Parsed ${lines.length} lines from ${logFile}`);
      } catch (error) {
        console.warn(`⚠️  Failed to parse log file ${logFile}:`, error);
      }
    }

    // Sort by timestamp
    this.logEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    console.log(`✅ Total log entries parsed: ${this.logEntries.length}`);
  }

  /**
   * Parse a single log line
   */
  private parseLogLine(line: string): LogEntry | null {
    try {
      // Try JSON format first
      if (line.startsWith('{') && line.endsWith('}')) {
        const jsonLog = JSON.parse(line);
        return {
          timestamp: jsonLog.timestamp || new Date().toISOString(),
          level: jsonLog.level || 'info',
          context: jsonLog.context || jsonLog.module,
          message: jsonLog.message || '',
          stack: jsonLog.stack,
          metadata: jsonLog.metadata || jsonLog.meta
        };
      }

      // Try Winston format
      const winstonMatch = line.match(/^\[(.*?)\] (\w+) (.+?)(?: - (.*))?$/);
      if (winstonMatch) {
        return {
          timestamp: winstonMatch[1],
          level: winstonMatch[2].toLowerCase() as any,
          context: winstonMatch[3],
          message: winstonMatch[4] || '',
        };
      }

      // Try Apache/Nginx access log format
      const accessMatch = line.match(/(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) ([^"]+) HTTP\/\d\.\d" (\d+) (\d+)/);
      if (accessMatch) {
        return {
          timestamp: accessMatch[2],
          level: parseInt(accessMatch[6]) >= 400 ? 'error' : 'info',
          context: 'HTTP_ACCESS',
          message: `${accessMatch[3]} ${accessMatch[4]} - ${accessMatch[6]} ${accessMatch[7]}`,
          metadata: {
            ip: accessMatch[1],
            method: accessMatch[3],
            url: accessMatch[4],
            status: parseInt(accessMatch[6]),
            size: parseInt(accessMatch[7])
          }
        };
      }

      // Generic fallback
      return {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: line.substring(0, 200),
      };

    } catch (error) {
      console.warn('⚠️  Failed to parse log line:', line);
      return null;
    }
  }

  /**
   * Analyze logs and generate report
   */
  async analyze(): Promise<LogAnalysisResult> {
    console.log('📊 Analyzing logs...');

    if (this.logEntries.length === 0) {
      await this.parseLogs();
    }

    const result: LogAnalysisResult = {
      summary: this.generateSummary(),
      errors: this.getErrors(),
      warnings: this.getWarnings(),
      performance: await this.analyzePerformance(),
      patterns: this.findPatterns(),
      audit: this.analyzeAuditTrail(),
      anomalies: this.detectAnomalies()
    };

    console.log('✅ Log analysis completed');
    return result;
  }

  /**
   * Generate log summary
   */
  private generateSummary(): LogAnalysisResult['summary'] {
    const totalLogs = this.logEntries.length;
    const errorCount = this.logEntries.filter(entry => entry.level === 'error').length;
    const warnCount = this.logEntries.filter(entry => entry.level === 'warn').length;
    const infoCount = this.logEntries.filter(entry => entry.level === 'info').length;
    const debugCount = this.logEntries.filter(entry => entry.level === 'debug').length;

    const uniqueErrors = new Set(
      this.logEntries
        .filter(entry => entry.level === 'error')
        .map(entry => entry.message)
    ).size;

    const anomalies = this.detectAnomalies();

    return {
      totalLogs,
      errorCount,
      warnCount,
      infoCount,
      debugCount,
      uniqueErrors,
      anomaliesDetected: anomalies.length
    };
  }

  /**
   * Get error entries
   */
  private getErrors(): LogEntry[] {
    return this.logEntries.filter(entry => entry.level === 'error');
  }

  /**
   * Get warning entries
   */
  private getWarnings(): LogEntry[] {
    return this.logEntries.filter(entry => entry.level === 'warn');
  }

  /**
   * Analyze performance metrics
   */
  private async analyzePerformance(): Promise<LogAnalysisResult['performance']> {
    const httpLogs = this.logEntries.filter(entry =>
      entry.context === 'HTTP_ACCESS' || entry.message.includes('ms -')
    );

    const slowRequests = [];
    const responseTimes = [];

    for (const log of httpLogs) {
      // Extract response time from log message
      const timeMatch = log.message.match(/(\d+)\s*ms/);
      if (timeMatch) {
        const duration = parseInt(timeMatch[1]);
        responseTimes.push(duration);

        if (duration > 1000) { // Slow requests > 1s
          slowRequests.push({
            method: log.metadata?.method || 'UNKNOWN',
            url: log.metadata?.url || log.message,
            duration,
            timestamp: log.timestamp
          });
        }
      }
    }

    // Calculate percentiles
    responseTimes.sort((a, b) => a - b);
    const p95Index = Math.ceil(responseTimes.length * 0.95) - 1;
    const p95ResponseTime = responseTimes[p95Index] || 0;
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Calculate error rate
    const totalRequests = httpLogs.length;
    const errorRequests = httpLogs.filter(log => log.metadata?.status >= 400).length;
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

    return {
      slowRequests: slowRequests.sort((a, b) => b.duration - a.duration).slice(0, 10),
      averageResponseTime,
      p95ResponseTime,
      errorRate
    };
  }

  /**
   * Find common patterns in logs
   */
  private findPatterns(): LogAnalysisResult['patterns'] {
    const errorMessages = new Map<string, { count: number; firstSeen: string; lastSeen: string }>();
    const frequentMessages = new Map<string, { count: number; context?: string }>();

    for (const entry of this.logEntries) {
      // Track error patterns
      if (entry.level === 'error') {
        const key = entry.message.substring(0, 100);
        const existing = errorMessages.get(key);
        if (existing) {
          existing.count++;
          existing.lastSeen = entry.timestamp;
        } else {
          errorMessages.set(key, {
            count: 1,
            firstSeen: entry.timestamp,
            lastSeen: entry.timestamp
          });
        }
      }

      // Track frequent messages
      const messageKey = entry.message.substring(0, 50);
      const existing = frequentMessages.get(messageKey);
      if (existing) {
        existing.count++;
      } else {
        frequentMessages.set(messageKey, {
          count: 1,
          context: entry.context
        });
      }
    }

    // Convert to arrays and sort by frequency
    const errorPatterns = Array.from(errorMessages.entries())
      .map(([pattern, data]) => ({ pattern, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const frequentMsgs = Array.from(frequentMessages.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      errorPatterns,
      frequentMessages: frequentMsgs
    };
  }

  /**
   * Analyze audit trail
   */
  private analyzeAuditTrail(): LogAnalysisResult['audit'] {
    const adminActions: LogEntry[] = [];
    const userActions: LogEntry[] = [];
    const securityEvents: LogEntry[] = [];

    for (const entry of this.logEntries) {
      const message = entry.message.toLowerCase();
      const context = entry.context?.toLowerCase() || '';

      // Admin actions
      if (context.includes('admin') || message.includes('admin') ||
          ['ban', 'unban', 'promote', 'demote', 'delete user'].some(action => message.includes(action))) {
        adminActions.push(entry);
      }

      // User actions
      if (['login', 'logout', 'register', 'update profile', 'change password'].some(action => message.includes(action))) {
        userActions.push(entry);
      }

      // Security events
      if (['unauthorized', 'forbidden', 'invalid token', 'rate limit', 'suspicious', 'attack'].some(term => message.includes(term))) {
        securityEvents.push(entry);
      }

      // Authentication failures
      if (entry.level === 'error' && ['auth', 'login', 'token'].some(term => context.includes(term))) {
        securityEvents.push(entry);
      }
    }

    return {
      adminActions,
      userActions,
      securityEvents
    };
  }

  /**
   * Detect anomalies in logs
   */
  private detectAnomalies(): LogAnalysisResult['anomalies'] {
    const anomalies: LogAnalysisResult['anomalies'] = [];

    // Check for unusual error patterns
    const errorGroups = this.groupBy(this.logEntries.filter(e => e.level === 'error'), 'message');
    for (const [message, errors] of errorGroups) {
      if (errors.length > 10) { // More than 10 occurrences
        anomalies.push({
          type: 'High Error Frequency',
          message: message.substring(0, 100),
          timestamp: errors[0].timestamp,
          severity: errors.length > 50 ? 'high' : 'medium',
          description: `${errors.length} occurrences of the same error`
        });
      }
    }

    // Check for response time anomalies
    const slowRequests = this.logEntries.filter(entry => {
      const timeMatch = entry.message.match(/(\d+)\s*ms/);
      return timeMatch && parseInt(timeMatch[1]) > 5000; // > 5 seconds
    });

    if (slowRequests.length > 0) {
      anomalies.push({
        type: 'Slow Response Time',
        message: `Found ${slowRequests.length} requests taking > 5 seconds`,
        timestamp: slowRequests[0].timestamp,
        severity: 'medium',
        description: 'Multiple slow API responses detected'
      });
    }

    // Check for database connection issues
    const dbErrors = this.logEntries.filter(entry =>
      entry.level === 'error' &&
      ['connection refused', 'timeout', 'database', 'postgres', 'mongodb'].some(term =>
        entry.message.toLowerCase().includes(term)
      )
    );

    if (dbErrors.length > 0) {
      anomalies.push({
        type: 'Database Connection Issues',
        message: `Database errors: ${dbErrors.length} occurrences`,
        timestamp: dbErrors[0].timestamp,
        severity: 'high',
        description: 'Multiple database connection or query errors detected'
      });
    }

    // Check for authentication system issues
    const authErrors = this.logEntries.filter(entry =>
      entry.level === 'error' &&
      ['jwt', 'token', 'auth', 'steam', 'oauth'].some(term =>
        entry.message.toLowerCase().includes(term)
      )
    );

    if (authErrors.length > 5) {
      anomalies.push({
        type: 'Authentication System Issues',
        message: `Authentication errors: ${authErrors.length} occurrences`,
        timestamp: authErrors[0].timestamp,
        severity: 'high',
        description: 'Multiple authentication-related errors detected'
      });
    }

    return anomalies;
  }

  /**
   * Group array by key
   */
  private groupBy<T>(array: T[], key: keyof T): Map<any, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = item[key];
      const group = groups.get(groupKey) || [];
      group.push(item);
      groups.set(groupKey, group);
      return groups;
    }, new Map());
  }

  /**
   * Generate log analysis report
   */
  async generateReport(outputPath?: string): Promise<string> {
    console.log('📄 Generating log analysis report...');

    const analysis = await this.analyze();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const report = `
# E2E Test Log Analysis Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Logs:** ${analysis.summary.totalLogs}
- **Errors:** ${analysis.summary.errorCount}
- **Warnings:** ${analysis.summary.warnCount}
- **Info:** ${analysis.summary.infoCount}
- **Debug:** ${analysis.summary.debugCount}
- **Unique Errors:** ${analysis.summary.uniqueErrors}
- **Anomalies Detected:** ${analysis.summary.anomaliesDetected}

## Critical Issues

### Errors
${analysis.errors.slice(0, 10).map(error => `
- **[${error.timestamp}]** ${error.message}
  - Context: ${error.context || 'N/A'}
  - Stack: ${error.stack ? error.stack.substring(0, 200) + '...' : 'N/A'}
`).join('')}

### Warnings
${analysis.warnings.slice(0, 10).map(warning => `
- **[${warning.timestamp}]** ${warning.message}
  - Context: ${warning.context || 'N/A'}
`).join('')}

## Performance Analysis

- **Average Response Time:** ${analysis.performance.averageResponseTime.toFixed(2)}ms
- **P95 Response Time:** ${analysis.performance.p95ResponseTime}ms
- **Error Rate:** ${analysis.performance.errorRate.toFixed(2)}%

### Slow Requests (>1s)
${analysis.performance.slowRequests.map(req => `
- **${req.method} ${req.url}** - ${req.duration}ms (${req.timestamp})
`).join('')}

## Error Patterns

${analysis.patterns.errorPatterns.slice(0, 5).map(pattern => `
### ${pattern.pattern}
- **Occurrences:** ${pattern.count}
- **First Seen:** ${pattern.firstSeen}
- **Last Seen:** ${pattern.lastSeen}
`).join('')}

## Security & Audit Events

### Admin Actions: ${analysis.audit.adminActions.length}
${analysis.audit.adminActions.slice(0, 5).map(action => `
- **[${action.timestamp}]** ${action.message}
`).join('')}

### Security Events: ${analysis.audit.securityEvents.length}
${analysis.audit.securityEvents.slice(0, 5).map(event => `
- **[${event.timestamp}]** ${event.message}
`).join('')}

## Anomalies

${analysis.anomalies.map(anomaly => `
### ${anomaly.type} - ${anomaly.severity.toUpperCase()}
- **Message:** ${anomaly.message}
- **Timestamp:** ${anomaly.timestamp}
- **Description:** ${anomaly.description}
`).join('')}

## Recommendations

${this.generateRecommendations(analysis)}
`;

    const outputFile = outputPath || `tests/e2e/artifacts/logs/log-analysis-${timestamp}.md`;

    try {
      await fs.writeFile(outputFile, report);
      console.log(`✅ Log analysis report saved to: ${outputFile}`);
      return outputFile;
    } catch (error) {
      console.error('❌ Failed to write log analysis report:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(analysis: LogAnalysisResult): string {
    const recommendations: string[] = [];

    if (analysis.summary.errorCount > 50) {
      recommendations.push('- **High Error Rate**: Investigate and fix frequent error sources');
    }

    if (analysis.performance.errorRate > 5) {
      recommendations.push('- **High Error Rate**: Review API endpoints with high failure rates');
    }

    if (analysis.performance.p95ResponseTime > 2000) {
      recommendations.push('- **Slow Performance**: Optimize slow database queries and API endpoints');
    }

    if (analysis.anomalies.length > 5) {
      recommendations.push('- **Multiple Anomalies**: Review system health and infrastructure');
    }

    if (analysis.audit.securityEvents.length > 10) {
      recommendations.push('- **Security Concerns**: Review authentication and authorization mechanisms');
    }

    if (recommendations.length === 0) {
      recommendations.push('- **No Critical Issues**: System appears to be running normally');
    }

    return recommendations.join('\n');
  }

  /**
   * Assert log patterns for testing
   */
  assertLogPattern(pattern: string, minOccurrences: number = 1): boolean {
    const matchingLogs = this.logEntries.filter(entry =>
      entry.message.toLowerCase().includes(pattern.toLowerCase())
    );

    return matchingLogs.length >= minOccurrences;
  }

  /**
   * Assert no errors of specific type
   */
  assertNoErrors(errorPattern: string): boolean {
    const errorLogs = this.logEntries.filter(entry =>
      entry.level === 'error' &&
      entry.message.toLowerCase().includes(errorPattern.toLowerCase())
    );

    return errorLogs.length === 0;
  }

  /**
   * Get logs by time range
   */
  getLogsByTimeRange(startTime: Date, endTime: Date): LogEntry[] {
    return this.logEntries.filter(entry => {
      const logTime = new Date(entry.timestamp);
      return logTime >= startTime && logTime <= endTime;
    });
  }
}

// CLI usage
if (require.main === module) {
  const analyzer = new LogAnalyzer();

  analyzer.analyze()
    .then(result => {
      console.log('Analysis Result:', JSON.stringify(result.summary, null, 2));
      return analyzer.generateReport();
    })
    .then(reportPath => {
      console.log(`Report generated: ${reportPath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}