import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../auth/guards/admin.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../auth/entities/user.entity';
import { Referral } from '../entities/referral.entity';
import { ReferralCode } from '../entities/referral-code.entity';
import { ReferralService } from '../services/referral.service';
import { ApplyReferralCodeDto, GetReferralsDto } from '../dto';

@Controller('referral')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Referrals')
@ApiBearerAuth()
export class ReferralController {
  constructor(private referralService: ReferralService) {}

  @Get('code')
  @ApiOperation({ summary: 'Get user referral code' })
  @ApiResponse({ status: 200, type: ReferralCode })
  async getReferralCode(@CurrentUser() user: User): Promise<ReferralCode | null> {
    return this.referralService.getReferralCode(user.id);
  }

  @Post('code')
  @ApiOperation({ summary: 'Generate referral code' })
  @ApiResponse({ status: 201, type: ReferralCode })
  async generateReferralCode(@CurrentUser() user: User): Promise<ReferralCode> {
    return this.referralService.generateReferralCode(user.id);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Apply referral code' })
  @ApiBody({ type: ApplyReferralCodeDto })
  @ApiResponse({ status: 201, type: Referral })
  async applyReferralCode(
    @CurrentUser() user: User,
    @Body() applyDto: ApplyReferralCodeDto,
  ): Promise<Referral> {
    return this.referralService.applyReferralCode(user.id, applyDto.code);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get user referrals list' })
  @ApiQuery({ name: 'page', type: 'number', required: false, default: 1 })
  @ApiQuery({ name: 'limit', type: 'number', required: false, default: 20 })
  @ApiResponse({ status: 200, type: [Referral] })
  async getReferrals(
    @CurrentUser() user: User,
    @Query() getReferralsDto: GetReferralsDto,
  ): Promise<{
    referrals: Referral[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit } = getReferralsDto;
    return this.referralService.getReferrals(user.id, { page, limit });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get referral statistics' })
  @ApiResponse({ status: 200, description: 'Referral statistics' })
  async getReferralStatistics(@CurrentUser() user: User): Promise<any> {
    return this.referralService.getReferralStatistics(user.id);
  }

  // Admin endpoints

  @Get('admin/all')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get all referrals (Admin only)' })
  @ApiQuery({ name: 'referrerId', type: 'string', required: false })
  @ApiQuery({ name: 'refereeId', type: 'string', required: false })
  @ApiQuery({ name: 'status', type: 'string', required: false })
  @ApiQuery({ name: 'page', type: 'number', required: false, default: 1 })
  @ApiQuery({ name: 'limit', type: 'number', required: false, default: 20 })
  @ApiResponse({ status: 200, type: [Referral] })
  async getAllReferrals(
    @Query() filters: {
      referrerId?: string;
      refereeId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    referrals: Referral[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { referrerId, refereeId, status, page = 1, limit = 20 } = filters;

    return this.referralService.getAllReferrals({ referrerId, refereeId, status, page, limit });
  }

  @Put('admin/:id/status')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update referral status (Admin only)' })
  @ApiParam({ name: 'id', type: 'uuid', description: 'Referral ID' })
  @ApiBody({ schema: { properties: { status: { type: 'string', description: 'New status' } } } })
  @ApiResponse({ status: 200, type: Referral })
  async updateReferralStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ): Promise<Referral> {
    return this.referralService.updateReferralStatus(id, body.status);
  }

  @Post('admin/:id/pay-bonus')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Pay referral bonus manually (Admin only)' })
  @ApiParam({ name: 'id', type: 'uuid', description: 'Referral ID' })
  @ApiResponse({ status: 200, description: 'Bonus paid successfully' })
  async payReferralBonus(@Param('id') id: string): Promise<void> {
    return this.referralService.payReferralBonus(id);
  }

  @Get('admin/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get referral details (Admin only)' })
  @ApiParam({ name: 'id', type: 'uuid', description: 'Referral ID' })
  @ApiResponse({ status: 200, type: Referral })
  async getAdminReferral(@Param('id') id: string): Promise<Referral> {
    const referral = await this.referralService['referralRepository'].findOne({
      where: { id },
      relations: ['referrer', 'referee', 'referralCode'],
    });

    if (!referral) {
      throw new Error(`Referral ${id} not found`);
    }

    return referral;
  }
}