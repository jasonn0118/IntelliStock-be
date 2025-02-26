import { Controller, Post } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post('create-profiles-and-link-stock')
  async createCompanyProfilesAndLinkStock() {
    await this.companiesService.createBulkCompanyProfilesAndLinkStocks();
  }
}
