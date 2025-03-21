import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { TopStockDto } from './dtos/top-stock.dto';
import { StocksService } from './stocks.service';

@Controller('stocks')
@UseInterceptors(ClassSerializerInterceptor)
export class StocksContoller {
  constructor(private readonly stocksService: StocksService) {}

  @Post('import-list')
  async importStockList() {
    await this.stocksService.importStockList();
  }

  @Get('symbols')
  async getSymbols() {
    return this.stocksService.getAllSymbols();
  }

  @Get('top-stocks')
  async getTopStocks() {
    const marketCapStocks = await this.stocksService.getTopStocksByMarketCap();
    const gainerStocks = await this.stocksService.getTopGainers();

    return {
      marketCap: marketCapStocks.map(
        (quote) =>
          new TopStockDto({
            symbol: quote.stock.ticker,
            name: quote.stock.name,
            price: quote.price,
            marketCap: quote.marketCap,
            changesPercentage: quote.changesPercentage,
          }),
      ),
      gainers: gainerStocks.map(
        (quote) =>
          new TopStockDto({
            symbol: quote.stock.ticker,
            name: quote.stock.name,
            price: quote.price,
            changesPercentage: quote.changesPercentage,
          }),
      ),
    };
  }

  @Get(':ticker')
  async getStock(@Param('ticker') ticker: string) {
    return this.stocksService.getStock(ticker);
  }

  // FIXME: Remove this endpoint eventually
  @Post('fetch-quotes')
  async fetchQuotes() {
    await this.stocksService.fetchAndSaveDailyQuotes();
  }
}
