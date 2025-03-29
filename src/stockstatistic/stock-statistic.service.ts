import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../stock/stock.entity';
import { StockQuote } from '../stockquote/stock-quote.entity';
import { StockStatistic } from './stock-statistic.entity';

@Injectable()
export class StockStatisticService {
  private readonly logger = new Logger(StockStatisticService.name);

  constructor(
    @InjectRepository(StockStatistic)
    private statisticRepository: Repository<StockStatistic>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a stock statistic from Yahoo Finance data
   * @param stockId The ID of the stock
   * @param stock The stock entity
   * @param date The date for the statistic
   * @param statsData The Yahoo Finance statistics data
   * @param quote Optional stock quote to link to the statistic
   * @returns The created or updated statistic entity
   */
  async createStatisticFromYahooData(
    stockId: string,
    stock: Stock,
    date: Date,
    statsData: Record<string, unknown>,
    quote?: StockQuote,
  ): Promise<StockStatistic> {
    try {
      // Check if a statistic already exists for this date and stock
      let statistic = await this.statisticRepository.findOne({
        where: {
          date,
          stockId,
        },
      });

      // Create a new statistic entity if none exists
      if (!statistic) {
        statistic = new StockStatistic();
        statistic.date = date;
        statistic.stockId = stockId;
        statistic.stock = stock;
      }

      // Map Yahoo Finance fields to our entity
      statistic.enterpriseValue = statsData.enterpriseValue as number;
      statistic.forwardPE = statsData.forwardPE as number;
      statistic.priceToBook = statsData.priceToBook as number;
      statistic.enterpriseToRevenue = statsData.enterpriseToRevenue as number;
      statistic.enterpriseToEbitda = statsData.enterpriseToEbitda as number;
      statistic.profitMargins = statsData.profitMargins as number;
      statistic.trailingEps = statsData.trailingEps as number;
      statistic.sharesOutstanding = statsData.sharesOutstanding as number;
      statistic.floatShares = statsData.floatShares as number;
      statistic.heldPercentInsiders = statsData.heldPercentInsiders as number;
      statistic.heldPercentInstitutions =
        statsData.heldPercentInstitutions as number;
      statistic.sharesShort = statsData.sharesShort as number;
      statistic.shortRatio = statsData.shortRatio as number;
      statistic.shortPercentOfFloat = statsData.shortPercentOfFloat as number;
      statistic.pegRatio = statsData.pegRatio as number;
      statistic.weekChange52 = statsData['52WeekChange'] as number;
      statistic.spWeekChange52 = statsData['SandP52WeekChange'] as number;

      // Handle date fields
      if (statsData.lastFiscalYearEnd) {
        statistic.lastFiscalYearEnd = new Date(
          statsData.lastFiscalYearEnd as string,
        );
      }

      if (statsData.mostRecentQuarter) {
        statistic.mostRecentQuarter = new Date(
          statsData.mostRecentQuarter as string,
        );
      }

      // Link to quote if provided
      if (quote) {
        statistic.quote = quote;
        statistic.quoteId = quote.id;
      }

      // Save to database
      return this.statisticRepository.save(statistic);
    } catch (error) {
      this.logger.error(
        `Error creating statistic from Yahoo data: ${error.message}`,
      );
      throw error;
    }
  }
}
