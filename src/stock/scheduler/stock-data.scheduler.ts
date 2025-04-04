import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StockDto } from '../dtos/stock.dto';
import { MarketCacheService } from '../services/market-cache.service';
import { StocksService } from '../stocks.service';

@Injectable()
export class StockDataScheduler {
  private readonly logger = new Logger(StockDataScheduler.name);

  constructor(
    private readonly stocksService: StocksService,
    private readonly marketCacheService: MarketCacheService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6PM, {
    timeZone: 'America/New_York',
  })
  async updateDailyQuotes(): Promise<void> {
    try {
      const tickers = await this.stocksService.getAllSymbols();

      const batchSize = 1000;
      for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        await this.stocksService.fetchAndSaveDailyQuotes();
      }
      this.logger.log('Daily quotes update completed for all stocks');
    } catch (error) {
      this.logger.error('Error updating daily quotes', error.stack);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'America/New_York',
  })
  async handleGenerateMarketSummaries(): Promise<void> {
    try {
      this.logger.log('Starting daily market summaries generation...');
      await this.stocksService.generateAndStoreMarketSummaries();
      this.logger.log('Successfully generated daily market summaries');
    } catch (error) {
      this.logger.error(`Error generating market summaries: ${error.message}`);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'America/New_York',
  })
  async refreshMarketCache() {
    try {
      this.logger.log('Starting midnight EST cache refresh...');

      const marketSummary = await this.stocksService.getMarketSummary(
        new Date(),
      );
      await this.marketCacheService.cacheMarketData(
        'market-summary',
        marketSummary,
      );

      const topStocks = await this.stocksService.getTopStocks();
      await this.marketCacheService.cacheMarketData('top-stocks', topStocks);

      const topStockTickers = [
        ...topStocks.marketCap.map((stock) => stock.symbol),
        ...topStocks.gainers.map((stock) => stock.symbol),
      ];

      for (const ticker of topStockTickers) {
        try {
          const stock = await this.stocksService.getStock(ticker);
          if (stock) {
            const stockDto = new StockDto();
            Object.assign(stockDto, stock);
            const analysisResult =
              await this.stocksService.generateStockAnalysis(stock);
            stockDto.structuredAnalysis = analysisResult.analysisStructured;
            await this.marketCacheService.cacheMarketData(
              `stock-${ticker}`,
              stockDto,
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to refresh cache for stock ${ticker}:`,
            error,
          );
        }
      }

      this.logger.log('Successfully refreshed market cache at midnight EST');
    } catch (error) {
      this.logger.error('Failed to refresh market cache:', error);
    }
  }
}
