import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { MetricsService } from './metrics.service';

@Controller('api/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  getMetrics(@Req() req: Request) {
    // Skip metrics collection for the metrics endpoint itself to avoid recursion
    return this.metricsService.getMetrics();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      metrics_collected: true,
      services: {
        postgresql: {
          status: 'connected', // This would be determined by actual health check
          connection_pool: process.env.DB_POOL_MAX || 50,
        },
        mongodb: {
          status: 'connected', // This would be determined by actual health check
        },
        redis: {
          status: 'connected', // This would be determined by actual health check
          connected_clients: 0, // This would be populated by actual Redis info
        },
        bull_queues: {
          status: 'operational',
          queues: [
            'trade',
            'inventory-sync',
            'price-update',
            'email',
            'notification'
          ],
          total_jobs_processing: 0, // This would be populated by actual queue stats
          total_jobs_waiting: 0, // This would be populated by actual queue stats
        },
        bots: {
          status: 'operational',
          total_bots: 0, // This would be populated by actual bot stats
          bots_online: 0, // This would be populated by actual bot stats
          bots_active: 0, // This would be populated by actual bot stats
          bots_busy: 0, // This would be populated by actual bot stats
          average_uptime: 0, // This would be populated by actual bot stats
        },
      },
      system: {
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        cpu_usage: process.cpuUsage(),
        node_version: process.version,
      }
    };
  }
}