import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { EmbeddingsService } from '../embedding/embeddings.service';
import { StockQuote } from '../stockquote/stock-quote.entity';
import { STOCK_EXCHANGE, STOCK_TYPE } from './constants';
import {
  MarketBreadth,
  MarketSummaryResponseDto,
} from './dtos/market-summary.dto';
import { SearchStockDto } from './dtos/search-stock.dto';
import { Stock } from './stock.entity';

@Injectable()
export class StocksService {
  private readonly logger = new Logger(StocksService.name);
  private readonly baseUrl = 'https://financialmodelingprep.com/api/v3';
  constructor(
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    @InjectRepository(StockQuote)
    private stockQuoteRepository: Repository<StockQuote>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async importStockList(): Promise<void> {
    const url = `${this.baseUrl}/stock/list?apikey=${this.configService.get<string>('FMP_API_KEY')}`;
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const stockList = response.data;

      const stockToSave = stockList
        .filter(
          (stock) =>
            stock.exchangeShortName === STOCK_EXCHANGE.NASDAQ &&
            stock.type === STOCK_TYPE.STOCK &&
            stock.name,
        )
        .map((stock) => {
          const newStock = new Stock();
          newStock.ticker = stock.symbol;
          newStock.name = stock.name;
          newStock.exchange = stock.exchangeShortName;
          return newStock;
        });
      await this.stockRepository.save(stockToSave);
      this.logger.log('Stock list imported');
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  async fetchAndSaveDailyQuotes(): Promise<void> {
    try {
      const url = `${this.baseUrl}/symbol/NASDAQ?apikey=${this.configService.get<string>('FMP_API_KEY')}`;
      const response = await firstValueFrom(this.httpService.get(url));
      const allQuotes = response.data;

      const batchSize = 200;
      const quoteBatches = this.splitIntoBatches(allQuotes, batchSize);

      for (const batch of quoteBatches) {
        await this.processQuoteBatch(batch);
      }

      this.logger.log('All daily quotes processed successfully in batches.');
    } catch (error) {
      this.logger.error(
        `Error fetching and saving daily quotes: ${error.message}`,
      );
      throw error;
    }
  }

  async fetchAndSaveHistoricalQuotes(tickers: string[]): Promise<void> {
    try {
      const symbolList = tickers.join(',');
      const url = `${this.baseUrl}/historical-price-full/${symbolList}?apikey=${this.configService.get<string>('FMP_API_KEY')}`;
      const response = await firstValueFrom(this.httpService.get(url));
      const historicalData = response.data.historicalStockList;

      const quotesToSavePromises = historicalData.flatMap(async (data) => {
        const stock = await this.stockRepository.findOne({
          where: { ticker: data.symbol },
        });
        if (!stock) {
          return [];
        }
        return data.historical.map((quote) => {
          const newQuote = new StockQuote();
          newQuote.date = new Date(quote.date);
          newQuote.open = quote.open;
          newQuote.dayHigh = quote.high;
          newQuote.dayLow = quote.dayLow;
          newQuote.price = quote.close;
          newQuote.adjClose = quote.adjClose;
          newQuote.volume = quote.volume;
          newQuote.change = quote.change;
          newQuote.changesPercentage = quote.changePercent;
          newQuote.stock = stock as Stock;

          return newQuote;
        });
      });

      const quotesToSave = (await Promise.all(quotesToSavePromises)).filter(
        (q) => q.length > 0,
      );

      await this.stockQuoteRepository.save(quotesToSave);
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
  }

  /**
   * Get top stocks by market capitalization
   * @returns Array of stock quotes ordered by market cap
   */
  async getTopStocksByMarketCap(): Promise<StockQuote[]> {
    // Get the most recent date for which we have stock quotes
    const latestQuoteDate = await this.stockQuoteRepository
      .createQueryBuilder('sq')
      .select('MAX(sq.date)', 'maxDate')
      .getRawOne();

    if (!latestQuoteDate || !latestQuoteDate.maxDate) {
      this.logger.warn('No stock quotes found in the database');
      return [];
    }

    // Check if the latest date is today or the most recent market day
    if (!this.isLatestMarketDay(new Date(latestQuoteDate.maxDate))) {
      this.logger.warn('No data available for the latest market day');
      return [];
    }

    return this.stockQuoteRepository
      .createQueryBuilder('sq')
      .innerJoinAndSelect('sq.stock', 's')
      .where('sq.date = :date', { date: latestQuoteDate.maxDate })
      .andWhere('sq.marketCap > 100000000')
      .andWhere('sq.marketCap IS NOT NULL')
      .andWhere('sq.price > 5')
      .andWhere('sq.price IS NOT NULL')
      .andWhere('sq.volume IS NOT NULL')
      .andWhere('sq.avgVolume > 100000')
      .andWhere('sq.change IS NOT NULL')
      .andWhere('sq.changesPercentage IS NOT NULL')
      .orderBy('sq.marketCap', 'DESC')
      .limit(10)
      .getMany();
  }

  /**
   * Get top gaining stocks
   * @returns Array of stock quotes ordered by percentage change
   */
  async getTopGainers(): Promise<StockQuote[]> {
    // Get the most recent date for which we have stock quotes
    const latestQuoteDate = await this.stockQuoteRepository
      .createQueryBuilder('sq')
      .select('MAX(sq.date)', 'maxDate')
      .getRawOne();

    if (!latestQuoteDate || !latestQuoteDate.maxDate) {
      this.logger.warn('No stock quotes found in the database');
      return [];
    }

    // Check if the latest date is today or the most recent market day
    if (!this.isLatestMarketDay(new Date(latestQuoteDate.maxDate))) {
      this.logger.warn('No data available for the latest market day');
      return [];
    }

    return this.stockQuoteRepository
      .createQueryBuilder('sq')
      .innerJoinAndSelect('sq.stock', 's')
      .where('sq.date = :date', { date: latestQuoteDate.maxDate })
      .andWhere('sq.marketCap > 100000000')
      .andWhere('sq.marketCap IS NOT NULL')
      .andWhere('sq.price > 5')
      .andWhere('sq.price IS NOT NULL')
      .andWhere('sq.volume IS NOT NULL')
      .andWhere('sq.avgVolume > 100000')
      .andWhere('sq.change IS NOT NULL')
      .andWhere('sq.changesPercentage IS NOT NULL')
      .orderBy('sq.changesPercentage', 'DESC')
      .limit(10)
      .getMany();
  }

  async getAllSymbols(): Promise<string[]> {
    const stocks = await this.stockRepository.find();

    return stocks.map((stock) => stock.ticker);
  }

  async getStock(ticker: string): Promise<Stock> {
    return this.stockRepository.findOne({
      where: { ticker },
      relations: ['company'],
    });
  }

  /**
   * Search for stocks by ticker symbol or company name
   * @param query Search query string
   * @returns Array of SearchStockDto objects with matching stocks
   */
  async searchStocks(query: string): Promise<SearchStockDto[]> {
    if (!query || query.trim() === '') {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();

    const latestQuoteDate = await this.stockQuoteRepository
      .createQueryBuilder('sq')
      .select('MAX(sq.date)', 'maxDate')
      .getRawOne();

    if (!latestQuoteDate || !latestQuoteDate.maxDate) {
      this.logger.warn('No stock quotes found in the database');
      return [];
    }

    const searchResults = await this.stockQuoteRepository
      .createQueryBuilder('sq')
      .innerJoinAndSelect('sq.stock', 's')
      .where('sq.date = :date', { date: latestQuoteDate.maxDate })
      .andWhere(
        '(LOWER(s.ticker) LIKE :exactMatch OR ' +
          'LOWER(s.ticker) LIKE :startsWith OR ' +
          'LOWER(s.ticker) LIKE :contains OR ' +
          'LOWER(s.name) LIKE :exactMatch OR ' +
          'LOWER(s.name) LIKE :startsWith OR ' +
          'LOWER(s.name) LIKE :contains OR ' +
          'LOWER(s.name) LIKE :fuzzyMatch1 OR ' +
          'LOWER(s.name) LIKE :fuzzyMatch2 OR ' +
          'LOWER(s.name) LIKE :fuzzyMatch3 OR ' +
          'LOWER(s.name) LIKE :partialWord)',
        {
          exactMatch: searchTerm,
          startsWith: `${searchTerm}%`,
          contains: `%${searchTerm}%`,
          fuzzyMatch1: `%${searchTerm.split('').join('%')}%`,
          fuzzyMatch2: `%${searchTerm.substring(0, Math.ceil(searchTerm.length / 2))}%${searchTerm.substring(Math.ceil(searchTerm.length / 2))}%`,
          fuzzyMatch3: `%${searchTerm.substring(0, 2)}%${searchTerm.substring(2)}%`,
          partialWord: `%${searchTerm.split('').join('%')}%`,
        },
      )
      .orderBy(
        'CASE ' +
          'WHEN LOWER(s.ticker) = :exactTicker THEN 0 ' +
          'WHEN LOWER(s.ticker) LIKE :startTicker THEN 1 ' +
          'WHEN LOWER(s.name) = :exactName THEN 2 ' +
          'WHEN LOWER(s.name) LIKE :startName THEN 3 ' +
          'WHEN LOWER(s.ticker) LIKE :containsTicker THEN 4 ' +
          'WHEN LOWER(s.name) LIKE :containsName THEN 5 ' +
          'WHEN LOWER(s.name) LIKE :fuzzyName THEN 6 ' +
          'ELSE 7 END',
        'ASC',
      )
      .setParameters({
        exactTicker: searchTerm,
        startTicker: `${searchTerm}%`,
        exactName: searchTerm,
        startName: `${searchTerm}%`,
        containsTicker: `%${searchTerm}%`,
        containsName: `%${searchTerm}%`,
        fuzzyName: `%${searchTerm.split('').join('%')}%`,
      })
      .limit(10)
      .getMany();

    return searchResults.map(
      (quote) =>
        new SearchStockDto({
          symbol: quote.stock.ticker,
          name: quote.stock.name,
          price: quote.price,
          changesPercentage: quote.changesPercentage,
        }),
    );
  }

  private splitIntoBatches<T>(array: T[], batchSize: number): T[][] {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processQuoteBatch(quotes: any[]): Promise<void> {
    const quotesToSave: StockQuote[] = [];

    for (const quote of quotes) {
      const quoteDate = quote.timestamp
        ? new Date(quote.timestamp * 1000)
        : null;
      if (!quoteDate || isNaN(quoteDate.getTime())) {
        this.logger.warn(
          `Invalid timestamp for ${quote.symbol}: ${quote.timestamp}`,
        );
        continue;
      }
      this.logger.log({
        quoteDate,
      });
      const existingQuote = await this.stockQuoteRepository.findOne({
        where: { date: quoteDate, stock: { ticker: quote.symbol } },
      });

      if (existingQuote) continue;

      const stock = await this.stockRepository.findOne({
        where: { ticker: quote.symbol },
      });

      if (!stock) continue;

      const newQuote = new StockQuote();
      newQuote.date = quoteDate;
      newQuote.open = quote.open;
      newQuote.dayHigh = quote.dayHigh;
      newQuote.dayLow = quote.dayLow;
      newQuote.price = quote.price;
      newQuote.adjClose = quote.adjClose;
      newQuote.volume = quote.volume;
      newQuote.avgVolume = quote.avgVolume;
      newQuote.change = quote.change;
      newQuote.changesPercentage = quote.changesPercentage;
      newQuote.yearHigh = quote.yearHigh;
      newQuote.yearLow = quote.yearLow;
      newQuote.priceAvg50 = quote.priceAvg50;
      newQuote.priceAvg200 = quote.priceAvg200;
      newQuote.eps = quote.eps;
      newQuote.pe = quote.pe;
      newQuote.marketCap = quote.marketCap;
      newQuote.previousClose = quote.previousClose;
      newQuote.earningsAnnouncement =
        quote.earningsAnnouncement &&
        !isNaN(new Date(quote.earningsAnnouncement).getTime())
          ? new Date(quote.earningsAnnouncement)
          : null;
      newQuote.sharesOutstanding = quote.sharesOutstanding;
      newQuote.timestamp = quoteDate;
      newQuote.stock = stock;

      const embeddingText = [
        `Symbol: ${quote.symbol || 'N/A'}`,
        `Date: ${quoteDate.toISOString().split('T')[0]}`,
        `Price: ${quote.price ?? 'N/A'}`,
        `Open: ${quote.open ?? 'N/A'}`,
        `DayHigh: ${quote.dayHigh ?? 'N/A'}`,
        `DayLow: ${quote.dayLow ?? 'N/A'}`,
        `AdjClose: ${quote.adjClose ?? 'N/A'}`,
        `Volume: ${quote.volume ?? 'N/A'}`,
        `AvgVolume: ${quote.avgVolume ?? 'N/A'}`,
        `Change: ${quote.change ?? 'N/A'}`,
        `ChangesPercentage: ${quote.changesPercentage ?? 'N/A'}`,
        `YearHigh: ${quote.yearHigh ?? 'N/A'}`,
        `YearLow: ${quote.yearLow ?? 'N/A'}`,
        `PriceAvg50: ${quote.priceAvg50 ?? 'N/A'}`,
        `PriceAvg200: ${quote.priceAvg200 ?? 'N/A'}`,
        `EPS: ${quote.eps ?? 'N/A'}`,
        `PE: ${quote.pe ?? 'N/A'}`,
        `MarketCap: ${quote.marketCap ?? 'N/A'}`,
        `PreviousClose: ${quote.previousClose ?? 'N/A'}`,
        `EarningsAnnouncement: ${newQuote.earningsAnnouncement?.toISOString() ?? 'N/A'}`,
        `SharesOutstanding: ${quote.sharesOutstanding ?? 'N/A'}`,
      ].join(', ');

      await this.embeddingsService.embedAndSaveDocument({
        text: embeddingText,
        ticker: quote.symbol,
        category: 'stock_quote',
        contentDate: quoteDate,
        source: 'Financial Modeling Prep API',
        reliabilityScore: 0.9,
        date: quoteDate,
        type: 'stock',
      });

      quotesToSave.push(newQuote);
    }

    if (quotesToSave.length > 0) {
      await this.stockQuoteRepository.save(quotesToSave);
    }

    this.logger.log(`Processed batch of ${quotes.length} stock quotes.`);
  }

  /**
   * Generate and store daily market summaries
   * This method creates summary documents for exchange overview, top gainers, and top losers
   */
  async generateAndStoreMarketSummaries(): Promise<void> {
    try {
      // Get the latest date for which we have data
      const latestQuoteDate = await this.stockQuoteRepository
        .createQueryBuilder('sq')
        .select('MAX(sq.date)', 'maxDate')
        .getRawOne();

      if (!latestQuoteDate || !latestQuoteDate.maxDate) {
        this.logger.warn('No stock quotes found in the database');
        return;
      }

      const date = new Date(latestQuoteDate.maxDate);

      // Check if the latest date is today or the most recent market day
      if (!this.isLatestMarketDay(date)) {
        this.logger.warn(
          'No data available for the latest market day, skipping summary generation',
        );
        return;
      }

      // Generate and store NASDAQ market summary
      await this.generateAndStoreExchangeSummary('NASDAQ', date);

      // Generate and store top gainers summary
      await this.generateAndStoreTopGainersSummary(date);

      // Generate and store top losers summary
      await this.generateAndStoreTopLosersSummary(date);

      this.logger.log(
        `Generated and stored market summaries for ${date.toISOString().split('T')[0]}`,
      );
    } catch (error) {
      this.logger.error(`Error generating market summaries: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate and store exchange summary for a specific exchange
   * @param exchange Exchange name (e.g., 'NASDAQ')
   * @param date Date for which to generate the summary
   */
  private async generateAndStoreExchangeSummary(
    exchange: string,
    date: Date,
  ): Promise<void> {
    try {
      // Get total market stats for the exchange
      const marketStats = await this.getExchangeMarketStats(exchange, date);

      // Format the summary text
      const summaryText = this.formatExchangeSummaryText(
        exchange,
        marketStats,
        date,
      );

      // Store the summary document using the embeddings service
      await this.embeddingsService.createMarketSummaryDocument(
        exchange,
        summaryText,
        date,
      );

      this.logger.log(
        `Generated and stored ${exchange} summary for ${date.toISOString().split('T')[0]}`,
      );
    } catch (error) {
      this.logger.error(
        `Error generating ${exchange} summary: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate and store top gainers summary
   * @param date Date for which to generate the summary
   */
  private async generateAndStoreTopGainersSummary(date: Date): Promise<void> {
    try {
      // Get top gainers for the date
      const topGainers = await this.getTopGainers();

      if (topGainers.length === 0) {
        this.logger.warn(
          `No top gainers found for ${date.toISOString().split('T')[0]}`,
        );
        return;
      }

      // Format the top gainers summary text
      const summaryText = this.formatTopGainersSummaryText(topGainers, date);

      // Store the summary document using the embeddings service
      await this.embeddingsService.createTopMoversDocument(
        'top_gainers',
        summaryText,
        date,
      );

      this.logger.log(
        `Generated and stored top gainers summary for ${date.toISOString().split('T')[0]}`,
      );
    } catch (error) {
      this.logger.error(
        `Error generating top gainers summary: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate and store top losers summary
   * @param date Date for which to generate the summary
   */
  private async generateAndStoreTopLosersSummary(date: Date): Promise<void> {
    try {
      // Get top losers for the date
      const topLosers = await this.getTopLosers();

      if (topLosers.length === 0) {
        this.logger.warn(
          `No top losers found for ${date.toISOString().split('T')[0]}`,
        );
        return;
      }

      // Format the top losers summary text
      const summaryText = this.formatTopLosersSummaryText(topLosers, date);

      // Store the summary document using the embeddings service
      await this.embeddingsService.createTopMoversDocument(
        'top_losers',
        summaryText,
        date,
      );

      this.logger.log(
        `Generated and stored top losers summary for ${date.toISOString().split('T')[0]}`,
      );
    } catch (error) {
      this.logger.error(
        `Error generating top losers summary: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get top losing stocks
   * @returns Array of stock quotes ordered by percentage change (worst performers first)
   */
  async getTopLosers(): Promise<StockQuote[]> {
    // Get the most recent date for which we have stock quotes
    const latestQuoteDate = await this.stockQuoteRepository
      .createQueryBuilder('sq')
      .select('MAX(sq.date)', 'maxDate')
      .getRawOne();

    if (!latestQuoteDate || !latestQuoteDate.maxDate) {
      this.logger.warn('No stock quotes found in the database');
      return [];
    }

    // Check if the latest date is today or the most recent market day
    if (!this.isLatestMarketDay(new Date(latestQuoteDate.maxDate))) {
      this.logger.warn('No data available for the latest market day');
      return [];
    }

    return this.stockQuoteRepository
      .createQueryBuilder('sq')
      .innerJoinAndSelect('sq.stock', 's')
      .where('sq.date = :date', { date: latestQuoteDate.maxDate })
      .andWhere('sq.marketCap > 100000000')
      .andWhere('sq.marketCap IS NOT NULL')
      .andWhere('sq.price > 5')
      .andWhere('sq.price IS NOT NULL')
      .andWhere('sq.volume IS NOT NULL')
      .andWhere('sq.avgVolume > 100000')
      .andWhere('sq.change IS NOT NULL')
      .andWhere('sq.changesPercentage IS NOT NULL')
      .orderBy('sq.changesPercentage', 'ASC')
      .limit(10)
      .getMany();
  }

  /**
   * Get exchange market statistics for a given date
   * @param exchange Exchange name
   * @param date Date for the statistics
   * @returns Object with market statistics
   */
  private async getExchangeMarketStats(
    exchange: string,
    date: Date,
  ): Promise<any> {
    const MIN_PRICE = 5; // Minimum price threshold to filter out penny stocks
    const MIN_MARKET_CAP = 100000000; // Minimum market cap of $100M

    // Get the total number of advancing, declining, and unchanged stocks
    const baseQuery = this.stockQuoteRepository
      .createQueryBuilder('sq')
      .innerJoin('sq.stock', 's')
      .where('sq.date = :date', { date })
      .andWhere('s.exchange = :exchange', { exchange })
      .andWhere('sq.price IS NOT NULL')
      .andWhere('sq.price >= :minPrice', { minPrice: MIN_PRICE })
      .andWhere('sq.change IS NOT NULL')
      .andWhere('sq.marketCap IS NOT NULL')
      .andWhere('sq.marketCap >= :minMarketCap', {
        minMarketCap: MIN_MARKET_CAP,
      })
      .andWhere('sq.volume IS NOT NULL')
      .andWhere('sq.avgVolume > 100000');

    const advancingCount = await baseQuery
      .clone()
      .andWhere('sq.changesPercentage > 0')
      .getCount();
    const decliningCount = await baseQuery
      .clone()
      .andWhere('sq.changesPercentage < 0')
      .getCount();
    const unchangedCount = await baseQuery
      .clone()
      .andWhere('ABS(sq.changesPercentage) < 0.0001')
      .getCount();

    // Calculate total market cap and average P/E ratio
    const marketCapResult = await this.stockQuoteRepository
      .createQueryBuilder('sq')
      .innerJoin('sq.stock', 's')
      .select('SUM(sq.marketCap)', 'totalMarketCap')
      .addSelect('AVG(sq.pe)', 'averagePE')
      .where('sq.date = :date', { date })
      .andWhere('s.exchange = :exchange', { exchange })
      .andWhere('sq.marketCap IS NOT NULL')
      .andWhere('sq.marketCap >= :minMarketCap', {
        minMarketCap: MIN_MARKET_CAP,
      })
      .andWhere('sq.pe > 0')
      .andWhere('sq.price IS NOT NULL')
      .andWhere('sq.price >= :minPrice', { minPrice: MIN_PRICE })
      .andWhere('sq.volume IS NOT NULL')
      .andWhere('sq.avgVolume > 100000')
      .andWhere('sq.change IS NOT NULL')
      .getRawOne();

    // Get average volume
    const volumeResult = await this.stockQuoteRepository
      .createQueryBuilder('sq')
      .innerJoin('sq.stock', 's')
      .select('SUM(sq.volume)', 'totalVolume')
      .where('sq.date = :date', { date })
      .andWhere('s.exchange = :exchange', { exchange })
      .andWhere('sq.volume IS NOT NULL')
      .andWhere('sq.price IS NOT NULL')
      .andWhere('sq.price >= :minPrice', { minPrice: MIN_PRICE })
      .andWhere('sq.marketCap IS NOT NULL')
      .andWhere('sq.marketCap >= :minMarketCap', {
        minMarketCap: MIN_MARKET_CAP,
      })
      .andWhere('sq.avgVolume > 100000')
      .getRawOne();

    // Get previous day stats for comparison
    const previousDate = new Date(date);
    previousDate.setDate(previousDate.getDate() - 1);

    const previousDayStats = await this.stockQuoteRepository
      .createQueryBuilder('sq')
      .innerJoin('sq.stock', 's')
      .select('AVG(sq.price)', 'averagePrice')
      .addSelect('SUM(sq.marketCap)', 'totalMarketCap')
      .where('sq.date = :date', { date: previousDate })
      .andWhere('s.exchange = :exchange', { exchange })
      .andWhere('sq.marketCap IS NOT NULL')
      .andWhere('sq.marketCap >= :minMarketCap', {
        minMarketCap: MIN_MARKET_CAP,
      })
      .andWhere('sq.price IS NOT NULL')
      .andWhere('sq.price >= :minPrice', { minPrice: MIN_PRICE })
      .andWhere('sq.avgVolume > 100000')
      .getRawOne();

    this.logger.log({
      advancingCount,
      decliningCount,
      unchangedCount,
      marketCapResult,
      volumeResult,
      previousDayStats,
    });

    return {
      date,
      exchange,
      advancingCount: Number(advancingCount) || 0,
      decliningCount: Number(decliningCount) || 0,
      unchangedCount: Number(unchangedCount) || 0,
      totalMarketCap: Number(marketCapResult?.totalMarketCap) || 0,
      averagePE: Number(marketCapResult?.averagePE) || 0,
      totalVolume: Number(volumeResult?.totalVolume) || 0,
      previousDayTotalMarketCap: Number(previousDayStats?.totalMarketCap) || 0,
      previousDayAveragePrice: Number(previousDayStats?.averagePrice) || 0,
    };
  }

  /**
   * Format exchange summary text based on market statistics
   * @param exchange Exchange name
   * @param stats Market statistics object
   * @param date Date for the summary
   * @returns Formatted summary text
   */
  private formatExchangeSummaryText(
    exchange: string,
    stats: any,
    date: Date,
  ): string {
    const dateStr = date.toISOString().split('T')[0];

    // Safely format numerical values
    const totalMarketCap =
      typeof stats.totalMarketCap === 'number' ? stats.totalMarketCap : 0;
    const previousMarketCap =
      typeof stats.previousDayTotalMarketCap === 'number'
        ? stats.previousDayTotalMarketCap
        : 0;
    const formattedMarketCap = (totalMarketCap / 1000000000000).toFixed(2);

    // Calculate percent change safely (avoid division by zero)
    let marketCapChangePercent = 0;
    if (previousMarketCap > 0) {
      marketCapChangePercent =
        ((totalMarketCap - previousMarketCap) / previousMarketCap) * 100;
    }
    const formattedChangePercent = marketCapChangePercent.toFixed(2);

    // Format other metrics safely
    const averagePE =
      typeof stats.averagePE === 'number' ? stats.averagePE.toFixed(2) : 'N/A';
    const totalVolume =
      typeof stats.totalVolume === 'number'
        ? (stats.totalVolume / 1000000).toFixed(2)
        : 'N/A';

    // Calculate advance/decline ratio (avoid division by zero)
    const advancingCount = Number(stats.advancingCount) || 0;
    const decliningCount = Number(stats.decliningCount) || 0;
    const advanceDeclineRatio =
      decliningCount > 0
        ? (advancingCount / decliningCount).toFixed(2)
        : advancingCount > 0
          ? 'Infinite'
          : 'N/A';

    let marketBreadth;
    if (advancingCount > decliningCount * 1.5) {
      marketBreadth = 'very positive';
    } else if (advancingCount > decliningCount) {
      marketBreadth = 'positive';
    } else if (decliningCount > advancingCount * 1.5) {
      marketBreadth = 'very negative';
    } else if (decliningCount > advancingCount) {
      marketBreadth = 'negative';
    } else {
      marketBreadth = 'neutral';
    }

    return `${exchange} Market Summary for ${dateStr}

Overall Performance:
- Total Market Capitalization: $${formattedMarketCap} trillion (${formattedChangePercent}% change)
- Average P/E Ratio: ${averagePE}
- Total Trading Volume: ${totalVolume} million shares

Market Breadth:
- Advancing Stocks: ${stats.advancingCount}
- Declining Stocks: ${stats.decliningCount}
- Unchanged Stocks: ${stats.unchangedCount}
- Advance/Decline Ratio: ${advanceDeclineRatio}
- Overall Market Breadth: ${marketBreadth}

Market Sentiment:
The ${exchange} showed ${marketBreadth} breadth on ${dateStr} with ${stats.advancingCount} advancing stocks versus ${stats.decliningCount} declining stocks. The total market capitalization ${marketCapChangePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(marketCapChangePercent).toFixed(2)}% compared to the previous trading day.
    `;
  }

  /**
   * Format top gainers summary text
   * @param topGainers Array of top gaining stocks
   * @param date Date for the summary
   * @returns Formatted summary text
   */
  private formatTopGainersSummaryText(
    topGainers: StockQuote[],
    date: Date,
  ): string {
    const dateStr = date.toISOString().split('T')[0];

    let summaryText = `Top Gainers on ${dateStr}\n\n`;

    // Filter out entries with missing critical data
    const validGainers = topGainers.filter(
      (quote) =>
        quote.price &&
        quote.change &&
        quote.changesPercentage &&
        quote.volume &&
        quote.marketCap,
    );

    validGainers.forEach((quote, index) => {
      summaryText += `${index + 1}. ${quote.stock.ticker} (${quote.stock.name})\n`;
      summaryText += `   Price: $${Number(quote.price).toFixed(2)} | Change: +$${Number(quote.change).toFixed(2)} (+${Number(quote.changesPercentage).toFixed(2)}%)\n`;
      summaryText += `   Volume: ${(Number(quote.volume) / 1000000).toFixed(2)}M | Market Cap: $${(Number(quote.marketCap) / 1000000000).toFixed(2)}B\n\n`;
    });

    // Calculate average gain only if we have valid data
    const avgGain =
      validGainers.length > 0
        ? validGainers.reduce(
            (sum, quote) => sum + Number(quote.changesPercentage),
            0,
          ) / validGainers.length
        : 0;

    if (validGainers.length > 0) {
      summaryText += `\nSummary: The top ${validGainers.length} gainers on ${dateStr} had an average gain of ${avgGain.toFixed(2)}%. `;
      summaryText += `${validGainers[0].stock.ticker} led with a gain of ${Number(validGainers[0].changesPercentage).toFixed(2)}%, `;
      summaryText += `while ${validGainers[validGainers.length - 1].stock.ticker} rounded out the list with a gain of ${Number(validGainers[validGainers.length - 1].changesPercentage).toFixed(2)}%.`;
    } else {
      summaryText += `\nNo valid gainer data available for ${dateStr}.`;
    }

    return summaryText;
  }

  /**
   * Format top losers summary text
   * @param topLosers Array of top losing stocks
   * @param date Date for the summary
   * @returns Formatted summary text
   */
  private formatTopLosersSummaryText(
    topLosers: StockQuote[],
    date: Date,
  ): string {
    const dateStr = date.toISOString().split('T')[0];

    let summaryText = `Top Losers on ${dateStr}\n\n`;

    // Filter out entries with missing critical data
    const validLosers = topLosers.filter(
      (quote) =>
        quote.price &&
        quote.change &&
        quote.changesPercentage &&
        quote.volume &&
        quote.marketCap,
    );

    validLosers.forEach((quote, index) => {
      summaryText += `${index + 1}. ${quote.stock.ticker} (${quote.stock.name})\n`;
      summaryText += `   Price: $${Number(quote.price).toFixed(2)} | Change: -$${Math.abs(Number(quote.change)).toFixed(2)} (${Number(quote.changesPercentage).toFixed(2)}%)\n`;
      summaryText += `   Volume: ${(Number(quote.volume) / 1000000).toFixed(2)}M | Market Cap: $${(Number(quote.marketCap) / 1000000000).toFixed(2)}B\n\n`;
    });

    // Calculate average loss only if we have valid data
    const avgLoss =
      validLosers.length > 0
        ? validLosers.reduce(
            (sum, quote) => sum + Number(quote.changesPercentage),
            0,
          ) / validLosers.length
        : 0;

    if (validLosers.length > 0) {
      summaryText += `\nSummary: The top ${validLosers.length} losers on ${dateStr} had an average loss of ${Math.abs(avgLoss).toFixed(2)}%. `;
      summaryText += `${validLosers[0].stock.ticker} led with a loss of ${Number(validLosers[0].changesPercentage).toFixed(2)}%, `;
      summaryText += `while ${validLosers[validLosers.length - 1].stock.ticker} rounded out the list with a loss of ${Number(validLosers[validLosers.length - 1].changesPercentage).toFixed(2)}%.`;
    } else {
      summaryText += `\nNo valid loser data available for ${dateStr}.`;
    }

    return summaryText;
  }

  /**
   * Checks if a date is the latest market day (ignoring weekends and holidays)
   * @param date Date to check
   * @returns boolean indicating if the date is the latest market day
   */
  private isLatestMarketDay(date: Date): boolean {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Reset hours to compare just the dates
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    // If today is Sunday (0), the latest market day would be Friday (date - 2)
    if (dayOfWeek === 0) {
      const fridayDate = new Date(today);
      fridayDate.setDate(today.getDate() - 2);
      return compareDate.getTime() === fridayDate.getTime();
    }

    // If today is Saturday (6), the latest market day would be Friday (date - 1)
    if (dayOfWeek === 6) {
      const fridayDate = new Date(today);
      fridayDate.setDate(today.getDate() - 1);
      return compareDate.getTime() === fridayDate.getTime();
    }

    // If today is Monday-Friday, the latest market day would be either today
    // or the previous day if today's data is not yet available
    if (compareDate.getTime() === today.getTime()) {
      return true;
    }

    // If data is from yesterday (and today is a weekday), that's acceptable
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (compareDate.getTime() === yesterday.getTime()) {
      // For Monday, Friday would be the previous market day
      if (dayOfWeek === 1) {
        const fridayDate = new Date(today);
        fridayDate.setDate(today.getDate() - 3);
        return compareDate.getTime() === fridayDate.getTime();
      }
      return true;
    }

    // Otherwise, it's not the latest market day
    return false;
  }

  async getMarketSummary(date: Date): Promise<MarketSummaryResponseDto> {
    const stats = await this.getExchangeMarketStats('NASDAQ', date);
    const compositeData = await this.getNasdaqComposite();

    // Calculate market breadth sentiment
    const sentiment = this.calculateMarketSentiment(
      stats.advancingCount,
      stats.decliningCount,
    );

    this.logger.log({
      stats,
      compositeData,
      sentiment,
    });

    // Format the response according to the DTO
    const response: MarketSummaryResponseDto = {
      date: date.toISOString().split('T')[0],
      exchange: 'NASDAQ',
      compositeIndex: {
        price: Number(compositeData.price),
        change: Number(compositeData.change),
        changePercent: Number(compositeData.changesPercentage),
        volume: Number(compositeData.volume),
      },
      stats: {
        totalMarketCap: Number(stats.totalMarketCap),
        marketCapChangePercent: this.calculatePercentChange(
          stats.totalMarketCap,
          stats.previousDayTotalMarketCap,
        ),
        averagePE: Number(stats.averagePE),
        totalVolume: Number(stats.totalVolume),
        advancingStocks: Number(stats.advancingCount),
        decliningStocks: Number(stats.decliningCount),
        unchangedStocks: Number(stats.unchangedCount),
        advanceDeclineRatio:
          Number(stats.advancingCount) / Number(stats.decliningCount),
      },
      breadth: {
        sentiment,
        advancingCount: Number(stats.advancingCount),
        decliningCount: Number(stats.decliningCount),
        unchangedCount: Number(stats.unchangedCount),
        advanceDeclineRatio:
          Number(stats.advancingCount) / Number(stats.decliningCount),
      },
      timestamp: Math.floor(date.getTime() / 1000),
    };

    return response;
  }

  private calculateMarketSentiment(
    advancingCount: number,
    decliningCount: number,
  ): MarketBreadth['sentiment'] {
    if (advancingCount > decliningCount * 1.5) return 'very positive';
    if (advancingCount > decliningCount) return 'positive';
    if (decliningCount > advancingCount * 1.5) return 'very negative';
    if (decliningCount > advancingCount) return 'negative';
    return 'neutral';
  }

  private calculatePercentChange(current: number, previous: number): number {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  }

  private async getNasdaqComposite(): Promise<any> {
    try {
      const latestQuoteDate = await this.stockQuoteRepository
        .createQueryBuilder('sq')
        .select('MAX(sq.date)', 'maxDate')
        .getRawOne();

      if (!latestQuoteDate?.maxDate) {
        throw new Error('No quotes found');
      }

      // Get current day's total market cap and volume
      const currentDayStats = await this.stockQuoteRepository
        .createQueryBuilder('sq')
        .innerJoin('sq.stock', 's')
        .select('SUM(sq.marketCap)', 'total_market_cap')
        .addSelect('SUM(sq.volume)', 'total_volume')
        .where('sq.date = :date', { date: latestQuoteDate.maxDate })
        .andWhere('s.exchange = :exchange', { exchange: 'NASDAQ' })
        .andWhere('sq.marketCap IS NOT NULL')
        .andWhere('sq.marketCap >= :minMarketCap', { minMarketCap: 100000000 })
        .andWhere('sq.price >= :minPrice', { minPrice: 5 })
        .getRawOne();

      // Get previous day's total market cap for comparison
      const previousDate = new Date(latestQuoteDate.maxDate);
      previousDate.setDate(previousDate.getDate() - 1);

      const previousDayStats = await this.stockQuoteRepository
        .createQueryBuilder('sq')
        .innerJoin('sq.stock', 's')
        .select('SUM(sq.marketCap)', 'total_market_cap')
        .where('sq.date = :date', { date: previousDate })
        .andWhere('s.exchange = :exchange', { exchange: 'NASDAQ' })
        .andWhere('sq.marketCap IS NOT NULL')
        .andWhere('sq.marketCap >= :minMarketCap', { minMarketCap: 100000000 })
        .andWhere('sq.price >= :minPrice', { minPrice: 5 })
        .getRawOne();

      const currentMarketCap = Number(currentDayStats?.total_market_cap) || 0;
      const previousMarketCap = Number(previousDayStats?.total_market_cap) || 0;
      const change = currentMarketCap - previousMarketCap;
      const changesPercentage = previousMarketCap
        ? (change / previousMarketCap) * 100
        : 0;

      this.logger.log({
        prev: currentMarketCap,
        current: previousMarketCap,
        change,
        changesPercentage,
      });

      return {
        price: currentMarketCap / 1e12, // Convert to trillions for readability
        change: change / 1e12,
        changesPercentage,
        volume: Number(currentDayStats?.total_volume) || 0,
      };
    } catch (error) {
      this.logger.error(`Error calculating NASDAQ Composite: ${error.message}`);
      return {
        price: 0,
        change: 0,
        changesPercentage: 0,
        volume: 0,
      };
    }
  }
}
