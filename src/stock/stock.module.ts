import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from './stock.entity';

import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { Document } from 'src/document/document.entity';
import { EmbeddingsService } from 'src/embedding/embeddings.service';
import { StockQuote } from 'src/stockquote/stock-quote.entity';
import { CompanyModule } from '../company/company.module';
import { StockDataScheduler } from './scheduler/stock-data.scheduler';
import { AiMarketAnalysisService } from './services/ai-market-analysis.service';
import { MarketCacheService } from './services/market-cache.service';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Stock, StockQuote, Document]),
    ScheduleModule.forRoot(),
    HttpModule,
    CompanyModule,
  ],
  controllers: [StocksController],
  providers: [
    StocksService,
    StockDataScheduler,
    EmbeddingsService,
    AiMarketAnalysisService,
    MarketCacheService,
  ],
  exports: [StocksService],
})
export class StockModule {}
