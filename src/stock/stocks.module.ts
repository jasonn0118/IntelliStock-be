import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbeddingModule } from '../embedding/embedding.module';
import { StockQuote } from '../stockquote/stock-quote.entity';
import { StockDataScheduler } from './scheduler/stock-data.scheduler';
import { AiMarketAnalysisService } from './services/ai-market-analysis.service';
import { Stock } from './stock.entity';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stock, StockQuote]),
    HttpModule,
    ScheduleModule.forRoot(),
    EmbeddingModule,
  ],
  controllers: [StocksController],
  providers: [StocksService, StockDataScheduler, AiMarketAnalysisService],
  exports: [StocksService],
})
export class StocksModule {}
