import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import yahooFinance from 'yahoo-finance2';
import {
  formatNumber,
  formatTrillion,
  formatVolume,
} from '../../utils/formatData';
import { EmbeddingsService } from '../embedding/embeddings.service';
import { StockQuote } from '../stockquote/stock-quote.entity';
import { STOCK_EXCHANGE, STOCK_TYPE } from './constants';
import { MarketBreadthDto, MarketStatsDto } from './dtos/market-stats.dto';
import { MarketSummaryResponseDto } from './dtos/market-summary.dto';
import { SearchStockDto } from './dtos/search-stock.dto';
import { Stock } from './stock.entity';

interface YahooFinanceResult {
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketPreviousClose: number;
  regularMarketOpen: number;
  marketState: string;
  regularMarketTime: Date;
  fiftyDayAverage: number;
  twoHundredDayAverage: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  averageDailyVolume3Month: number;
  averageDailyVolume10Day: number;
  exchangeTimezoneName: string;
  exchangeTimezoneShortName: string;
  marketCap: number;
}

interface CompositeData {
  price: number;
  change: number;
  changesPercentage: number;
  volume: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  open: number;
  marketState: string;
  timestamp: number;
  fiftyDayAverage: number;
  twoHundredDayAverage: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  averageDailyVolume3Month: number;
  averageDailyVolume10Day: number;
  exchangeTimezoneName: string;
  exchangeTimezoneShortName: string;
  stats: MarketStatsDto;
  sentiment: MarketBreadthDto['sentiment'];
}

