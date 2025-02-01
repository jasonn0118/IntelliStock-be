import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from './stock.entity';
import { StocksContoller } from './stocks.controller';
import { StocksService } from './stocks.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TypeOrmModule.forFeature([Stock]), HttpModule],
  controllers: [StocksContoller],
  providers: [StocksService],
  exports: [StocksService],
})
export class StockModule {}
