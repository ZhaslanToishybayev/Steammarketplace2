import { Controller, Get, Query, Param, UseGuards, Inject, Res, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';
import { Logger } from 'winston';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../trading/guards/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuditLogService } from '../services/audit-log.service';
import { GetAuditLogsDto } from '../dto/get-audit-logs.dto';
import { AuditTargetType } from '../entities/audit-log.entity';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin Audit Logs')
@ApiBearerAuth()
export class AdminAuditController {
  constructor(
    private auditLogService: AuditLogService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get audit logs with filters',
    description: 'Retrieve audit logs with optional filtering and pagination. Admin only endpoint.',
  })
  @ApiQuery({ name: 'adminId', required: false, type: String, description: 'Filter by admin ID' })
  @ApiQuery({ name: 'action', required: false, type: String, description: 'Filter by action type' })
  @ApiQuery({ name: 'targetType', required: false, enum: AuditTargetType, description: 'Filter by target type' })
  @ApiQuery({ name: 'targetId', required: false, type: String, description: 'Filter by target ID' })
  @ApiQuery({ name: 'dateFrom', required: false, type: Date, description: 'Start date for filtering' })
  @ApiQuery({ name: 'dateTo', required: false, type: Date, description: 'End date for filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, default: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 10, description: 'Page size' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAuditLogs(@Query() getAuditLogsDto: GetAuditLogsDto): Promise<{
    success: boolean;
    data: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    message: string;
  }> {
    const result = await this.auditLogService.getAuditLogs(
      getAuditLogsDto,
      {
        page: getAuditLogsDto.page,
        limit: getAuditLogsDto.limit,
        sortBy: getAuditLogsDto.sortBy,
        sortOrder: getAuditLogsDto.sortOrder,
      },
    );

    return {
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
      message: 'Audit logs retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get audit log by ID',
    description: 'Retrieve detailed information for a specific audit log entry. Admin only endpoint.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Audit log ID' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async getAuditLogById(@Param('id') id: string): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const auditLog = await this.auditLogService.getAuditLogById(id);
    if (!auditLog) {
      return {
        success: false,
        message: 'Audit log not found',
      };
    }

    return {
      success: true,
      data: auditLog,
      message: 'Audit log retrieved successfully',
    };
  }

  @Get('admin/:adminId/summary')
  @ApiOperation({
    summary: 'Get admin activity summary',
    description: 'Retrieve activity summary for a specific admin with optional date filtering. Admin only endpoint.',
  })
  @ApiParam({ name: 'adminId', type: 'string', description: 'Admin ID' })
  @ApiQuery({ name: 'dateFrom', required: false, type: Date, description: 'Start date for summary' })
  @ApiQuery({ name: 'dateTo', required: false, type: Date, description: 'End date for summary' })
  @ApiResponse({ status: 200, description: 'Admin activity summary retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAdminActivitySummary(
    @CurrentUser('id') currentAdminId: string,
    @CurrentUser('role') currentAdminRole: string,
    @Param('adminId') adminId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    // Only allow admins to view other admins' logs, moderators can only view their own
    if (currentAdminRole !== UserRole.ADMIN && currentAdminId !== adminId) {
      return {
        success: false,
        message: 'You can only view your own activity summary',
      };
    }

    const parsedDateFrom = dateFrom ? new Date(dateFrom) : undefined;
    const parsedDateTo = dateTo ? new Date(dateTo) : undefined;

    const summary = await this.auditLogService.getAdminActivitySummary(
      adminId,
      parsedDateFrom,
      parsedDateTo,
    );

    return {
      success: true,
      data: summary,
      message: 'Admin activity summary retrieved successfully',
    };
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export audit logs',
    description: 'Export audit logs to JSON or CSV format for compliance purposes. Admin only endpoint.',
  })
  @ApiQuery({ name: 'adminId', required: false, type: String, description: 'Filter by admin ID' })
  @ApiQuery({ name: 'action', required: false, type: String, description: 'Filter by action type' })
  @ApiQuery({ name: 'targetType', required: false, enum: AuditTargetType, description: 'Filter by target type' })
  @ApiQuery({ name: 'targetId', required: false, type: String, description: 'Filter by target ID' })
  @ApiQuery({ name: 'dateFrom', required: false, type: Date, description: 'Start date for filtering' })
  @ApiQuery({ name: 'dateTo', required: false, type: Date, description: 'End date for filtering' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['json', 'csv'],
    default: 'json',
    description: 'Export format',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs exported successfully',
    content: {
      'application/json': {
        schema: { type: 'string', format: 'binary' },
      },
      'text/csv': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async exportAuditLogs(
    @CurrentUser('id') currentAdminId: string,
    @CurrentUser('role') currentAdminRole: string,
    @Query() filters: any,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    // Apply role-based filtering
    if (currentAdminRole !== UserRole.ADMIN) {
      // Moderators can only export their own logs
      if (filters.adminId && filters.adminId !== currentAdminId) {
        response.status(403);
        return new StreamableFile(
          Buffer.from(JSON.stringify({ success: false, message: 'You can only export your own audit logs' })),
        );
      }
      // If moderator doesn't specify adminId, default to their own ID
      if (!filters.adminId) {
        filters.adminId = currentAdminId;
      }
    }

    try {
      const exportData = await this.auditLogService.exportAuditLogs(
        {
          adminId: filters.adminId,
          action: filters.action,
          targetType: filters.targetType,
          targetId: filters.targetId,
          dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
          dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        },
        format,
      );

      const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      const contentType = format === 'json' ? 'application/json' : 'text/csv';

      response.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      });

      return new StreamableFile(Buffer.from(exportData));
    } catch (error) {
      this.logger.error('Failed to export audit logs', { error });
      response.status(500);
      return new StreamableFile(
        Buffer.from(JSON.stringify({ success: false, message: 'Failed to export audit logs' })),
      );
    }
  }
}