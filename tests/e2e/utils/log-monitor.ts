/**
 * Log Monitor Utility for E2E Testing
 *
 * Monitors backend logs during E2E test execution to capture system behavior,
 * detect errors, and provide comprehensive logging analysis for test reports.
 * Supports both Winston JSON logs and plain text logs with advanced filtering
 * and analysis capabilities.
 */

import { promises as fs } from 'fs';
import { join } from 'path';

export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  message: string;
  context?: string;
  metadata?: any;
}

export interface LogAnalysis {
  summary: {
    totalLogs: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    debugCount: number;
    uniqueErrors: number;
    anomaliesDetected: number;
    criticalErrors: number;
  };
  errors: LogEntry[];
  warnings: LogEntry[];
  anomalies: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
    context?: string;
  }>;
  tradeRelatedLogs: LogEntry[];
  botActivityLogs: LogEntry[];
  performanceLogs: LogEntry[];
}

export class LogMonitor {
  private config: any;
  private isMonitoring: boolean = false;
  private monitoringStartTime: number = 0;
  private collectedLogs: LogEntry[] = [];
  private logEndpoint?: string;
  private logFile?: string;

  constructor(config: any) {
    this.config = config;
    this.logEndpoint = config.monitoring?.logEndpoint;
    this.logFile = config.monitoring?.logFile;
  }

  /**
   * Start monitoring logs
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('⚠️ Log monitoring already in progress');
      return;
    }

    this.isMonitoring = true;
    this.monitoringStartTime = Date.now();
    this.collectedLogs = [];

    console.log('📊 Starting log monitoring...');

    if (this.logEndpoint) {
      await this.startApiMonitoring();
    } else if (this.logFile) {
      await this.startFileMonitoring();
    } else {
      console.warn('⚠️ No log endpoint or file configured, monitoring disabled');
      this.isMonitoring = false;
    }
  }

  /**
   * Start monitoring via API endpoint
   */
  private async startApiMonitoring(): Promise<void> {
    try {
      // Make initial request to get logs since test start
      const response = await fetch(`${this.logEndpoint}?since=${this.monitoringStartTime}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.monitoring?.apiToken || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const logs = await response.json();
        this.collectedLogs = logs.map(this.parseLogEntry);
        console.log(`📄 Initial logs collected: ${this.collectedLogs.length}`);
      } else {
        console.warn('⚠️ Failed to fetch initial logs:', response.status);
      }

      // Start periodic polling
      this.startPolling();
    } catch (error) {
      console.error('❌ Failed to start API log monitoring:', error);
      this.isMonitoring = false;
    }
  }

  /**
   * Start monitoring log file
   */
  private async startFileMonitoring(): Promise<void> {
    try {
      if (await this.fileExists(this.logFile!)) {
        const logContent = await fs.readFile(this.logFile!, 'utf8');
        const logLines = logContent.split('\n').filter(line => line.trim());
        this.collectedLogs = logLines.map(line => this.parseLogFileLine(line));
        console.log(`📄 Initial logs from file: ${this.collectedLogs.length}`);
      }

      // Watch for file changes (simplified implementation)
      this.startFileWatching();
    } catch (error) {
      console.error('❌ Failed to start file log monitoring:', error);
      this.isMonitoring = false;
    }
  }

  /**
   * Start periodic polling for new logs
   */
  private startPolling(): void {
    const pollInterval = this.config.monitoring?.pollInterval || 5000; // 5 seconds

    const poller = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(poller);
        return;
      }

      try {
        const response = await fetch(`${this.logEndpoint}?since=${this.monitoringStartTime}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.monitoring?.apiToken || ''}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const newLogs = await response.json();
          const parsedLogs = newLogs.map(this.parseLogEntry);
          const newEntries = parsedLogs.filter(log =>
            !this.collectedLogs.some(existing => existing.timestamp === log.timestamp && existing.message === log.message)
          );

          if (newEntries.length > 0) {
            this.collectedLogs.push(...newEntries);
            console.log(`📄 New log entries: ${newEntries.length}, Total: ${this.collectedLogs.length}`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Log polling failed:', error.message);
      }
    }, pollInterval);
  }

  /**
   * Start file watching (simplified implementation)
   */
  private startFileWatching(): void {
    // In a real implementation, you would use fs.watch or chokidar
    // This is a simplified polling approach
    const pollInterval = this.config.monitoring?.pollInterval || 5000;

    const poller = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(poller);
        return;
      }

