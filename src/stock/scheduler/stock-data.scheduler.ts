import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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

  @Cron(CronExpression.EVERY_DAY_AT_7PM, {
    timeZone: 'America/New_York',
  })
  async updateHistoricalQuotes(): Promise<void> {
    try {
      const symbols = await this.stocksService.getAllSymbols();
      const symbolsPerDay = 200;
      const totalBatches = Math.ceil(symbols.length / symbolsPerDay);
      const dayIndex = new Date().getDate() % totalBatches;
      const start = dayIndex * symbolsPerDay;
      const symbolsToUpdate = symbols.slice(start, start + symbolsPerDay);

      const batchSize = 5;
      for (let i = 0; i < symbolsToUpdate.length; i += batchSize) {
        const batch = symbolsToUpdate.slice(i, i + batchSize);
        await this.stocksService.fetchAndSaveHistoricalQuotes(batch);
      }
      this.logger.log(
        `Historical data updated for ${symbolsToUpdate.length} symbols.`,
      );
    } catch (error) {
      this.logger.error('Error updating historical data', error.stack);
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

      this.logger.log('Successfully refreshed market cache at midnight EST');
    } catch (error) {
      this.logger.error('Failed to refresh market cache:', error);
    }
  }
}
