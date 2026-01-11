/**
 * Performance Monitoring Utility for E2E Tests
 *
 * Monitors and measures performance metrics during E2E test execution including
 * page load times, API response times, WebSocket latency, memory usage, and
 * other performance indicators. Provides detailed performance analysis and
 * threshold validation for comprehensive performance testing.
 */

import { Page, BrowserContext } from '@playwright/test';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  context?: string;
  metadata?: any;
}

export interface PerformanceThreshold {
  metric: string;
  operator: 'lt' | 'gt' | 'lte' | 'gte' | 'eq';
  value: number;
  unit: string;
  severity: 'info' | 'warning' | 'error';
}

export interface PerformanceReport {
  summary: {
    totalMetrics: number;
    passedThresholds: number;
    failedThresholds: number;
    averagePageLoadTime: number;
    averageApiResponseTime: number;
    memoryUsage: number;
    networkRequestsCount: number;
  };
  metrics: PerformanceMetric[];
  thresholds: PerformanceThreshold[];
  violations: Array<{
    threshold: PerformanceThreshold;
    actualValue: number;
    message: string;
    timestamp: string;
  }>;
  bottlenecks: Array<{
    name: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggestions: string[];
  }>;
  timeline: Array<{
    timestamp: string;
    event: string;
    duration?: number;
    metadata?: any;
  }>;
}

export interface PageLoadMetrics {
  navigationStart: number;
  loadEventStart: number;
  loadEventEnd: number;
  domContentLoadedEventStart: number;
  domContentLoadedEventEnd: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift: number;
  firstInputDelay?: number;
}

export interface ApiPerformanceMetrics {
  url: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: number;
  requestSize: number;
  responseSize: number;
  cacheHit: boolean;
}

export class PerformanceMonitor {
  private config: any;
  private context: BrowserContext;
  private isMonitoring: boolean = false;
  private startTime: number = 0;
  private collectedMetrics: PerformanceMetric[] = [];
  private apiMetrics: ApiPerformanceMetrics[] = [];
  private pageMetrics: Map<string, PageLoadMetrics> = new Map();
  private resourceMetrics: any[] = [];
  private memorySnapshots: Array<{ timestamp: number; usedJSHeapSize: number; totalJSHeapSize: number }> = [];