      try {
        const logContent = await fs.readFile(this.logFile!, 'utf8');
        const logLines = logContent.split('\n').filter(line => line.trim());
        const newLogs = logLines
          .map(line => this.parseLogFileLine(line))
          .filter(log => !this.collectedLogs.some(existing =>
            existing.timestamp === log.timestamp && existing.message === log.message
          ));

        if (newLogs.length > 0) {
          this.collectedLogs.push(...newLogs);
          console.log(`📄 New log entries: ${newLogs.length}, Total: ${this.collectedLogs.length}`);
        }
      } catch (error) {
        console.warn('⚠️ File watching failed:', error.message);
      }
    }, pollInterval);
  }

  /**
   * Stop monitoring and return collected logs
   */
  async stopMonitoring(): Promise<LogEntry[]> {
    if (!this.isMonitoring) {
      console.warn('⚠️ Log monitoring not active');
      return this.collectedLogs;
    }

    this.isMonitoring = false;
    console.log(`📊 Log monitoring stopped. Collected ${this.collectedLogs.length} log entries`);

    return this.collectedLogs;
  }

  /**
   * Get logs since specific timestamp
   */
  getLogsSince(timestamp: number): LogEntry[] {
    return this.collectedLogs.filter(log => new Date(log.timestamp).getTime() >= timestamp);
  }

  /**
   * Filter logs by level and pattern
   */
  filterLogs(level?: string, pattern?: RegExp): LogEntry[] {
    let filtered = this.collectedLogs;

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (pattern) {
      filtered = filtered.filter(log =>
        pattern.test(log.message) || pattern.test(log.context || '')
      );
    }

    return filtered;
  }

  /**
   * Assert no errors occurred during monitoring
   */
  assertNoErrors(): { success: boolean; errors: LogEntry[] } {
    const errors = this.filterLogs('error');
    const hasErrors = errors.length > 0;

    if (hasErrors) {
      console.error(`❌ Found ${errors.length} error(s) during monitoring:`);
      errors.forEach(error => {
        console.error(`  - ${error.timestamp}: ${error.message}`);
      });
    } else {
      console.log('✅ No errors detected during monitoring');
    }

    return { success: !hasErrors, errors };
  }

  /**
   * Assert specific log pattern exists
   */
  assertLogContains(pattern: RegExp): { success: boolean; matches: LogEntry[] } {
    const matches = this.filterLogs(undefined, pattern);
    const found = matches.length > 0;

    if (found) {
      console.log(`✅ Found ${matches.length} log entry(ies) matching pattern`);
    } else {
      console.error(`❌ No log entries found matching pattern: ${pattern}`);
    }

    return { success: found, matches };
  }

  /**
   * Get all logs related to a specific trade
   */
  getTradeRelatedLogs(tradeId: string): LogEntry[] {
    const tradePattern = new RegExp(tradeId, 'i');
    return this.filterLogs(undefined, tradePattern);
  }

  /**
   * Get all bot activity logs
   */
  getBotActivityLogs(botId?: string): LogEntry[] {
    const botPattern = botId
      ? new RegExp(`(bot|${botId})`, 'i')
      : /bot/i;

    return this.filterLogs(undefined, botPattern);
  }

  /**
   * Analyze collected logs for test reporting
   */
  async analyzeLogs(): Promise<LogAnalysis> {
    const analysis: LogAnalysis = {
      summary: {
        totalLogs: this.collectedLogs.length,
        errorCount: 0,
        warnCount: 0,
        infoCount: 0,
        debugCount: 0,
        uniqueErrors: 0,
        anomaliesDetected: 0,
        criticalErrors: 0
      },
      errors: [],
      warnings: [],
      anomalies: [],
      tradeRelatedLogs: [],
      botActivityLogs: [],
      performanceLogs: []
    };

    // Categorize logs by level
    for (const log of this.collectedLogs) {
      switch (log.level) {
        case 'error':
          analysis.errors.push(log);
          analysis.summary.errorCount++;
          if (this.isCriticalError(log)) {
            analysis.summary.criticalErrors++;
          }
          break;
        case 'warn':
          analysis.warnings.push(log);
          analysis.summary.warnCount++;
          break;
        case 'info':
          analysis.summary.infoCount++;
          break;
        case 'debug':
          analysis.summary.debugCount++;
          break;
      }
    }

    // Find unique errors
    const uniqueErrorMessages = new Set(
      analysis.errors.map(error => error.message).filter(msg => msg.trim())
    );
    analysis.summary.uniqueErrors = uniqueErrorMessages.size;

    // Detect anomalies
    analysis.anomalies = this.detectAnomalies(this.collectedLogs);
    analysis.summary.anomaliesDetected = analysis.anomalies.length;

    // Categorize special logs
    analysis.tradeRelatedLogs = this.filterLogs(undefined, /trade|offer/i);
    analysis.botActivityLogs = this.getBotActivityLogs();
    analysis.performanceLogs = this.filterLogs(undefined, /performance|timeout|slow/i);

    return analysis;
  }

  /**
   * Detect system anomalies in logs
   */
  private detectAnomalies(logs: LogEntry[]): Array<{ type: string; message: string; severity: string; timestamp: string; context?: string }> {
    const anomalies: Array<{ type: string; message: string; severity: string; timestamp: string; context?: string }> = [];
    const errorLogs = logs.filter(log => log.level === 'error');

    // Detect error rate anomalies
    const errorRate = logs.length > 0 ? (errorLogs.length / logs.length) * 100 : 0;
    if (errorRate > 10) {
      anomalies.push({
        type: 'High Error Rate',
        message: `${errorRate.toFixed(1)}% of logs are errors`,
        severity: 'high',
        timestamp: new Date().toISOString(),
        context: `Total logs: ${logs.length}, Errors: ${errorLogs.length}`
      });
    }

    // Detect repeated errors
    const errorCounts = new Map<string, number>();
    errorLogs.forEach(log => {
      const key = log.message.substring(0, 100); // First 100 chars as key
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });

    errorCounts.forEach((count, message) => {
      if (count > 5) {
        anomalies.push({
          type: 'Repeated Error',
          message: `Error occurred ${count} times: ${message}`,
          severity: count > 10 ? 'critical' : 'medium',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Detect timeout anomalies
    const timeoutLogs = logs.filter(log =>
      /timeout|timed out|request timeout/i.test(log.message)
    );
    if (timeoutLogs.length > 3) {
      anomalies.push({
        type: 'Multiple Timeouts',
        message: `${timeoutLogs.length} timeout errors detected`,
        severity: 'medium',
        timestamp: new Date().toISOString()
      });
    }

    return anomalies;
  }

  /**
   * Check if log represents a critical error
   */
  private isCriticalError(log: LogEntry): boolean {
    const criticalPatterns = [
      /database.*connection.*failed/i,
      /authentication.*failed/i,
      /unauthorized/i,
      /forbidden/i,
      /server.*error/i,
      /out.*of.*memory/i,
      /disk.*space.*full/i
    ];

    return criticalPatterns.some(pattern => pattern.test(log.message));
  }

  /**
   * Parse Winston JSON log entry
   */
  private parseLogEntry(logData: any): LogEntry {
    return {
      timestamp: logData.timestamp || new Date().toISOString(),
      level: logData.level || 'info',
      message: logData.message || '',
      context: logData.context || logData.label || undefined,
      metadata: logData.metadata || logData.meta || undefined
    };
  }

  /**
   * Parse log file line (supports various formats)
   */
  private parseLogFileLine(line: string): LogEntry {
    // Try Winston JSON format first
    try {
      if (line.startsWith('{') && line.endsWith('}')) {
        const jsonData = JSON.parse(line);
        return this.parseLogEntry(jsonData);
      }
    } catch {
      // Continue to other formats
    }

    // Try Apache/common log format
    const apacheMatch = line.match(/(\S+) \S+ \S+ \[([^\]]+)\] "([^"]*)" (\d+) (\S+)/);
    if (apacheMatch) {
      return {
        timestamp: new Date(apacheMatch[2]).toISOString(),
        level: this.getLevelFromStatusCode(parseInt(apacheMatch[4])),
        message: `${apacheMatch[3]} - ${apacheMatch[4]} ${apacheMatch[5]}`,
        context: 'HTTP Request'
      };
    }

    // Try simple timestamp format
    const simpleMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z?)\s*-\s*(\w+)\s*-\s*(.+)/);
    if (simpleMatch) {
      return {
        timestamp: simpleMatch[1],
        level: simpleMatch[2].toLowerCase() as any,
        message: simpleMatch[3]
      };
    }

    // Default fallback
    return {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: line.substring(0, 200) // Truncate very long lines
    };
  }

  /**
   * Get log level from HTTP status code
   */
  private getLevelFromStatusCode(statusCode: number): string {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    if (statusCode >= 300) return 'info';
    return 'info';
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Export logs to file
   */
  async exportLogs(outputPath: string): Promise<void> {
    const analysis = await this.analyzeLogs();
    const exportData = {
      metadata: {
        exportTime: new Date().toISOString(),
        monitoringDuration: this.isMonitoring ? Date.now() - this.monitoringStartTime : 0,
        totalEntries: this.collectedLogs.length
      },
      logs: this.collectedLogs,
      analysis
    };

    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
    console.log(`📄 Logs exported to: ${outputPath}`);
  }
}

// Export for use in tests
export default LogMonitor;