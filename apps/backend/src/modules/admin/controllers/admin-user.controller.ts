import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../trading/guards/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AdminUserService } from '../services/admin-user.service';
import { AuditLogService } from '../services/audit-log.service';
import { GetUsersDto } from '../dto/get-users.dto';
import { BanUserDto } from '../dto/ban-user.dto';
import { SuspendUserDto } from '../dto/suspend-user.dto';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin User Management')
@ApiBearerAuth()
export class AdminUserController {
  constructor(
    private adminUserService: AdminUserService,
    private auditLogService: AuditLogService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all users with filters',
    description: 'Retrieve list of users with optional filtering and pagination. Admin only endpoint.',
  })
  @ApiQuery({ name: 'role', required: false, enum: UserRole, description: 'Filter by user role' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'isBanned', required: false, type: Boolean, description: 'Filter by banned status' })
  @ApiQuery({ name: 'searchQuery', required: false, type: String, description: 'Search in username, email, or Steam ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, default: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 10, description: 'Page size' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllUsers(@Query() getUsersDto: GetUsersDto): Promise<{
    success: boolean;
    data: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    message: string;
  }> {
    const result = await this.adminUserService.getAllUsers(
      getUsersDto,
      {
        page: getUsersDto.page,
        limit: getUsersDto.limit,
        sortBy: getUsersDto.sortBy,
        sortOrder: getUsersDto.sortOrder,
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
      message: 'Users retrieved successfully',
    };
  }

  @Get(':userId')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve detailed information for a specific user. Admin only endpoint.',
  })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('userId') userId: string): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const user = await this.adminUserService.getUserById(userId);

    return {
      success: true,
      data: user,
      message: 'User retrieved successfully',
    };
  }

  @Post(':userId/ban')
  @ApiOperation({
    summary: 'Ban user',
    description: 'Ban a user with optional duration and reason. Admin only endpoint.',
  })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  @ApiBody({ type: BanUserDto })
  @ApiResponse({ status: 200, description: 'User banned successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User is already banned' })
  async banUser(
    @CurrentUser('id') adminId: string,
    @Param('userId') userId: string,
    @Body() banUserDto: BanUserDto,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const user = await this.adminUserService.banUser(
      adminId,
      userId,
      banUserDto.reason,
      banUserDto.duration,
    );

    return {
      success: true,
      data: user,
      message: 'User banned successfully',
    };
  }

  @Post(':userId/unban')
  @ApiOperation({
    summary: 'Unban user',
    description: 'Unban a previously banned user. Admin only endpoint.',
  })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User unbanned successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - User is not banned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unbanUser(
    @CurrentUser('id') adminId: string,
    @Param('userId') userId: string,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const user = await this.adminUserService.unbanUser(adminId, userId);

    return {
      success: true,
      data: user,
      message: 'User unbanned successfully',
    };
  }

  @Post(':userId/suspend')
  @ApiOperation({
    summary: 'Suspend user',
    description: 'Suspend a user (deactivate account) with reason. Admin only endpoint.',
  })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  @ApiBody({ type: SuspendUserDto })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User is already suspended' })
  async suspendUser(
    @CurrentUser('id') adminId: string,
    @Param('userId') userId: string,
    @Body() suspendUserDto: SuspendUserDto,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const user = await this.adminUserService.suspendUser(
      adminId,
      userId,
      suspendUserDto.reason,
    );

    return {
      success: true,
      data: user,
      message: 'User suspended successfully',
    };
  }

  @Post(':userId/activate')
  @ApiOperation({
    summary: 'Activate user',
    description: 'Activate a previously suspended user. Admin only endpoint.',
  })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - User is already active' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async activateUser(
    @CurrentUser('id') adminId: string,
    @Param('userId') userId: string,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const user = await this.adminUserService.activateUser(adminId, userId);

    return {
      success: true,
      data: user,
      message: 'User activated successfully',
    };
  }

  @Patch(':userId/role')
  @ApiOperation({
    summary: 'Update user role',
    description: 'Update user role (USER, MODERATOR, ADMIN). Admin only endpoint.',
  })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User already has this role' })
  async updateUserRole(
    @CurrentUser('id') adminId: string,
    @Param('userId') userId: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const user = await this.adminUserService.updateUserRole(
      adminId,
      userId,
      updateUserRoleDto.role,
    );

    return {
      success: true,
      data: user,
      message: 'User role updated successfully',
    };
  }

  @Post(':userId/verify')
  @ApiOperation({
    summary: 'Verify user',
    description: 'Mark user as verified. Admin only endpoint.',
  })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User verified successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - User is already verified' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async verifyUser(
    @CurrentUser('id') adminId: string,
    @Param('userId') userId: string,
  ): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const user = await this.adminUserService.verifyUser(adminId, userId);

    return {
      success: true,
      data: user,
      message: 'User verified successfully',
    };
  }

  @Get(':userId/activity')
  @ApiOperation({
    summary: 'Get user activity report',
    description: 'Retrieve comprehensive activity report for a user including trades, transactions, and statistics. Admin only endpoint.',
  })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User activity report retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserActivityReport(@Param('userId') userId: string): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    const report = await this.adminUserService.getUserActivityReport(userId);

    return {
      success: true,
      data: report,
      message: 'User activity report retrieved successfully',
    };
  }
}