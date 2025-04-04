import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminInternalRoleGuard } from '../users/guards/admin-internal-role.guard';
import { CompaniesService } from './companies.service';
import { CompanyProfileDto } from './dtos/company-profile.dto';
import { CompanyUpdateResponseDto } from './dtos/company-update-response.dto';
import { LogoUpdateResponseDto } from './dtos/logo-update-response.dto';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('profile/:ticker')
  @ApiOperation({ summary: 'Get company profile information by ticker symbol' })
  @ApiParam({
    name: 'ticker',
    description: 'Stock ticker symbol',
    example: 'AAPL',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns company profile information',
    type: CompanyProfileDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
  })
  async getCompanyProfile(
    @Param('ticker') ticker: string,
  ): Promise<CompanyProfileDto> {
    return await this.companiesService.fetchCompanyProfile(ticker);
  }

  @UseGuards(JwtAuthGuard, AdminInternalRoleGuard)
  @Post('update-profile')
  @ApiOperation({
    summary: 'Update company profile information (Admin/Internal only)',
  })
  @ApiParam({
    name: 'symbol',
    description: 'Stock ticker symbol',
    example: 'AAPL',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          example: 'AAPL',
          description: 'Stock ticker symbol to update',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Company profile updated successfully',
    type: CompanyUpdateResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires Admin or Internal User role',
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
  })
  async updateCompanyProfile(
    @Body('symbol') symbol: string,
  ): Promise<CompanyUpdateResponseDto> {
    const company = await this.companiesService.updateCompanyProfile(symbol);
    return {
      success: true,
      message: 'Company profile updated successfully',
      ticker: symbol,
      timestamp: new Date(),
    };
  }

  @UseGuards(JwtAuthGuard, AdminInternalRoleGuard)
  @Post('update-logos')
  @ApiOperation({
    summary: 'Update company logos for all companies (Admin/Internal only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Company logos update process initiated successfully',
    type: LogoUpdateResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires Admin or Internal User role',
  })
  async updateCompanyLogos(): Promise<LogoUpdateResponseDto> {
    await this.companiesService.updateCompanyLogos();
    return {
      success: true,
      message: 'Company logos updated successfully',
      count: 0, // This would be populated with actual count in a real implementation
      timestamp: new Date(),
    };
  }
}