  constructor(config: any, context?: BrowserContext) {
    this.config = config;
    this.context = context!;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(page: Page): void {
    if (this.isMonitoring) {
      console.warn('⚠️ Performance monitoring already in progress');
      return;
    }

    this.isMonitoring = true;
    this.startTime = Date.now();
    this.collectedMetrics = [];
    this.apiMetrics = [];
    this.pageMetrics.clear();
    this.resourceMetrics = [];
    this.memorySnapshots = [];

    console.log('⚡ Starting performance monitoring...');

    // Set up performance monitoring
    this.setupPerformanceMonitoring(page);
    this.setupNetworkMonitoring(page);
    this.setupMemoryMonitoring(page);
    this.setupResourceMonitoring(page);
  }

  /**
   * Stop performance monitoring and return collected metrics
   */
  stopMonitoring(): PerformanceReport {
    if (!this.isMonitoring) {
      console.warn('⚠️ Performance monitoring not active');
      return this.generateReport();
    }

    this.isMonitoring = false;
    console.log(`⚡ Performance monitoring stopped. Collected ${this.collectedMetrics.length} metrics`);

    return this.generateReport();
  }

  /**
   * Measure page load time
   */
  async measurePageLoad(page: Page, url: string): Promise<number> {
    const startTime = Date.now();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Get navigation timing
      const navigationTiming = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          navigationStart: perf.navigationStart,
          loadEventStart: perf.loadEventStart,
          loadEventEnd: perf.loadEventEnd,
          domContentLoadedEventStart: perf.domContentLoadedEventStart,
          domContentLoadedEventEnd: perf.domContentLoadedEventEnd,
          type: perf.type,
          redirectCount: perf.redirectCount
        };
      });

      // Get paint timing
      const paintTiming = await page.evaluate(() => {
        const paintMetrics = performance.getEntriesByType('paint');
        const fcp = paintMetrics.find(entry => entry.name === 'first-contentful-paint');
        const fp = paintMetrics.find(entry => entry.name === 'first-paint');

        return {
          firstPaint: fp?.startTime,
          firstContentfulPaint: fcp?.startTime
        };
      });

      // Get LCP, CLS, FID from Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          // Use Performance Observer for Web Vitals
          const vitals: any = {};

          // LCP
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.largestContentfulPaint = lastEntry.startTime;
            lcpObserver.disconnect();
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // FID
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              vitals.firstInputDelay = entry.processingStart - entry.startTime;
            });
            fidObserver.disconnect();
          });
          fidObserver.observe({ entryTypes: ['first-input'] });

          // CLS
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });

          // Resolve after short delay to collect vitals
          setTimeout(() => {
            resolve({
              largestContentfulPaint: vitals.largestContentfulPaint,
              firstInputDelay: vitals.firstInputDelay,
              cumulativeLayoutShift: clsValue
            });
          }, 2000);
        });
      });

      const loadTime = Date.now() - startTime;

      // Store page metrics
      this.pageMetrics.set(url, {
        ...navigationTiming,
        ...paintTiming,
        ...webVitals
      });

      // Record metrics
      this.addMetric('page_load_time', loadTime, 'ms', `Page load: ${url}`);
      this.addMetric('dom_content_loaded', navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart, 'ms', `DOM loaded: ${url}`);
      this.addMetric('window_load_time', navigationTiming.loadEventEnd - navigationTiming.loadEventStart, 'ms', `Window loaded: ${url}`);

      if (paintTiming.firstContentfulPaint) {
        this.addMetric('first_contentful_paint', paintTiming.firstContentfulPaint, 'ms', `FCP: ${url}`);
      }

      if (webVitals.largestContentfulPaint) {
        this.addMetric('largest_contentful_paint', webVitals.largestContentfulPaint, 'ms', `LCP: ${url}`);
      }

      if (webVitals.cumulativeLayoutShift) {
        this.addMetric('cumulative_layout_shift', webVitals.cumulativeLayoutShift, 'score', `CLS: ${url}`);
      }

      if (webVitals.firstInputDelay) {
        this.addMetric('first_input_delay', webVitals.firstInputDelay, 'ms', `FID: ${url}`);
      }

      console.log(`📊 Page load metrics for ${url}: ${loadTime}ms`);

      return loadTime;
    } catch (error) {
      console.error(`❌ Failed to measure page load for ${url}:`, error);
      return -1;
    }
  }

  /**
   * Measure API call performance
   */
  async measureApiCall(page: Page, endpoint: string, method: string = 'GET', data?: any): Promise<ApiPerformanceMetrics> {
    const startTime = Date.now();

    try {
      const response = await page.request.fetch(endpoint, {
        method,
        data: data ? JSON.stringify(data) : undefined,
        headers: data ? { 'Content-Type': 'application/json' } : undefined,
        timeout: 30000
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      const responseSize = parseInt(response.headers()['content-length'] || '0');
      const requestSize = data ? JSON.stringify(data).length : 0;

      const apiMetric: ApiPerformanceMetrics = {
        url: endpoint,
        method,
        startTime,
        endTime,
        duration,
        status: response.status(),
        requestSize,
        responseSize,
        cacheHit: response.headers()['x-cache'] === 'HIT'
      };

      this.apiMetrics.push(apiMetric);

      // Record metrics
      this.addMetric('api_response_time', duration, 'ms', `${method} ${endpoint}`);
      this.addMetric('api_request_size', requestSize, 'bytes', `${method} ${endpoint}`);
      this.addMetric('api_response_size', responseSize, 'bytes', `${method} ${endpoint}`);

      if (response.status() >= 400) {
        this.addMetric('api_error', 1, 'count', `Error ${response.status()} ${method} ${endpoint}`);
      }

      console.log(`📊 API metrics for ${method} ${endpoint}: ${duration}ms, ${response.status()}`);

      return apiMetric;
    } catch (error) {
      const duration = Date.now() - startTime;

      const failedMetric: ApiPerformanceMetrics = {
        url: endpoint,
        method,
        startTime,
        endTime: Date.now(),
        duration,
        status: 0,
        requestSize: data ? JSON.stringify(data).length : 0,
        responseSize: 0,
        cacheHit: false
      };

      this.apiMetrics.push(failedMetric);
      this.addMetric('api_error', 1, 'count', `Failed ${method} ${endpoint}: ${error.message}`);

      console.error(`❌ API call failed for ${method} ${endpoint}:`, error);
      return failedMetric;
    }
  }

  /**
   * Measure trade completion time
   */
  measureTradeCompletion(startTime: number, endTime: number): void {
    const duration = endTime - startTime;
    this.addMetric('trade_completion_time', duration, 'ms', 'Trade lifecycle duration');
    console.log(`📊 Trade completion time: ${duration}ms`);
  }

  /**
   * Measure inventory sync duration
   */
  measureInventorySync(startTime: number, endTime: number): void {
    const duration = endTime - startTime;
    this.addMetric('inventory_sync_time', duration, 'ms', 'Inventory synchronization duration');
    console.log(`📊 Inventory sync time: ${duration}ms`);
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.collectedMetrics];
  }

  /**
   * Assert performance metric meets threshold
   */
  assertPerformance(metric: string, threshold: number, operator: 'lt' | 'gt' | 'lte' | 'gte' = 'lt'): { success: boolean; actual: number; message: string } {
    const metricValue = this.collectedMetrics
      .filter(m => m.name === metric)
      .reduce((max, current) => Math.max(max, current.value), 0);

    let success = false;
    let message = '';

    switch (operator) {
      case 'lt':
        success = metricValue < threshold;
        message = `${metric}: ${metricValue} should be < ${threshold}`;
        break;
      case 'gt':
        success = metricValue > threshold;
        message = `${metric}: ${metricValue} should be > ${threshold}`;
        break;
      case 'lte':
        success = metricValue <= threshold;
        message = `${metric}: ${metricValue} should be <= ${threshold}`;
        break;
      case 'gte':
        success = metricValue >= threshold;
        message = `${metric}: ${metricValue} should be >= ${threshold}`;
        break;
    }

    console.log(success ? `✅ ${message}` : `❌ ${message}`);
    return { success, actual: metricValue, message };
  }

  /**
   * Add a custom performance metric
   */
  addMetric(name: string, value: number, unit: string, context?: string, metadata?: any): void {
    this.collectedMetrics.push({
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      context,
      metadata
    });
  }

  /**
   * Setup performance monitoring on page
   */
  private setupPerformanceMonitoring(page: Page): void {
    // Inject performance monitoring script
    page.addInitScript(() => {
      (window as any).performanceMetrics = {
        navigation: [],
        resources: [],
        customMetrics: []
      };

      // Monitor navigation timing
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0];
        (window as any).performanceMetrics.navigation.push({
          timestamp: Date.now(),
          ...navigation
        });
      });

      // Monitor resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          (window as any).performanceMetrics.resources.push({
            timestamp: Date.now(),
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize,
            type: entry.initiatorType,
            cached: entry.transferSize === 0 && entry.decodedBodySize > 0
          });
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

      // Monitor memory usage
      if ((performance as any).memory) {
        setInterval(() => {
          (window as any).performanceMetrics.customMetrics.push({
            timestamp: Date.now(),
            type: 'memory',
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit
          });
        }, 5000);
      }
    });
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(page: Page): void {
    // Track network requests
    page.on('request', request => {
      this.addMetric('network_request_started', 1, 'count', request.url());
    });

    page.on('response', response => {
      this.addMetric('network_response_received', 1, 'count', response.url());
      this.addMetric('response_status', response.status(), 'code', response.url());
    });

    page.on('requestfailed', request => {
      this.addMetric('network_request_failed', 1, 'count', request.url());
      console.warn(`⚠️ Network request failed: ${request.url()}`);
    });
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(page: Page): void {
    // Monitor memory usage periodically
    const monitorMemory = async () => {
      if (!this.isMonitoring) return;

      try {
        const memoryInfo = await page.evaluate(() => {
          return (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          } : null;
        });

        if (memoryInfo) {
          this.memorySnapshots.push({
            timestamp: Date.now(),
            ...memoryInfo
          });

          this.addMetric('memory_used_heap', memoryInfo.usedJSHeapSize, 'bytes');
          this.addMetric('memory_total_heap', memoryInfo.totalJSHeapSize, 'bytes');

          // Check for memory leaks
          if (this.memorySnapshots.length > 1) {
            const recentAverage = this.memorySnapshots
              .slice(-5)
              .reduce((sum, snap) => sum + snap.usedJSHeapSize, 0) / 5;
            const olderAverage = this.memorySnapshots
              .slice(-10, -5)
              .reduce((sum, snap) => sum + snap.usedJSHeapSize, 0) / 5;

            if (recentAverage > olderAverage * 1.5) {
              this.addMetric('memory_leak_suspected', 1, 'count', 'Potential memory leak detected');
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Memory monitoring failed:', error.message);
      }
    };

    // Start memory monitoring
    setInterval(monitorMemory, 10000); // Every 10 seconds
  }

  /**
   * Setup resource monitoring
   */
  private setupResourceMonitoring(page: Page): void {
    page.on('response', async response => {
      try {
        const resourceTiming = await page.evaluate((url: string) => {
          const entries = performance.getEntriesByName(url);
          return entries.length > 0 ? entries[0] : null;
        }, response.url());

        if (resourceTiming) {
          this.resourceMetrics.push({
            timestamp: Date.now(),
            url: response.url(),
            duration: resourceTiming.duration,
            transferSize: (resourceTiming as any).transferSize,
            encodedBodySize: (resourceTiming as any).encodedBodySize,
            decodedBodySize: (resourceTiming as any).decodedBodySize,
            initiatorType: (resourceTiming as any).initiatorType
          });
        }
      } catch (error) {
        console.warn('⚠️ Resource timing collection failed:', error.message);
      }
    });
  }

  /**
   * Generate performance report
   */
  private generateReport(): PerformanceReport {
    // Calculate summary statistics
    const pageLoadTimes = this.collectedMetrics
      .filter(m => m.name === 'page_load_time')
      .map(m => m.value);
    const apiResponseTimes = this.collectedMetrics
      .filter(m => m.name === 'api_response_time')
      .map(m => m.value);

    const averagePageLoadTime = pageLoadTimes.length > 0
      ? pageLoadTimes.reduce((sum, time) => sum + time, 0) / pageLoadTimes.length
      : 0;

    const averageApiResponseTime = apiResponseTimes.length > 0
      ? apiResponseTimes.reduce((sum, time) => sum + time, 0) / apiResponseTimes.length
      : 0;

    const memoryUsage = this.memorySnapshots.length > 0
      ? this.memorySnapshots[this.memorySnapshots.length - 1].usedJSHeapSize
      : 0;

    const networkRequestsCount = this.collectedMetrics
      .filter(m => m.name === 'network_request_started')
      .length;

    // Define performance thresholds
    const thresholds: PerformanceThreshold[] = [
      { metric: 'page_load_time', operator: 'lt', value: 3000, unit: 'ms', severity: 'error' },
      { metric: 'api_response_time', operator: 'lt', value: 1000, unit: 'ms', severity: 'error' },
      { metric: 'first_contentful_paint', operator: 'lt', value: 1800, unit: 'ms', severity: 'warning' },
      { metric: 'largest_contentful_paint', operator: 'lt', value: 2500, unit: 'ms', severity: 'warning' },
      { metric: 'cumulative_layout_shift', operator: 'lt', value: 0.1, unit: 'score', severity: 'warning' },
      { metric: 'first_input_delay', operator: 'lt', value: 100, unit: 'ms', severity: 'warning' }
    ];

    // Check threshold violations
    const violations: Array<{
      threshold: PerformanceThreshold;
      actualValue: number;
      message: string;
      timestamp: string;
    }> = [];

    for (const threshold of thresholds) {
      const metricValue = this.collectedMetrics
        .filter(m => m.name === threshold.metric)
        .reduce((max, current) => Math.max(max, current.value), 0);

      let violated = false;
      switch (threshold.operator) {
        case 'lt':
          violated = metricValue >= threshold.value;
          break;
        case 'gt':
          violated = metricValue <= threshold.value;
          break;
        case 'lte':
          violated = metricValue > threshold.value;
          break;
        case 'gte':
          violated = metricValue < threshold.value;
          break;
        case 'eq':
          violated = metricValue !== threshold.value;
          break;
      }

      if (violated) {
        violations.push({
          threshold,
          actualValue: metricValue,
          message: `Threshold violated: ${threshold.metric} = ${metricValue}${threshold.unit}, expected ${threshold.operator} ${threshold.value}${threshold.unit}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Identify performance bottlenecks
    const bottlenecks = this.identifyBottlenecks();

    // Generate timeline
    const timeline = this.generateTimeline();

    const report: PerformanceReport = {
      summary: {
        totalMetrics: this.collectedMetrics.length,
        passedThresholds: thresholds.length - violations.length,
        failedThresholds: violations.length,
        averagePageLoadTime,
        averageApiResponseTime,
        memoryUsage,
        networkRequestsCount
      },
      metrics: this.collectedMetrics,
      thresholds,
      violations,
      bottlenecks,
      timeline
    };

    return report;
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(): Array<{
    name: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggestions: string[];
  }> {
    const bottlenecks: Array<{
      name: string;
      impact: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      suggestions: string[];
    }> = [];

    // Check for slow page loads
    const slowPages = this.collectedMetrics
      .filter(m => m.name === 'page_load_time' && m.value > 5000);
    if (slowPages.length > 0) {
      bottlenecks.push({
        name: 'Slow Page Loads',
        impact: 'high',
        description: `${slowPages.length} pages took longer than 5 seconds to load`,
        suggestions: [
          'Optimize images and assets',
          'Implement code splitting',
          'Enable gzip compression',
          'Use CDN for static assets'
        ]
      });
    }

    // Check for slow API responses
    const slowApis = this.collectedMetrics
      .filter(m => m.name === 'api_response_time' && m.value > 2000);
    if (slowApis.length > 0) {
      bottlenecks.push({
        name: 'Slow API Responses',
        impact: 'high',
        description: `${slowApis.length} API calls took longer than 2 seconds`,
        suggestions: [
          'Optimize database queries',
          'Add API response caching',
          'Implement pagination',
          'Use async processing for heavy operations'
        ]
      });
    }

    // Check for memory issues
    if (this.memorySnapshots.length > 0) {
      const maxMemory = Math.max(...this.memorySnapshots.map(s => s.usedJSHeapSize));
      const minMemory = Math.min(...this.memorySnapshots.map(s => s.usedJSHeapSize));
      if (maxMemory > minMemory * 2) {
        bottlenecks.push({
          name: 'Memory Usage Growth',
          impact: 'medium',
          description: 'Memory usage increased significantly during test execution',
          suggestions: [
            'Check for memory leaks',
            'Optimize event listeners',
            'Clear timers and intervals',
            'Review large object allocations'
          ]
        });
      }
    }

    // Check for too many network requests
    const networkRequests = this.collectedMetrics
      .filter(m => m.name === 'network_request_started').length;
    if (networkRequests > 100) {
      bottlenecks.push({
        name: 'Excessive Network Requests',
        impact: 'medium',
        description: `${networkRequests} network requests may impact performance`,
        suggestions: [
          'Bundle and minify assets',
          'Use HTTP/2 for multiplexing',
          'Implement lazy loading',
          'Cache frequently accessed resources'
        ]
      });
    }

    return bottlenecks;
  }

  /**
   * Generate performance timeline
   */
  private generateTimeline(): Array<{
    timestamp: string;
    event: string;
    duration?: number;
    metadata?: any;
  }> {
    const timeline: Array<{
      timestamp: string;
      event: string;
      duration?: number;
      metadata?: any;
    }> = [];

    // Add page load events
    for (const [url, metrics] of this.pageMetrics) {
      timeline.push({
        timestamp: new Date(metrics.navigationStart).toISOString(),
        event: `Page navigation: ${url}`,
        duration: metrics.loadEventEnd - metrics.navigationStart,
        metadata: { type: 'navigation' }
      });
    }

    // Add API call events
    for (const apiMetric of this.apiMetrics) {
      timeline.push({
        timestamp: new Date(apiMetric.startTime).toISOString(),
        event: `${apiMetric.method} ${apiMetric.url}`,
        duration: apiMetric.duration,
        metadata: {
          type: 'api',
          status: apiMetric.status,
          cacheHit: apiMetric.cacheHit
        }
      });
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return timeline;
  }
}

// Export for use in tests
export default PerformanceMonitor;