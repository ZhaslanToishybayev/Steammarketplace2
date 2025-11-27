import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../trading/guards/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { SystemConfigService } from '../services/system-config.service';
import { AuditLogService } from '../services/audit-log.service';
import { CreateConfigDto } from '../dto/create-config.dto';
import { UpdateConfigDto } from '../dto/update-config.dto';
import { GetConfigsDto } from '../dto/get-configs.dto';
import { BulkUpdateConfigDto } from '../dto/bulk-update-config.dto';
import { AuditTargetType } from '../entities/audit-log.entity';

@Controller('admin/config')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin System Configuration')
@ApiBearerAuth()
export class AdminConfigController {
  constructor(
    private systemConfigService: SystemConfigService,
    private auditLogService: AuditLogService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all system configurations',
    description: 'Retrieve list of all system configurations with optional filtering and pagination. Admin only endpoint.',
  })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by configuration category' })
  @ApiQuery({ name: 'isPublic', required: false, type: Boolean, description: 'Filter by public visibility' })
  @ApiQuery({ name: 'searchQuery', required: false, type: String, description: 'Search in configuration key or description' })
  @ApiQuery({ name: 'page', required: false, type: Number, default: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 10, description: 'Page size' })
  @ApiResponse({ status: 200, description: 'Configurations retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllConfigs(@Query() getConfigsDto: GetConfigsDto): Promise<{
    success: boolean;
    data: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    message: string;
  }> {
    const result = await this.systemConfigService.getAllConfigs(
      getConfigsDto,
      {
        page: getConfigsDto.page,
        limit: getConfigsDto.limit,
        sortBy: getConfigsDto.sortBy,
        sortOrder: getConfigsDto.sortOrder,
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
      message: 'Configurations retrieved successfully',
    };
  }

  @Get('public')
  @UseGuards()
  @Public()
  @ApiOperation({
    summary: 'Get public configurations',
    description: 'Retrieve all public configurations visible to non-admin users. No authentication required.',
  })
  @ApiResponse({ status: 200, description: 'Public configurations retrieved successfully' })
  async getPublicConfigs(): Promise<{
    success: boolean;
    data: Record<string, any>;
    message: string;
  }> {
    const configs = await this.systemConfigService.getPublicConfigs();

    return {
      success: true,
      data: configs,
      message: 'Public configurations retrieved successfully',
    };
  }

  @Get(':key')
  @ApiOperation({
    summary: 'Get configuration by key',
    description: 'Retrieve a specific configuration value by its key. Admin only endpoint.',
  })
  @ApiParam({ name: 'key', type: 'string', description: 'Configuration key' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Configuration key not found' })
  async getConfig(@Param('key') key: string): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const config = await this.systemConfigService.getConfig(key);

    return {
      success: true,
      data: config,
      message: 'Configuration retrieved successfully',
    };
  }

  @Post()
  @ApiOperation({
    summary: 'Create new configuration',
    description: 'Create a new system configuration. Admin only endpoint.',
  })
  @ApiBody({ type: CreateConfigDto })
  @ApiResponse({ status: 201, description: 'Configuration created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 409, description: 'Configuration key already exists' })
  async createConfig(
    @CurrentUser('id') adminId: string,
    @Body() createConfigDto: CreateConfigDto,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const config = await this.systemConfigService.createConfig(
      adminId,
      createConfigDto.key,
      createConfigDto.value,
      createConfigDto.valueType,
      createConfigDto.category,
      createConfigDto.description,
      createConfigDto.isPublic,
      createConfigDto.isEditable,
    );

    return {
      success: true,
      data: config,
      message: 'Configuration created successfully',
    };
  }

  @Patch(':key')
  @ApiOperation({
    summary: 'Update configuration',
    description: 'Update an existing configuration value. Admin only endpoint.',
  })
  @ApiParam({ name: 'key', type: 'string', description: 'Configuration key' })
  @ApiBody({ type: UpdateConfigDto })
  @ApiResponse({ status: 200, description: 'Configuration updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Configuration key not found' })
  @ApiResponse({ status: 409, description: 'Configuration is not editable' })
  async updateConfig(
    @CurrentUser('id') adminId: string,
    @Param('key') key: string,
    @Body() updateConfigDto: UpdateConfigDto,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const config = await this.systemConfigService.updateConfig(
      adminId,
      key,
      updateConfigDto.value,
    );

    return {
      success: true,
      data: config,
      message: 'Configuration updated successfully',
    };
  }

  @Delete(':key')
  @ApiOperation({
    summary: 'Delete configuration',
    description: 'Delete a system configuration. Admin only endpoint.',
  })
  @ApiParam({ name: 'key', type: 'string', description: 'Configuration key' })
  @ApiResponse({ status: 200, description: 'Configuration deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Configuration key not found' })
  async deleteConfig(
    @CurrentUser('id') adminId: string,
    @Param('key') key: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.systemConfigService.deleteConfig(adminId, key);

    return {
      success: true,
      message: 'Configuration deleted successfully',
    };
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Bulk update configurations',
    description: 'Update multiple configurations in a single transaction. Admin only endpoint.',
  })
  @ApiBody({ type: BulkUpdateConfigDto })
  @ApiResponse({ status: 200, description: 'Configurations updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async bulkUpdateConfigs(
    @CurrentUser('id') adminId: string,
    @Body() bulkUpdateConfigDto: BulkUpdateConfigDto,
  ): Promise<{
    success: boolean;
    data: any[];
    message: string;
  }> {
    const configs = await this.systemConfigService.bulkUpdateConfigs(
      adminId,
      bulkUpdateConfigDto.configs,
    );

    return {
      success: true,
      data: configs,
      message: 'Configurations updated successfully',
    };
  }

  @Get(':key/history')
  @ApiOperation({
    summary: 'Get configuration history',
    description: 'Retrieve audit history for a specific configuration key. Admin only endpoint.',
  })
  @ApiParam({ name: 'key', type: 'string', description: 'Configuration key' })
  @ApiResponse({ status: 200, description: 'Configuration history retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getConfigHistory(@Param('key') key: string): Promise<{
    success: boolean;
    data: any[];
    message: string;
  }> {
    const history = await this.systemConfigService.getConfigHistory(key);

    return {
      success: true,
      data: history,
      message: 'Configuration history retrieved successfully',
    };
  }
}