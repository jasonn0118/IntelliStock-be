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
import { TopStocksResponseDto } from './dtos/top-stock.dto';
import { StockDataScheduler } from './scheduler/stock-data.scheduler';
import { MarketCacheService } from './services/market-cache.service';
import { StocksService } from './stocks.service';

@ApiTags('stocks')
@Controller('stocks')
@UseInterceptors(ClassSerializerInterceptor)
export class StocksController {
  private readonly logger = new Logger(StocksController.name);

  constructor(
    private readonly stocksService: StocksService,
    private readonly stockDataScheduler: StockDataScheduler,
    private readonly marketCacheService: MarketCacheService,
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
  @ApiOperation({ summary: 'Get top performing stocks' })
  @ApiResponse({
    status: 200,
    description: 'Returns top performing stocks',
    type: TopStocksResponseDto,
  })
  async getTopStocks() {
    const cached =
      await this.marketCacheService.getCachedMarketData('top-stocks');
    if (cached) {
      return cached;
    }

    const topStocks = await this.stocksService.getTopStocks();
    await this.marketCacheService.cacheMarketData('top-stocks', topStocks);
    return topStocks;
  }

  @Get('market-summary')
  @ApiOperation({ summary: 'Get market summary with AI analysis' })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Date in YYYY-MM-DD format (defaults to today)',
  })
  @ApiResponse({ status: 200, type: MarketSummaryResponseDto })
  async getMarketSummary(
    @Query('date') dateStr?: string,
  ): Promise<MarketSummaryResponseDto> {
    const date = dateStr ? new Date(dateStr) : new Date();

    const cached =
      await this.marketCacheService.getCachedMarketData('market-summary');
    if (cached) {
      return cached;
    }

    const marketData = await this.stocksService.getMarketSummary(date);
    await this.marketCacheService.cacheMarketData('market-summary', marketData);
    return marketData;
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
