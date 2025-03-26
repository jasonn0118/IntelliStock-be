import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from './stock.entity';

import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { Document } from 'src/document/document.entity';
import { EmbeddingsService } from 'src/embedding/embeddings.service';
import { StockQuote } from 'src/stockquote/stock-quote.entity';
import { StockDataScheduler } from './scheduler/stock-data.scheduler';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';
import { AiMarketAnalysisService } from './services/ai-market-analysis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stock, StockQuote, Document]),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  controllers: [StocksController],
  providers: [StocksService, StockDataScheduler, EmbeddingsService, AiMarketAnalysisService],
  exports: [StocksService],
})
export class StockModule {}
