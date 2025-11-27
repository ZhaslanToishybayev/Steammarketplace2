import { Controller, Get, Query, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../trading/guards/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { PlatformStatistics, UserGrowthMetrics, TradeMetrics, BotHealthMetrics, SystemHealth } from '../services/admin-dashboard.service';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin Dashboard')
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(
    private adminDashboardService: AdminDashboardService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Get('statistics')
  @ApiOperation({
    summary: 'Get platform statistics',
    description: 'Retrieve comprehensive platform statistics including users, trades, revenue, and bots. Admin only endpoint.',
  })
  @ApiQuery({ name: 'dateFrom', required: false, type: Date, description: 'Start date for statistics' })
  @ApiQuery({ name: 'dateTo', required: false, type: Date, description: 'End date for statistics' })
  @ApiResponse({ status: 200, description: 'Platform statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getPlatformStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<{
    success: boolean;
    data: PlatformStatistics;
    message: string;
  }> {
    const parsedDateFrom = dateFrom ? new Date(dateFrom) : undefined;
    const parsedDateTo = dateTo ? new Date(dateTo) : undefined;

    const statistics = await this.adminDashboardService.getPlatformStatistics(
      parsedDateFrom,
      parsedDateTo,
    );

    return {
      success: true,
      data: statistics,
      message: 'Platform statistics retrieved successfully',
    };
  }

  @Get('metrics/users')
  @ApiOperation({
    summary: 'Get user growth metrics',
    description: 'Retrieve user growth metrics over time (day/week/month). Admin only endpoint.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['day', 'week', 'month'],
    default: 'week',
    description: 'Time period for metrics',
  })
  @ApiResponse({ status: 200, description: 'User growth metrics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getUserGrowthMetrics(
    @Query('period') period: 'day' | 'week' | 'month' = 'week',
  ): Promise<{
    success: boolean;
    data: UserGrowthMetrics;
    message: string;
  }> {
    const metrics = await this.adminDashboardService.getUserGrowthMetrics(period);

    return {
      success: true,
      data: metrics,
      message: 'User growth metrics retrieved successfully',
    };
  }

  @Get('metrics/trades')
  @ApiOperation({
    summary: 'Get trade metrics',
    description: 'Retrieve trade metrics over time including volume, revenue, and success rates. Admin only endpoint.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['day', 'week', 'month'],
    default: 'week',
    description: 'Time period for metrics',
  })
  @ApiResponse({ status: 200, description: 'Trade metrics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getTradeMetrics(
    @Query('period') period: 'day' | 'week' | 'month' = 'week',
  ): Promise<{
    success: boolean;
    data: TradeMetrics;
    message: string;
  }> {
    const metrics = await this.adminDashboardService.getTradeMetrics(period);

    return {
      success: true,
      data: metrics,
      message: 'Trade metrics retrieved successfully',
    };
  }

  @Get('metrics/bots')
  @ApiOperation({
    summary: 'Get bot health metrics',
    description: 'Retrieve comprehensive bot health metrics including uptime, success rates, and current load. Admin only endpoint.',
  })
  @ApiResponse({ status: 200, description: 'Bot health metrics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getBotHealthMetrics(): Promise<{
    success: boolean;
    data: BotHealthMetrics;
    message: string;
  }> {
    const metrics = await this.adminDashboardService.getBotHealthMetrics();

    return {
      success: true,
      data: metrics,
      message: 'Bot health metrics retrieved successfully',
    };
  }

  @Get('metrics/revenue')
  @ApiOperation({
    summary: 'Get revenue report',
    description: 'Retrieve detailed revenue report for specified date range. Admin only endpoint.',
  })
  @ApiQuery({ name: 'dateFrom', required: true, type: Date, description: 'Start date for revenue report' })
  @ApiQuery({ name: 'dateTo', required: true, type: Date, description: 'End date for revenue report' })
  @ApiResponse({ status: 200, description: 'Revenue report retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Missing required parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getRevenueReport(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    if (!dateFrom || !dateTo) {
      throw new Error('dateFrom and dateTo parameters are required');
    }

    const parsedDateFrom = new Date(dateFrom);
    const parsedDateTo = new Date(dateTo);

    const report = await this.adminDashboardService.getRevenueReport(
      parsedDateFrom,
      parsedDateTo,
    );

    return {
      success: true,
      data: report,
      message: 'Revenue report retrieved successfully',
    };
  }

  @Get('system-health')
  @ApiOperation({
    summary: 'Get system health status',
    description: 'Retrieve comprehensive system health status including database, Redis, queues, and API performance. Admin only endpoint.',
  })
  @ApiResponse({ status: 200, description: 'System health status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getSystemHealth(): Promise<{
    success: boolean;
    data: SystemHealth;
    message: string;
  }> {
    const health = await this.adminDashboardService.getSystemHealth();

    return {
      success: true,
      data: health,
      message: 'System health status retrieved successfully',
    };
  }

  @Get('top-users')
  @ApiOperation({
    summary: 'Get top users by metric',
    description: 'Retrieve leaderboard of top users by trades, revenue, or reputation. Admin only endpoint.',
  })
  @ApiQuery({
    name: 'metric',
    required: false,
    enum: ['trades', 'revenue', 'reputation'],
    default: 'trades',
    description: 'Metric to rank users by',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    default: 10,
    description: 'Number of users to return',
  })
  @ApiResponse({ status: 200, description: 'Top users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getTopUsers(
    @Query('metric') metric: 'trades' | 'revenue' | 'reputation' = 'trades',
    @Query('limit') limit: number = 10,
  ): Promise<{
    success: boolean;
    data: any[];
    message: string;
  }> {
    const topUsers = await this.adminDashboardService.getTopUsers(metric, limit);

    return {
      success: true,
      data: topUsers,
      message: 'Top users retrieved successfully',
    };
  }

  @Get('recent-activity')
  @ApiOperation({
    summary: 'Get recent platform activity',
    description: 'Retrieve recent activity including trades, disputes, user registrations, and admin actions. Admin only endpoint.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    default: 20,
    description: 'Number of activities to return',
  })
  @ApiResponse({ status: 200, description: 'Recent activity retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getRecentActivity(
    @Query('limit') limit: number = 20,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const activity = await this.adminDashboardService.getRecentActivity(limit);

    return {
      success: true,
      data: activity,
      message: 'Recent activity retrieved successfully',
    };
  }

  @Get('alerts')
  @ApiOperation({
    summary: 'Get system alerts',
    description: 'Retrieve current system alerts and warnings for administrators. Admin only endpoint.',
  })
  @ApiResponse({ status: 200, description: 'System alerts retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAlerts(): Promise<{
    success: boolean;
    data: any[];
    message: string;
  }> {
    const alerts = await this.adminDashboardService.getAlerts();

    return {
      success: true,
      data: alerts,
      message: 'System alerts retrieved successfully',
    };
  }
}