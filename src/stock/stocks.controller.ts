import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MarketSummaryResponseDto } from './dtos/market-summary.dto';
import { SearchStockDto } from './dtos/search-stock.dto';
import { TopStockDto } from './dtos/top-stock.dto';
import { StockDataScheduler } from './scheduler/stock-data.scheduler';
import { StocksService } from './stocks.service';

@ApiTags('stocks')
@Controller('stocks')
@UseInterceptors(ClassSerializerInterceptor)
export class StocksController {
  private readonly logger = new Logger(StocksController.name);

  constructor(
    private readonly stocksService: StocksService,
    private readonly stockDataScheduler: StockDataScheduler,
  ) {}

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
  @ApiQuery({
    name: 'query',
    description: 'Search query for ticker or company name',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of stocks matching the search query',
    type: [SearchStockDto],
  })
  async searchStocks(@Query('query') query: string): Promise<SearchStockDto[]> {
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
  @Get('market-summary')
  @ApiOperation({ summary: 'Get market summary for a specific date' })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Date in YYYY-MM-DD format',
  })
  @ApiResponse({ status: 200, type: MarketSummaryResponseDto })
  async getMarketSummary(
    @Query('date') dateStr?: string,
  ): Promise<MarketSummaryResponseDto> {
    const date = dateStr ? new Date(dateStr) : new Date();

    return this.stocksService.getMarketSummary(date);
  }

  @Get(':ticker')
  async getStock(@Param('ticker') ticker: string) {
    return this.stocksService.getStock(ticker);
  }

  // FIXME: Remove below these endpoints eventually
  @Post('fetch-quotes')
  async fetchQuotes() {
    await this.stocksService.fetchAndSaveDailyQuotes();
  }

  @Post('generate-summaries')
  async generateMarketSummaries() {
    await this.stockDataScheduler.handleGenerateMarketSummaries();
    return { message: 'Market summaries generation triggered successfully' };
  }
}
