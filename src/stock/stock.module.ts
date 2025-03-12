import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from './stock.entity';
import { StocksContoller } from './stocks.controller';
import { StocksService } from './stocks.service';
import { HttpModule } from '@nestjs/axios';
import { StockQuote } from 'src/stockquote/stock-quote.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { StockDataScheduler } from './scheduler/stock-data.scheduler';
import { EmbeddingsService } from 'src/embedding/embeddings.service';
import { Document } from 'src/document/document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stock, StockQuote, Document]),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  controllers: [StocksContoller],
  providers: [StocksService, StockDataScheduler, EmbeddingsService],
  exports: [StocksService],
})
export class StockModule {}
