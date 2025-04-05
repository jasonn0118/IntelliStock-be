import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  SetMetadata,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminInternalRoleGuard } from '../users/guards/admin-internal-role.guard';
import { MarketSummaryResponseDto } from './dtos/market-summary.dto';
import { SearchStockDto } from './dtos/search-stock.dto';
import { StockDynamicDto } from './dtos/stock-dynamic.dto';
import { StockStaticDto } from './dtos/stock-static.dto';
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

  @UseGuards(JwtAuthGuard, AdminInternalRoleGuard)
  @Post('import-list')
  @ApiOperation({
    summary: 'Import stock list from external source (Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Stock list imported successfully',
  })
  async importStockList() {
    await this.stocksService.importStockList();
  }

  @Get('symbols')
  @ApiOperation({ summary: 'Get list of all stock symbols' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all available stock symbols',
    type: [String],
  })
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
  @SetMetadata('no_cache', true)
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

  @Get(':ticker/static')
  @ApiOperation({
    summary: 'Get static stock information (company and basic details)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns basic stock information and company details',
    type: StockStaticDto,
  })
  async getStockStatic(
    @Param('ticker') ticker: string,
  ): Promise<StockStaticDto> {
    const cacheKey = `stock-static-${ticker}`;
    const cached = await this.marketCacheService.getCachedMarketData(cacheKey);
    if (cached) {
      return cached;
    }

    const stock = await this.stocksService.getStockStatic(ticker);
    if (!stock) {
      throw new NotFoundException(`Stock with ticker ${ticker} not found`);
    }

    const staticDto = new StockStaticDto();
    Object.assign(staticDto, {
      id: stock.id,
      ticker: stock.ticker,
      name: stock.name,
      exchange: stock.exchange,
      company: stock.company,
    });

    await this.marketCacheService.cacheMarketData(
      cacheKey,
      staticDto,
      7 * 24 * 60 * 60,
    );
    return staticDto;
  }

  @Get(':ticker/dynamic')
  @ApiOperation({
    summary: 'Get dynamic stock information (quotes and analysis)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns latest quote and AI-generated analysis',
    type: StockDynamicDto,
  })
  async getStockDynamic(
    @Param('ticker') ticker: string,
  ): Promise<StockDynamicDto> {
    const cacheKey = `stock-dynamic-${ticker}`;
    const cached = await this.marketCacheService.getCachedMarketData(cacheKey);
    if (cached) {
      return cached;
    }

    const stock = await this.stocksService.getStock(ticker);
    if (!stock) {
      throw new NotFoundException(`Stock with ticker ${ticker} not found`);
    }

    const analysisResult =
      await this.stocksService.generateStockAnalysis(stock);
    const dynamicDto = new StockDynamicDto();
    Object.assign(dynamicDto, {
      quotes: stock.quotes,
      statistics: stock.statistics,
      structuredAnalysis: analysisResult.analysisStructured,
      lastUpdated: new Date(),
    });

    await this.marketCacheService.cacheMarketData(cacheKey, dynamicDto);
    return dynamicDto;
  }

  @Post('fetch-quotes')
  @UseGuards(JwtAuthGuard, AdminInternalRoleGuard)
  @ApiOperation({
    summary: 'Fetch and save daily stock quotes (Admin/Internal only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Daily quotes fetched and saved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires Admin or Internal User role',
  })
  async fetchQuotes() {
    await this.stocksService.fetchAndSaveDailyQuotes();
  }

  @Post('generate-summaries')
  @UseGuards(JwtAuthGuard, AdminInternalRoleGuard)
  @ApiOperation({ summary: 'Generate market summaries (Admin/Internal only)' })
  @ApiResponse({
    status: 201,
    description: 'Market summaries generation triggered successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Market summaries generation triggered successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires Admin or Internal User role',
  })
  async generateMarketSummaries() {
    await this.stockDataScheduler.handleGenerateMarketSummaries();
    return { message: 'Market summaries generation triggered successfully' };
  }

  @Get('cache-status')
  @ApiOperation({ summary: 'Check cache status' })
  @ApiResponse({
    status: 200,
    description: 'Returns information about the current cache status',
  })
  async getCacheStatus() {
    const testKey = 'cache-test';
    const testValue = {
      timestamp: new Date().toISOString(),
      message: 'Cache test successful',
    };

    await this.marketCacheService.cacheMarketData(testKey, testValue);
    const cachedValue =
      await this.marketCacheService.getCachedMarketData(testKey);

    const cacheStats = await this.marketCacheService.getCacheStats();

    return {
      status: 'success',
      cacheWorking: !!cachedValue,
      testValue,
      cachedValue,
      timestamp: new Date().toISOString(),
      cacheStats,
    };
  }
}
