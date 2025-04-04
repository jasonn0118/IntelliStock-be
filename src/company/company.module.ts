import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from '../stock/stock.entity';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { Company } from './company.entity';
import { CompanyMappingService } from './services/company-mapping.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company, Stock])],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompanyMappingService],
  exports: [CompaniesService, CompanyMappingService],
})
export class CompanyModule {}
