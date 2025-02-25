import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockQuote } from './stock-quote.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StockQuote])],
})
export class StockQuoteModule {}