interface MarketStats {
  date: Date;
  exchange: string;
  advancingCount: number;
  decliningCount: number;
  unchangedCount: number;
  totalMarketCap: number;
  averagePE: number;
  previousDayTotalMarketCap: number;
}

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
      const latestQuoteDate = await this.stockQuoteRepository
        .createQueryBuilder('sq')
        .select('MAX(sq.date)', 'maxDate')
        .getRawOne();

      if (!latestQuoteDate || !latestQuoteDate.maxDate) {
        this.logger.warn('No stock quotes found in the database');
        return;
      }

      const date = new Date(latestQuoteDate.maxDate);

      if (!this.isLatestMarketDay(date)) {
        this.logger.warn(
          'No data available for the latest market day, skipping summary generation',
        );
        return;
      }

      await this.generateAndStoreMarketSummary(date);

      await this.generateAndStoreTopGainersSummary(date);

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
   * Generate and store top gainers summary
   * @param date Date for which to generate the summary
   */
  private async generateAndStoreTopGainersSummary(date: Date): Promise<void> {
    try {
      const topGainers = await this.getTopGainers();

      if (topGainers.length === 0) {
        this.logger.warn(
          `No top gainers found for ${date.toISOString().split('T')[0]}`,
        );
        return;
      }

      const summaryText = this.formatTopGainersSummaryText(topGainers, date);

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
      const topLosers = await this.getTopLosers();

      if (topLosers.length === 0) {
        this.logger.warn(
          `No top losers found for ${date.toISOString().split('T')[0]}`,
        );
        return;
      }

      const summaryText = this.formatTopLosersSummaryText(topLosers, date);

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
    const latestQuoteDate = await this.stockQuoteRepository
      .createQueryBuilder('sq')
      .select('MAX(sq.date)', 'maxDate')
      .getRawOne();

    if (!latestQuoteDate || !latestQuoteDate.maxDate) {
      this.logger.warn('No stock quotes found in the database');
      return [];
    }

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
  ): Promise<MarketStats> {
    const MIN_PRICE = 5;
    const MIN_MARKET_CAP = 100000000;

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

    const [advancingCount, decliningCount, unchangedCount] = await Promise.all([
      baseQuery.clone().andWhere('sq.changesPercentage > 0').getCount(),
      baseQuery.clone().andWhere('sq.changesPercentage < 0').getCount(),
      baseQuery
        .clone()
        .andWhere('ABS(sq.changesPercentage) < 0.0001')
        .getCount(),
    ]);

    const marketData = await baseQuery
      .clone()
      .select([
        'SUM(CASE WHEN sq.marketCap IS NOT NULL THEN sq.marketCap ELSE 0 END) as "totalMarketCap"',
        'AVG(CASE WHEN sq.pe IS NOT NULL THEN sq.pe END) as "averagePE"',
      ])
      .getRawOne();

    const previousDay = new Date(date);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDayData = await baseQuery
      .clone()
      .where('sq.date = :previousDate', { previousDate: previousDay })
      .select([
        'SUM(CASE WHEN sq.marketCap IS NOT NULL THEN sq.marketCap ELSE 0 END) as "totalMarketCap"',
      ])
      .getRawOne();

    return {
      date,
      exchange,
      advancingCount: Number(advancingCount) || 0,
      decliningCount: Number(decliningCount) || 0,
      unchangedCount: Number(unchangedCount) || 0,
      totalMarketCap: Number(marketData?.totalMarketCap) || 0,
      averagePE: Number(marketData?.averagePE) || 0,
      previousDayTotalMarketCap: Number(previousDayData?.totalMarketCap) || 0,
    };
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

    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (dayOfWeek === 0) {
      const fridayDate = new Date(today);
      fridayDate.setDate(today.getDate() - 2);
      return compareDate.getTime() === fridayDate.getTime();
    }

    if (dayOfWeek === 6) {
      const fridayDate = new Date(today);
      fridayDate.setDate(today.getDate() - 1);
      return compareDate.getTime() === fridayDate.getTime();
    }

    if (compareDate.getTime() === today.getTime()) {
      return true;
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (compareDate.getTime() === yesterday.getTime()) {
      if (dayOfWeek === 1) {
        const fridayDate = new Date(today);
        fridayDate.setDate(today.getDate() - 3);
        return compareDate.getTime() === fridayDate.getTime();
      }
      return true;
    }

    return false;
  }

  async getMarketSummary(date: Date): Promise<MarketSummaryResponseDto> {
    const compositeData = await this.getNasdaqComposite();

    const response: MarketSummaryResponseDto = {
      date: date.toISOString().split('T')[0],
      exchange: STOCK_EXCHANGE.NASDAQ,
      compositeIndex: {
        price: Number(compositeData.price),
        change: Number(compositeData.change),
        changePercent: Number(compositeData.changesPercentage),
        volume: Number(compositeData.volume),
      },
      stats: {
        totalMarketCap: Number(compositeData.stats.totalMarketCap),
        marketCapChangePercent: Number(
          compositeData.stats.marketCapChangePercent,
        ),
        averagePE: Number(compositeData.stats.averagePE),
        totalVolume: Number(compositeData.stats.totalVolume),
        advancingStocks: Number(compositeData.stats.advancingStocks),
        decliningStocks: Number(compositeData.stats.decliningStocks),
        unchangedStocks: Number(compositeData.stats.unchangedStocks),
        advanceDeclineRatio: Number(compositeData.stats.advanceDeclineRatio),
      },
      breadth: {
        sentiment: compositeData.sentiment,
        advancingCount: Number(compositeData.stats.advancingStocks),
        decliningCount: Number(compositeData.stats.decliningStocks),
        unchangedCount: Number(compositeData.stats.unchangedStocks),
        advanceDeclineRatio: Number(compositeData.stats.advanceDeclineRatio),
      },
      timestamp: compositeData.timestamp,
    };

    return response;
  }

  private calculateMarketSentiment(
    advancingCount: number,
    decliningCount: number,
  ): MarketBreadthDto['sentiment'] {
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

  private async getNasdaqComposite(): Promise<CompositeData> {
    try {
      const result = (await yahooFinance.quote(
        '^IXIC',
      )) as unknown as YahooFinanceResult;

      const latestQuoteDate = await this.stockQuoteRepository
        .createQueryBuilder('sq')
        .select('MAX(sq.date)', 'maxDate')
        .getRawOne();

      if (!latestQuoteDate || !latestQuoteDate.maxDate) {
        this.logger.warn('No stock quotes found in the database');
        return this.getDefaultCompositeData();
      }

      const marketStats = await this.getExchangeMarketStats(
        STOCK_EXCHANGE.NASDAQ,
        latestQuoteDate.maxDate,
      );

      const sentiment = this.calculateMarketSentimentFromPrice(
        result.regularMarketPrice,
        result.regularMarketPreviousClose,
      );

      return {
        price: result.regularMarketPrice,
        change: result.regularMarketChange,
        changesPercentage: result.regularMarketChangePercent,
        volume: result.regularMarketVolume,
        dayHigh: result.regularMarketDayHigh,
        dayLow: result.regularMarketDayLow,
        previousClose: result.regularMarketPreviousClose,
        open: result.regularMarketOpen,
        marketState: result.marketState,
        timestamp: new Date(result.regularMarketTime).getTime() / 1000,
        fiftyDayAverage: result.fiftyDayAverage,
        twoHundredDayAverage: result.twoHundredDayAverage,
        fiftyTwoWeekHigh: result.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: result.fiftyTwoWeekLow,
        averageDailyVolume3Month: result.averageDailyVolume3Month,
        averageDailyVolume10Day: result.averageDailyVolume10Day,
        exchangeTimezoneName: result.exchangeTimezoneName,
        exchangeTimezoneShortName: result.exchangeTimezoneShortName,
        stats: {
          totalMarketCap: marketStats.totalMarketCap,
          marketCapChangePercent:
            marketStats.previousDayTotalMarketCap > 0
              ? ((marketStats.totalMarketCap -
                  marketStats.previousDayTotalMarketCap) /
                  marketStats.previousDayTotalMarketCap) *
                100
              : 0,
          averagePE: marketStats.averagePE,
          totalVolume: result.regularMarketVolume || 0,
          advancingStocks: marketStats.advancingCount,
          decliningStocks: marketStats.decliningCount,
          unchangedStocks: marketStats.unchangedCount,
          advanceDeclineRatio:
            marketStats.decliningCount > 0
              ? marketStats.advancingCount / marketStats.decliningCount
              : marketStats.advancingCount > 0
                ? Infinity
                : 0,
        },
        sentiment,
      };
    } catch (error) {
      this.logger.error(`Error fetching NASDAQ Composite: ${error.message}`);
      return this.getDefaultCompositeData();
    }
  }

  private getDefaultCompositeData(): CompositeData {
    return {
      price: 0,
      change: 0,
      changesPercentage: 0,
      volume: 0,
      dayHigh: 0,
      dayLow: 0,
      previousClose: 0,
      open: 0,
      marketState: 'CLOSED',
      timestamp: Math.floor(Date.now() / 1000),
      fiftyDayAverage: 0,
      twoHundredDayAverage: 0,
      fiftyTwoWeekHigh: 0,
      fiftyTwoWeekLow: 0,
      averageDailyVolume3Month: 0,
      averageDailyVolume10Day: 0,
      exchangeTimezoneName: 'America/New_York',
      exchangeTimezoneShortName: 'EDT',
      stats: {
        totalMarketCap: 0,
        marketCapChangePercent: 0,
        averagePE: 0,
        totalVolume: 0,
        advancingStocks: 0,
        decliningStocks: 0,
        unchangedStocks: 0,
        advanceDeclineRatio: 0,
      },
      sentiment: 'neutral',
    };
  }

  private calculateMarketSentimentFromPrice(
    currentPrice: number,
    previousClose: number,
  ): MarketBreadthDto['sentiment'] {
    const changePercent =
      ((currentPrice - previousClose) / previousClose) * 100;

    if (changePercent > 1.5) return 'very positive';
    if (changePercent > 0.5) return 'positive';
    if (changePercent < -1.5) return 'very negative';
    if (changePercent < -0.5) return 'negative';
    return 'neutral';
  }

  private async generateAndStoreMarketSummary(date: Date): Promise<void> {
    try {
      const compositeData = await this.getNasdaqComposite();
      const summaryText = this.formatMarketSummaryText(compositeData, date);

      await this.embeddingsService.createMarketSummaryDocument(
        STOCK_EXCHANGE.NASDAQ,
        summaryText,
        date,
      );

      this.logger.log(
        `Generated and stored market summary for ${date.toISOString().split('T')[0]}`,
      );
    } catch (error) {
      this.logger.error(`Error generating market summary: ${error.message}`);
      throw error;
    }
  }

  private formatMarketSummaryText(
    compositeData: CompositeData,
    date: Date,
  ): string {
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = compositeData.timestamp
      ? new Date(compositeData.timestamp * 1000).toLocaleTimeString('en-US', {
          timeZone: compositeData.exchangeTimezoneName || 'America/New_York',
        })
      : 'N/A';

    return `NASDAQ Market Summary for ${dateStr} at ${timeStr}

Index Performance:
- NASDAQ Composite: ${formatNumber(compositeData.price)} (${formatNumber(compositeData.changesPercentage)}%)
- Day Range: ${formatNumber(compositeData.dayLow)} - ${formatNumber(compositeData.dayHigh)}
- Open: ${formatNumber(compositeData.open)} | Previous Close: ${formatNumber(compositeData.previousClose)}
- Volume: ${formatVolume(compositeData.volume)}M shares

Market Averages:
- 50-Day Average: ${formatNumber(compositeData.fiftyDayAverage)}
- 200-Day Average: ${formatNumber(compositeData.twoHundredDayAverage)}
- 52-Week Range: ${formatNumber(compositeData.fiftyTwoWeekLow)} - ${formatNumber(compositeData.fiftyTwoWeekHigh)}

Market Breadth:
- Advancing Stocks: ${compositeData.stats.advancingStocks || 0}
- Declining Stocks: ${compositeData.stats.decliningStocks || 0}
- Unchanged Stocks: ${compositeData.stats.unchangedStocks || 0}
- Advance/Decline Ratio: ${compositeData.stats.decliningStocks ? (compositeData.stats.advancingStocks / compositeData.stats.decliningStocks).toFixed(2) : 'N/A'}
- Market Sentiment: ${compositeData.sentiment || 'neutral'}

Market Statistics:
- Total Market Cap: $${formatTrillion(compositeData.stats.totalMarketCap)}T
- Market Cap Change: ${formatNumber(compositeData.stats.marketCapChangePercent)}%
- Average P/E Ratio: ${formatNumber(compositeData.stats.averagePE)}
- Total Volume: ${formatVolume(compositeData.stats.totalVolume)}M shares

Market State: ${compositeData.marketState || 'UNKNOWN'}
Exchange Timezone: ${compositeData.exchangeTimezoneName || 'America/New_York'} (${compositeData.exchangeTimezoneShortName || 'EDT'})`;
  }
}
