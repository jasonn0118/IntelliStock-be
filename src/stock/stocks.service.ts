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
import { CompaniesService } from '../company/companies.service';
import { Company } from '../company/company.entity';
import { EmbeddingsService } from '../embedding/embeddings.service';
import { StockQuote } from '../stockquote/stock-quote.entity';
import { StockStatistic } from '../stockstatistic/stock-statistic.entity';
import { StockStatisticService } from '../stockstatistic/stock-statistic.service';
import { STOCK_EXCHANGE, STOCK_TYPE } from './constants';
import { MarketBreadthDto, MarketStatsDto } from './dtos/market-stats.dto';
import { MarketSummaryResponseDto } from './dtos/market-summary.dto';
import { SearchStockDto } from './dtos/search-stock.dto';
import { TopStockDto, TopStocksResponseDto } from './dtos/top-stock.dto';
import { AiMarketAnalysisService } from './services/ai-market-analysis.service';
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
    @InjectRepository(StockStatistic)
    private stockStatisticRepository: Repository<StockStatistic>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly aiMarketAnalysisService: AiMarketAnalysisService,
    private readonly companiesService: CompaniesService,
    private readonly stockStatisticService: StockStatisticService,
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
      const allQuotes: Record<string, unknown>[] = response.data;

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
      .leftJoinAndSelect('s.company', 'c')
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
      .leftJoinAndSelect('s.company', 'c')
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

  /**
   * Get detailed stock information by ticker symbol
   * @param ticker Stock ticker symbol
   * @returns Stock entity with company details, latest quote, and statistics
   */
  async getStock(ticker: string): Promise<Stock> {
    // Find the stock with eager loading of company
    const stock = await this.stockRepository.findOne({
      where: { ticker },
      relations: ['company'],
    });

    if (!stock) {
      return null;
    }

    // Get the latest quote with statistics in a single query
    const latestQuote = await this.stockQuoteRepository
      .createQueryBuilder('sq')
      .innerJoinAndSelect('sq.stock', 's')
      .leftJoinAndSelect('sq.statistic', 'ss') // Use the one-to-one relationship
      .where('s.ticker = :ticker', { ticker })
      .orderBy('sq.date', 'DESC')
      .limit(1)
      .getOne();

    if (latestQuote) {
      stock.quotes = [latestQuote];

      // If we have a statistic attached to this quote, add it to the stock
      if (latestQuote.statistic) {
        stock.statistics = [latestQuote.statistic];
      }
    }

    return stock;
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

  /**
   * Process a batch of quotes from the API
   * @param quotes Array of quotes to process
   */
  private async processQuoteBatch(
    quotes: Record<string, unknown>[],
  ): Promise<void> {
    for (const quote of quotes) {
      const quoteDate = quote.timestamp
        ? new Date((quote.timestamp as number) * 1000)
        : null;
      if (!quoteDate || isNaN(quoteDate.getTime())) {
        this.logger.warn(
          `Invalid timestamp for ${quote.symbol}: ${quote.timestamp}`,
        );
        continue;
      }
      const existingQuote = await this.stockQuoteRepository.findOne({
        where: { date: quoteDate, stock: { ticker: quote.symbol as string } },
      });

      if (existingQuote) continue;

      const stock = await this.stockRepository.findOne({
        where: { ticker: quote.symbol as string },
      });

      if (!stock) continue;

      try {
        const yahooData = await yahooFinance.quoteSummary(
          quote.symbol as string,
          {
            modules: ['defaultKeyStatistics', 'assetProfile'],
          },
        );

        const [savedQuote, quoteEmbeddingText] = await this.processYahooData(
          quote,
          stock,
          quoteDate,
          yahooData,
        );

        await this.saveEmbedding(
          quoteEmbeddingText,
          quote.symbol as string,
          quoteDate,
          'Yahoo Finance API and Financial Modeling Prep API',
          0.9,
        );
      } catch (yahooError) {
        this.logger.warn(
          `Failed to fetch Yahoo Finance data for ${quote.symbol}: ${yahooError.message}`,
        );

        const newQuote = this.createBasicQuote(quote, stock, quoteDate);

        // Save the quote to the database
        const savedQuote = await this.stockQuoteRepository.save(newQuote);

        const basicEmbeddingText = this.createEmbeddingText(quote, savedQuote);

        await this.saveEmbedding(
          basicEmbeddingText,
          quote.symbol as string,
          quoteDate,
          'Financial Modeling Prep API',
          0.8,
        );
      }
    }

    this.logger.log(`Processed batch of ${quotes.length} stock quotes.`);
  }

  /**
   * Process Yahoo Finance data and create a stock quote with enriched data
   */
  private async processYahooData(
    quote: Record<string, unknown>,
    stock: Stock,
    quoteDate: Date,
    yahooData: Record<string, unknown>,
  ): Promise<[StockQuote, string]> {
    let statisticData = null;
    let companyData = null;

    // Create stock quote first
    const newQuote = this.createBasicQuote(quote, stock, quoteDate);

    // Save quote to get an ID
    const savedQuote = await this.stockQuoteRepository.save(newQuote);

    if (yahooData.defaultKeyStatistics) {
      try {
        statisticData =
          await this.stockStatisticService.createStatisticFromYahooData(
            stock.id,
            stock,
            quoteDate,
            yahooData.defaultKeyStatistics as Record<string, unknown>,
            savedQuote, // Pass the saved quote
          );
        this.logger.log(
          `Statistics for ${quote.symbol} stored successfully via service`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to store statistics for ${quote.symbol}: ${error.message}`,
        );
      }
    }

    if (yahooData.assetProfile) {
      try {
        companyData = await this.companiesService.updateCompanyProfile(
          quote.symbol as string,
          yahooData.assetProfile as Record<string, unknown>,
        );
        this.logger.log(
          `Company profile for ${quote.symbol} updated successfully with Yahoo data`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to update company profile for ${quote.symbol}: ${error.message}`,
        );
      }
    }

    const richEmbeddingText = this.createEmbeddingText(
      quote,
      savedQuote,
      statisticData,
      companyData,
    );

    return [savedQuote, richEmbeddingText];
  }

  /**
   * Create embedding text for stock data with optional statistical and company data
   * @param quote The quote data
   * @param newQuote The new quote entity
   * @param statisticData Optional statistical data
   * @param companyData Optional company data
   * @returns Formatted embedding text
   */
  private createEmbeddingText(
    quote: Record<string, unknown>,
    newQuote: StockQuote,
    statisticData?: StockStatistic,
    companyData?: Partial<Company>,
  ): string {
    const baseEmbeddingText = [
      `Symbol: ${(quote.symbol as string) || 'N/A'}`,
      `Date: ${newQuote.date.toISOString().split('T')[0]}`,
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
    ];

    const statisticalEmbeddingText = statisticData
      ? [
          `EnterpriseValue: ${statisticData.enterpriseValue ?? 'N/A'}`,
          `ForwardPE: ${statisticData.forwardPE ?? 'N/A'}`,
          `PriceToBook: ${statisticData.priceToBook ?? 'N/A'}`,
          `EnterpriseToRevenue: ${statisticData.enterpriseToRevenue ?? 'N/A'}`,
          `EnterpriseToEbitda: ${statisticData.enterpriseToEbitda ?? 'N/A'}`,
          `ProfitMargins: ${statisticData.profitMargins ?? 'N/A'}`,
          `TrailingEPS: ${statisticData.trailingEps ?? 'N/A'}`,
          `FloatShares: ${statisticData.floatShares ?? 'N/A'}`,
          `HeldPercentInsiders: ${statisticData.heldPercentInsiders ?? 'N/A'}`,
          `HeldPercentInstitutions: ${statisticData.heldPercentInstitutions ?? 'N/A'}`,
          `SharesShort: ${statisticData.sharesShort ?? 'N/A'}`,
          `ShortRatio: ${statisticData.shortRatio ?? 'N/A'}`,
          `ShortPercentOfFloat: ${statisticData.shortPercentOfFloat ?? 'N/A'}`,
          `PEGRatio: ${statisticData.pegRatio ?? 'N/A'}`,
          `52WeekChange: ${statisticData.weekChange52 ?? 'N/A'}`,
          `S&P52WeekChange: ${statisticData.spWeekChange52 ?? 'N/A'}`,
          `LastFiscalYearEnd: ${statisticData.lastFiscalYearEnd?.toISOString().split('T')[0] ?? 'N/A'}`,
          `MostRecentQuarter: ${statisticData.mostRecentQuarter?.toISOString().split('T')[0] ?? 'N/A'}`,
        ]
      : [];

    const companyEmbeddingText = companyData
      ? [
          `CompanyName: ${companyData.name ?? 'N/A'}`,
          `Industry: ${companyData.industry ?? 'N/A'}`,
          `Sector: ${companyData.sector ?? 'N/A'}`,
          `CEO: ${companyData.ceo ?? 'N/A'}`,
          `Country: ${companyData.country ?? 'N/A'}`,
          `FullTimeEmployees: ${companyData.fullTimeEmployees ?? 'N/A'}`,
        ]
      : [];

    return [
      ...baseEmbeddingText,
      ...statisticalEmbeddingText,
      ...companyEmbeddingText,
    ].join(', ');
  }

  /**
   * Save embedding document with given parameters
   */
  private async saveEmbedding(
    embeddingText: string,
    symbol: string,
    contentDate: Date,
    source: string,
    reliabilityScore: number,
  ): Promise<void> {
    await this.embeddingsService.embedAndSaveDocument({
      text: embeddingText,
      ticker: symbol,
      category: 'stock_quote',
      contentDate,
      source,
      reliabilityScore,
      date: contentDate,
      type: 'stock',
    });
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

    let gainersSummaryText = `Top Gainers on ${dateStr}\n\n`;

    const validGainers = topGainers.filter(
      (quote) =>
        quote.price &&
        quote.change &&
        quote.changesPercentage &&
        quote.volume &&
        quote.marketCap,
    );

    validGainers.forEach((quote, index) => {
      gainersSummaryText += `${index + 1}. ${quote.stock.ticker} (${quote.stock.name})\n`;
      gainersSummaryText += `   Price: $${Number(quote.price).toFixed(2)} | Change: +$${Number(quote.change).toFixed(2)} (+${Number(quote.changesPercentage).toFixed(2)}%)\n`;
      gainersSummaryText += `   Volume: ${(Number(quote.volume) / 1000000).toFixed(2)}M | Market Cap: $${(Number(quote.marketCap) / 1000000000).toFixed(2)}B\n\n`;
    });

    const avgGain =
      validGainers.length > 0
        ? validGainers.reduce(
            (sum, quote) => sum + Number(quote.changesPercentage),
            0,
          ) / validGainers.length
        : 0;

    if (validGainers.length > 0) {
      gainersSummaryText += `\nSummary: The top ${validGainers.length} gainers on ${dateStr} had an average gain of ${avgGain.toFixed(2)}%. `;
      gainersSummaryText += `${validGainers[0].stock.ticker} led with a gain of ${Number(validGainers[0].changesPercentage).toFixed(2)}%, `;
      gainersSummaryText += `while ${validGainers[validGainers.length - 1].stock.ticker} rounded out the list with a gain of ${Number(validGainers[validGainers.length - 1].changesPercentage).toFixed(2)}%.`;
    } else {
      gainersSummaryText += `\nNo valid gainer data available for ${dateStr}.`;
    }

    return gainersSummaryText;
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

    let losersSummaryText = `Top Losers on ${dateStr}\n\n`;

    const validLosers = topLosers.filter(
      (quote) =>
        quote.price &&
        quote.change &&
        quote.changesPercentage &&
        quote.volume &&
        quote.marketCap,
    );

    validLosers.forEach((quote, index) => {
      losersSummaryText += `${index + 1}. ${quote.stock.ticker} (${quote.stock.name})\n`;
      losersSummaryText += `   Price: $${Number(quote.price).toFixed(2)} | Change: -$${Math.abs(Number(quote.change)).toFixed(2)} (${Number(quote.changesPercentage).toFixed(2)}%)\n`;
      losersSummaryText += `   Volume: ${(Number(quote.volume) / 1000000).toFixed(2)}M | Market Cap: $${(Number(quote.marketCap) / 1000000000).toFixed(2)}B\n\n`;
    });

    const avgLoss =
      validLosers.length > 0
        ? validLosers.reduce(
            (sum, quote) => sum + Number(quote.changesPercentage),
            0,
          ) / validLosers.length
        : 0;

    if (validLosers.length > 0) {
      losersSummaryText += `\nSummary: The top ${validLosers.length} losers on ${dateStr} had an average loss of ${Math.abs(avgLoss).toFixed(2)}%. `;
      losersSummaryText += `${validLosers[0].stock.ticker} led with a loss of ${Number(validLosers[0].changesPercentage).toFixed(2)}%, `;
      losersSummaryText += `while ${validLosers[validLosers.length - 1].stock.ticker} rounded out the list with a loss of ${Number(validLosers[validLosers.length - 1].changesPercentage).toFixed(2)}%.`;
    } else {
      losersSummaryText += `\nNo valid loser data available for ${dateStr}.`;
    }

    return losersSummaryText;
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

    // Generate AI analysis
    const aiAnalysis =
      await this.aiMarketAnalysisService.generateMarketAnalysis({
        date: new Date(date),
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
      });

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
      aiAnalysis,
    };

    return response;
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

  async getTopStocks(): Promise<TopStocksResponseDto> {
    const [marketCapStocks, gainerStocks] = await Promise.all([
      this.getTopStocksByMarketCap(),
      this.getTopGainers(),
    ]);

    return {
      marketCap: marketCapStocks.map(
        (quote) =>
          new TopStockDto({
            symbol: quote.stock.ticker,
            name: quote.stock.name,
            price: quote.price,
            marketCap: quote.marketCap,
            changesPercentage: quote.changesPercentage,
            logoUrl: quote.stock.company?.logoUrl,
          }),
      ),
      gainers: gainerStocks.map(
        (quote) =>
          new TopStockDto({
            symbol: quote.stock.ticker,
            name: quote.stock.name,
            price: quote.price,
            changesPercentage: quote.changesPercentage,
            logoUrl: quote.stock.company?.logoUrl,
          }),
      ),
    };
  }

  /**
   * Create a basic stock quote from quote data
   */
  private createBasicQuote(
    quote: Record<string, unknown>,
    stock: Stock,
    quoteDate: Date,
  ): StockQuote {
    const newQuote = new StockQuote();
    newQuote.date = quoteDate;
    newQuote.open = quote.open as number;
    newQuote.dayHigh = quote.dayHigh as number;
    newQuote.dayLow = quote.dayLow as number;
    newQuote.price = quote.price as number;
    newQuote.adjClose = quote.adjClose as number;
    newQuote.volume = quote.volume as number;
    newQuote.avgVolume = quote.avgVolume as number;
    newQuote.change = quote.change as number;
    newQuote.changesPercentage = quote.changesPercentage as number;
    newQuote.yearHigh = quote.yearHigh as number;
    newQuote.yearLow = quote.yearLow as number;
    newQuote.priceAvg50 = quote.priceAvg50 as number;
    newQuote.priceAvg200 = quote.priceAvg200 as number;
    newQuote.eps = quote.eps as number;
    newQuote.pe = quote.pe as number;
    newQuote.marketCap = quote.marketCap as number;
    newQuote.previousClose = quote.previousClose as number;
    newQuote.earningsAnnouncement =
      quote.earningsAnnouncement &&
      !isNaN(new Date(quote.earningsAnnouncement as string).getTime())
        ? new Date(quote.earningsAnnouncement as string)
        : null;
    newQuote.sharesOutstanding = quote.sharesOutstanding as number;
    newQuote.timestamp = quoteDate;
    newQuote.stock = stock;

    return newQuote;
  }
}
