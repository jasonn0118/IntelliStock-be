import { Controller, Get, Param, Post } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('profile/:ticker')
  async getCompanyProfile(@Param('ticker') ticker: string): Promise<any> {
    return await this.companiesService.fetchCompanyProfile(ticker);
  }

  @Post('update-profile')
  async updateCompanyProfile(symbol: string) {
    return this.companiesService.updateCompanyProfile(symbol);
  }

  @Post('update-logos')
  async updateCompanyLogos() {
    return this.companiesService.updateCompanyLogos();
  }
}
