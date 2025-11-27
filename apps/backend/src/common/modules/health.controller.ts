import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { HealthService } from './health.service';
import { Public } from '../../modules/auth/decorators/public.decorator';

@Controller('api/health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HealthCheck()
  @Public()
  async health(): Promise<HealthCheckResult> {
    this.logger.debug('Health check requested');
    return this.healthService.checkHealth();
  }

  @Get('ready')
  @HealthCheck()
  @Public()
  async ready(): Promise<HealthCheckResult> {
    this.logger.debug('Readiness check requested');
    return this.healthService.checkReadiness();
  }

  @Get('live')
  @HealthCheck()
  @Public()
  async live(): Promise<HealthCheckResult> {
    this.logger.debug('Liveness check requested');
    return this.healthService.checkLiveness();
  }

  @Get('detailed')
  @Public()
  async detailed() {
    this.logger.debug('Detailed health check requested');
    return this.healthService.getDetailedHealth();
  }
}