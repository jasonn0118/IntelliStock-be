import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from '../company/company.module';
import { StockModule } from '../stock/stock.module';
import { StockStatistic } from './stock-statistic.entity';
import { StockStatisticService } from './stock-statistic.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockStatistic]),
    HttpModule,
    StockModule,
    CompanyModule,
    ScheduleModule.forRoot(),
  ],
  providers: [StockStatisticService],
  exports: [StockStatisticService],
})
export class StockStatisticModule {}
