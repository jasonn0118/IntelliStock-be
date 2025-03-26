import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StocksService } from '../stocks.service';

@Injectable()
export class StockDataScheduler {
  private readonly logger = new Logger(StockDataScheduler.name);

  constructor(private readonly stocksService: StocksService) {}

  @Cron(CronExpression.EVERY_DAY_AT_6PM)
  async updateDailyQuotes(): Promise<void> {
    try {
      const tickers = await this.stocksService.getAllSymbols();
      // Split tickers into batches of 1000
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

  @Cron(CronExpression.EVERY_DAY_AT_7PM)
  async updateHistoricalQuotes(): Promise<void> {
    try {
      const symbols = await this.stocksService.getAllSymbols();
      // Define how many symbols to update each day.
      const symbolsPerDay = 200;
      // Rotate through the symbols over multiple days. For example, use the current date modulo the number of batches.
      const totalBatches = Math.ceil(symbols.length / symbolsPerDay);
      const dayIndex = new Date().getDate() % totalBatches;
      const start = dayIndex * symbolsPerDay;
      const symbolsToUpdate = symbols.slice(start, start + symbolsPerDay);

      // Now, split the selected symbols into batches of 5.
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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
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
}
