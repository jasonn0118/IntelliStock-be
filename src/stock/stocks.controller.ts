import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { TopStockDto } from './dtos/top-stock.dto';
import { StocksService } from './stocks.service';
import { SearchStockDto } from './dtos/search-stock.dto';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('stocks')
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

  @Get('search')
  @ApiOperation({ summary: 'Search for stocks by ticker or company name' })
  @ApiQuery({ name: 'query', description: 'Search query for ticker or company name', required: true })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns a list of stocks matching the search query',
    type: [SearchStockDto]
  })
  async searchStocks(@Query('query') query: string) {
    return this.stocksService.searchStocks(query);
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
