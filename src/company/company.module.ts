import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './company.entity';
import { HttpModule } from '@nestjs/axios';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { Stock } from 'src/stock/stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, Stock]), HttpModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompanyModule {}
