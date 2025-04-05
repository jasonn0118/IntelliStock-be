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
    const maxDateResult = await this.stockQuoteRepository
      .createQueryBuilder('sq')
      .select('MAX(sq.date)', 'maxDate')
      .getRawOne();

    if (!maxDateResult || !maxDateResult.maxDate) {
      this.logger.warn('No stock quotes found in the database');
      return [];
    }

    return this.stockQuoteRepository
      .createQueryBuilder('sq')
      .innerJoinAndSelect('sq.stock', 's')
      .leftJoinAndSelect('s.company', 'c')
      .where('sq.date = :maxDate', { maxDate: maxDateResult.maxDate })
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
    const stock = await this.stockRepository.findOne({
      where: { ticker },
      relations: ['company'],
    });

    if (!stock) {
      return null;
    }

    const latestQuote = await this.stockQuoteRepository
      .createQueryBuilder('sq')
      .innerJoinAndSelect('sq.stock', 's')
      .leftJoinAndSelect('sq.statistic', 'ss')
      .where('s.ticker = :ticker', { ticker })
      .orderBy('sq.date', 'DESC')
      .limit(1)
      .getOne();

    if (latestQuote) {
      stock.quotes = [latestQuote];

      if (latestQuote.statistic) {
        stock.statistics = [latestQuote.statistic];
      }
    }

    return stock;
  }

  /**
   * Get static stock information by ticker symbol
   * @param ticker Stock ticker symbol
   * @returns Stock entity with only static information (no quotes or statistics)
   */
  async getStockStatic(ticker: string): Promise<Stock> {
    return this.stockRepository.findOne({
      where: { ticker },
      relations: ['company'],
    });
  }

  /**
   * Search for stocks by ticker symbol or company name - Highly optimized version
   * @param query Search query string
   * @returns Array of SearchStockDto objects with matching stocks
   */
  async searchStocks(query: string): Promise<SearchStockDto[]> {
    if (!query || query.trim() === '') {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();

    const searchResults = await this.stockRepository
      .createQueryBuilder('s')
      .select([
        's.ticker as ticker',
        's.name as name',
        'q.price as price',
        'q."changesPercentage" as "changesPercentage"',
      ])
      .innerJoin(
        (qb) => {
          return qb.from((subQb) => {
            return subQb
              .select('DISTINCT ON (sq."stockId") sq.*')
              .from(StockQuote, 'sq')
              .orderBy('sq."stockId"')
              .addOrderBy('sq.date', 'DESC');
          }, 'q');
        },
        'q',
        'q."stockId" = s.id',
      )
      .where('LOWER(s.ticker) = :exact', { exact: searchTerm })
      .orWhere('LOWER(s.ticker) LIKE :starts', { starts: `${searchTerm}%` })
      .orWhere('LOWER(s.name) LIKE :contains', { contains: `%${searchTerm}%` })
      .orderBy(
        'CASE ' +
          'WHEN LOWER(s.ticker) = :exact THEN 0 ' +
          'WHEN LOWER(s.ticker) LIKE :starts THEN 1 ' +
          'WHEN LOWER(s.name) = :exact THEN 2 ' +
          'ELSE 3 END',
        'ASC',
      )
      .setParameters({
        exact: searchTerm,
        starts: `${searchTerm}%`,
        contains: `%${searchTerm}%`,
      })
      .limit(10)
      .getRawMany();

    return searchResults.map((result) => {
      this.logger.log(
        `Found ${result.ticker} ${result.name} ${result.price} ${result.changesPercentage}`,
      );
      return new SearchStockDto({
        symbol: result.ticker,
        name: result.name,
        price: result.price,
        changesPercentage: result.changesPercentage,
      });
    });
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

    const newQuote = this.createBasicQuote(quote, stock, quoteDate);

    const savedQuote = await this.stockQuoteRepository.save(newQuote);

    if (yahooData.defaultKeyStatistics) {
      try {
        statisticData =
          await this.stockStatisticService.createStatisticFromYahooData(
            stock.id,
            stock,
            quoteDate,
            yahooData.defaultKeyStatistics as Record<string, unknown>,
            savedQuote,
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
      .andWhere('sq.changesPercentage < 0') // Only get negative performers
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
      gainersSummaryText += `   Price: $${typeof quote.price === 'number' ? quote.price.toFixed(2) : Number(quote.price).toFixed(2) || 'N/A'} | Change: +$${typeof quote.change === 'number' ? quote.change.toFixed(2) : Number(quote.change).toFixed(2) || 'N/A'} (+${typeof quote.changesPercentage === 'number' ? quote.changesPercentage.toFixed(2) : Number(quote.changesPercentage).toFixed(2) || 'N/A'}%)\n`;
      gainersSummaryText += `   Volume: ${quote.volume ? (Number(quote.volume) / 1000000).toFixed(2) + 'M' : 'N/A'} | Market Cap: $${quote.marketCap ? (Number(quote.marketCap) / 1000000000).toFixed(2) + 'B' : 'N/A'}\n\n`;
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
      losersSummaryText += `   Price: $${typeof quote.price === 'number' ? quote.price.toFixed(2) : Number(quote.price).toFixed(2) || 'N/A'} | Change: -$${typeof quote.change === 'number' ? Math.abs(quote.change).toFixed(2) : Math.abs(Number(quote.change)).toFixed(2) || 'N/A'} (${typeof quote.changesPercentage === 'number' ? quote.changesPercentage.toFixed(2) : Number(quote.changesPercentage).toFixed(2) || 'N/A'}%)\n`;
      losersSummaryText += `   Volume: ${quote.volume ? (Number(quote.volume) / 1000000).toFixed(2) + 'M' : 'N/A'} | Market Cap: $${quote.marketCap ? (Number(quote.marketCap) / 1000000000).toFixed(2) + 'B' : 'N/A'}\n\n`;
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

  /**
   * Generate stock analysis based on stock data
   * @param stock Stock entity with quotes and statistics
   * @returns Object with structured JSON and Markdown formatted analysis
   */
  async generateStockAnalysis(stock: Stock): Promise<{
    analysisStructured: {
      ticker: string;
      analysis: {
        companyProfile: string;
        valuation: string;
        performance: string;
        ownership: string;
        shortInterest: string;
        strengthsAndRisks: string;
        summary: string;
        sentiment:
          | 'very_bearish'
          | 'bearish'
          | 'neutral'
          | 'bullish'
          | 'very_bullish';
      };
    };
  }> {
    try {
      if (!stock || !stock.quotes || stock.quotes.length === 0) {
        return {
          analysisStructured: {
            ticker: stock?.ticker || 'Unknown',
            analysis: {
              companyProfile: `${stock?.name || 'Unknown'} (${stock?.ticker || 'Unknown'})`,
              valuation: 'Insufficient data',
              performance: 'Insufficient data',
              ownership: 'Insufficient data',
              shortInterest: 'Insufficient data',
              strengthsAndRisks: 'Insufficient data available',
              summary: 'Insufficient data available to generate analysis.',
              sentiment: 'neutral',
            },
          },
        };
      }

      const latestQuote = stock.quotes[0];
      const statistic =
        stock.statistics && stock.statistics.length > 0
          ? stock.statistics[0]
          : null;

      const prompt = this.formatStockAnalysisPrompt(
        stock,
        latestQuote,
        statistic,
        true,
      );

      const analysis =
        await this.aiMarketAnalysisService.generateCustomAnalysis(prompt);

      const structuredResponse = this.extractStructuredData(
        analysis,
        stock,
        latestQuote,
        statistic,
      );

      return {
        analysisStructured: structuredResponse,
      };
    } catch (error) {
      this.logger.error(`Error generating stock analysis: ${error.message}`);
      return {
        analysisStructured: {
          ticker: stock?.ticker || 'Unknown',
          analysis: {
            companyProfile: `${stock?.name || 'Unknown'} (${stock?.ticker || 'Unknown'})`,
            valuation: 'Error generating analysis',
            performance: 'Error generating analysis',
            ownership: 'Error generating analysis',
            shortInterest: 'Error generating analysis',
            strengthsAndRisks: 'Error generating analysis',
            summary: 'An error occurred while generating the analysis.',
            sentiment: 'neutral',
          },
        },
      };
    }
  }

  /**
   * Extract structured data from the response
   */
  private extractStructuredData(
    response: string,
    stock: Stock,
    quote: StockQuote,
    statistic: StockStatistic | null,
  ): {
    ticker: string;
    analysis: {
      companyProfile: string;
      valuation: string;
      performance: string;
      ownership: string;
      shortInterest: string;
      strengthsAndRisks: string;
      summary: string;
      sentiment:
        | 'very_bearish'
        | 'bearish'
        | 'neutral'
        | 'bullish'
        | 'very_bullish';
    };
  } {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);

      if (jsonMatch && jsonMatch[1]) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          if (jsonData.ticker && jsonData.analysis) {
            return jsonData;
          }
        } catch (jsonError) {
          this.logger.warn(`Failed to parse JSON: ${jsonError.message}`);
        }
      }

      return {
        ticker: stock.ticker,
        analysis: {
          companyProfile: this.extractSectionFromMarkdown(response, [
            'company profile',
            'company',
            'profile',
            'overview',
          ]),
          valuation: this.extractSectionFromMarkdown(response, [
            'valuation',
            'financials',
            'ratios',
          ]),
          performance: this.extractSectionFromMarkdown(response, [
            'performance',
            'price',
            'trend',
          ]),
          ownership: this.extractSectionFromMarkdown(response, [
            'ownership',
            'insider',
            'institutional',
          ]),
          shortInterest: this.extractSectionFromMarkdown(response, [
            'short interest',
            'short',
            'interest',
          ]),
          strengthsAndRisks:
            this.extractStrengthsAndRisksFromMarkdown(response),
          summary:
            this.extractSectionFromMarkdown(response, [
              'summary',
              'conclusion',
              'overall',
            ]) || this.createSummaryFromText(response),
          sentiment: this.determineSentimentFromText(response),
        },
      };
    } catch (error) {
      this.logger.error(`Error extracting structured data: ${error.message}`);
      return {
        ticker: stock.ticker,
        analysis: {
          companyProfile: `${stock.name} (${stock.ticker}) is a ${stock.company?.industry || 'company'} in the ${stock.company?.sector || 'market'}.`,
          valuation: `Current price: $${quote.price || 'N/A'}. Market cap: $${quote.marketCap ? (Number(quote.marketCap) / 1000000).toFixed(2) + 'M' : 'N/A'}.`,
          performance: `${stock.ticker} has changed by ${quote.changesPercentage ? Number(quote.changesPercentage).toFixed(2) + '%' : 'N/A'} recently.`,
          ownership: 'Ownership data extraction failed.',
          shortInterest: 'Short interest data extraction failed.',
          strengthsAndRisks: 'Unable to analyze strengths and risks.',
          summary: 'Error occurred while parsing the analysis.',
          sentiment: 'neutral',
        },
      };
    }
  }

  /**
   * Format the prompt for stock analysis
   */
  private formatStockAnalysisPrompt(
    stock: Stock,
    quote: StockQuote,
    statistic: StockStatistic | null,
    structuredOutput: boolean = false,
  ): string {
    const companyInfo = `Company Info:
- Name: ${stock.name}
- Exchange: ${stock.exchange || 'NASDAQ'}
- Ticker: ${stock.ticker}${
      stock.company
        ? `
- Industry: ${stock.company.industry || 'N/A'}
- Sector: ${stock.company.sector || 'N/A'}
- Website: ${stock.company.website || 'N/A'}
- CEO: ${stock.company.ceo || 'N/A'}
- Description: ${stock.company.description || 'N/A'}
- Headquarters: ${stock.company.city ? `${stock.company.city}, ${stock.company.state || ''}` : 'N/A'}
- Employees: ${stock.company.fullTimeEmployees || 'N/A'}`
        : ''
    }`;

    const quoteInfo = `Quote (as of ${quote.date || new Date(quote.timestamp).toISOString().split('T')[0]}):
- Price: $${Number(quote.price).toFixed(2)} (${quote.changesPercentage >= 0 ? '↑' : '↓'} ${Number(quote.changesPercentage).toFixed(2)}%)
- Market Cap: $${quote.marketCap ? (Number(quote.marketCap) / 1000000).toFixed(2) + 'M' : 'N/A'}
- 52-Week High/Low: $${quote.yearHigh ? Number(quote.yearHigh).toFixed(2) : 'N/A'} / $${quote.yearLow ? Number(quote.yearLow).toFixed(2) : 'N/A'}
- Volume: ${quote.volume ? Number(quote.volume).toLocaleString() : 'N/A'} (Avg: ${quote.avgVolume ? Number(quote.avgVolume).toLocaleString() : 'N/A'})
- EPS: $${quote.eps ? Number(quote.eps).toFixed(2) : 'N/A'}
- PE Ratio: ${quote.pe ? Number(quote.pe).toFixed(2) : 'N/A'}
- Previous Close: $${quote.previousClose ? Number(quote.previousClose).toFixed(2) : 'N/A'}
- PriceAvg50: ${quote.priceAvg50 ? Number(quote.priceAvg50).toFixed(2) : 'N/A'}
- PriceAvg200: ${quote.priceAvg200 ? Number(quote.priceAvg200).toFixed(2) : 'N/A'}`;

    let statisticsInfo = '';
    if (statistic) {
      let lastFiscalYearEndStr = 'N/A';
      let mostRecentQuarterStr = 'N/A';

      try {
        if (statistic.lastFiscalYearEnd) {
          const lastFiscalDate =
            statistic.lastFiscalYearEnd instanceof Date
              ? statistic.lastFiscalYearEnd
              : new Date(statistic.lastFiscalYearEnd);
          lastFiscalYearEndStr = lastFiscalDate.toISOString().split('T')[0];
        }
      } catch (e) {
        this.logger.warn(`Error formatting lastFiscalYearEnd: ${e.message}`);
      }

      try {
        if (statistic.mostRecentQuarter) {
          const quarterDate =
            statistic.mostRecentQuarter instanceof Date
              ? statistic.mostRecentQuarter
              : new Date(statistic.mostRecentQuarter);
          mostRecentQuarterStr = quarterDate.toISOString().split('T')[0];
        }
      } catch (e) {
        this.logger.warn(`Error formatting mostRecentQuarter: ${e.message}`);
      }

      statisticsInfo = `
Key Statistics:
Enterprise Value: $${statistic.enterpriseValue ? (Number(statistic.enterpriseValue) / 1000000).toFixed(2) + 'M' : 'N/A'}
Float Shares: ${statistic.floatShares ? (Number(statistic.floatShares) / 1000000).toFixed(2) + 'M' : 'N/A'}
Shares Outstanding: ${statistic.sharesOutstanding ? (Number(statistic.sharesOutstanding) / 1000000).toFixed(2) + 'M' : 'N/A'}
Insider Ownership: ${statistic.heldPercentInsiders ? (Number(statistic.heldPercentInsiders) * 100).toFixed(2) + '%' : 'N/A'}
Institutional Ownership: ${statistic.heldPercentInstitutions ? (Number(statistic.heldPercentInstitutions) * 100).toFixed(2) + '%' : 'N/A'}
Short Interest: ${statistic.sharesShort ? Number(statistic.sharesShort).toLocaleString() : 'N/A'} (${statistic.shortPercentOfFloat ? (Number(statistic.shortPercentOfFloat) * 100).toFixed(2) + '% of float' : 'N/A'})
Short Ratio: ${statistic.shortRatio ? Number(statistic.shortRatio).toFixed(2) : 'N/A'}
Price/Book: ${statistic.priceToBook ? Number(statistic.priceToBook).toFixed(2) : 'N/A'}
Enterprise to Revenue: ${statistic.enterpriseToRevenue ? Number(statistic.enterpriseToRevenue).toFixed(2) : 'N/A'}
Enterprise to EBITDA: ${statistic.enterpriseToEbitda ? Number(statistic.enterpriseToEbitda).toFixed(2) : 'N/A'}
Profit Margin: ${statistic.profitMargins ? (Number(statistic.profitMargins) * 100).toFixed(2) + '%' : 'N/A'}
52-Week Return: ${statistic.weekChange52 ? (Number(statistic.weekChange52) * 100).toFixed(2) + '%' : 'N/A'}
S&P 52-Week Return: ${statistic.spWeekChange52 ? (Number(statistic.spWeekChange52) * 100).toFixed(2) + '%' : 'N/A'}

Fiscal Dates:
Last Fiscal Year End: ${lastFiscalYearEndStr}
Most Recent Quarter: ${mostRecentQuarterStr}`;
    }

    let prompt = `You are a professional financial analyst.

Generate a concise analysis report of the stock **${stock.name} (${stock.ticker})** using the data provided below. Highlight:
- Company profile (industry, sector, business model)
- Valuation and key ratios
- Recent performance (price, volume, volatility)
- Insider/institutional ownership insights
- Short interest overview
- Strengths and risks
- Overall sentiment

Only use the data provided. Be objective and use financial terminology.

---
${companyInfo}

${quoteInfo}${statisticsInfo}

---`;

    if (structuredOutput) {
      prompt += `
Your response should include two parts:

1. A comprehensive markdown-formatted analysis with the following clear structure:

## Company Profile
[Write a paragraph about the company, its industry, sector, and business model]

## Valuation Analysis
[Write a paragraph analyzing valuation metrics, PE ratio, price/book, etc.]

## Recent Performance
[Write a paragraph on recent price action, volume, trends, and volatility]

## Ownership Structure
[Write a paragraph about insider and institutional ownership]

## Short Interest
[Write a paragraph analyzing short interest data, if available]

## Strengths
- [Key strength point 1]
- [Key strength point 2]
- [Key strength point 3 if applicable]

## Risks
- [Key risk factor 1]
- [Key risk factor 2]
- [Key risk factor 3 if applicable]

## Summary
[Write a concise summary paragraph with overall sentiment]

2. A simplified JSON object at the end of your response in the following format (enclosed in \`\`\`json ... \`\`\` code block):

\`\`\`json
{
  "ticker": "${stock.ticker}",
  "analysis": {
    "companyProfile": "Summary of company profile section",
    "valuation": "Summary of valuation section",
    "performance": "Summary of performance section",
    "ownership": "Summary of ownership section",
    "shortInterest": "Summary of short interest section",
    "strengthsAndRisks": "Combined summary of strengths and risks",
    "summary": "Overall conclusion",
    "sentiment": "bullish" | "bearish" | "neutral" | "very_bullish" | "very_bearish"
  }
}
\`\`\`

The JSON should contain concise text summaries of each section, better with numerical data.
`;
    } else {
      prompt += `Respond with a detailed summary suitable for investors evaluating this stock.`;
    }

    return prompt;
  }

  /**
   * Extract a section from markdown text based on headings
   */
  private extractSectionFromMarkdown(
    text: string,
    possibleHeadings: string[],
  ): string {
    const lines = text.split('\n');
    let extractedContent = '';
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();

      const isHeading =
        line.startsWith('#') ||
        (i > 0 &&
          (lines[i - 1].startsWith('===') || lines[i - 1].startsWith('---')));

      if (
        isHeading &&
        possibleHeadings.some((heading) =>
          lowerLine.includes(heading.toLowerCase()),
        )
      ) {
        inSection = true;
        continue;
      }

      if (isHeading && inSection) {
        break;
      }

      if (inSection && line.length > 0) {
        const cleanLine = line
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/^[*-] /, '');
        extractedContent += cleanLine + ' ';
      }
    }

    return extractedContent.trim() || `No information available`;
  }

  /**
   * Extract strengths and risks from markdown text
   */
  private extractStrengthsAndRisksFromMarkdown(text: string): string {
    const strengths = this.extractInsightsFromText(text, 'strength');
    const risks = this.extractInsightsFromText(text, 'risk');

    let result = '';
    if (strengths.length > 0) {
      result += 'Strengths: ' + strengths.join('; ') + '. ';
    }

    if (risks.length > 0) {
      result += 'Risks: ' + risks.join('; ') + '.';
    }

    return result.trim() || 'No specific strengths or risks identified.';
  }

  /**
   * Create a brief summary from the text
   */
  private createSummaryFromText(text: string): string {
    const conclusionMatch = text.match(
      /(?:conclusion|summary|overall).*?:(.*?)(?:$|\n\n)/i,
    );
    if (conclusionMatch && conclusionMatch[1]) {
      return conclusionMatch[1].trim();
    }

    const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 10);
    if (sentences.length > 0) {
      return sentences.slice(0, 2).join('.') + '.';
    }

    return 'No summary available.';
  }

  /**
   * Extract insights (strengths/risks) from analysis text
   */
  private extractInsightsFromText(
    text: string,
    type: 'strength' | 'risk',
  ): string[] {
    const insights: string[] = [];

    const lines = text.split('\n');
    let inSection = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (
        (type === 'strength' &&
          (lowerLine.includes('strength') ||
            lowerLine.includes('advantage') ||
            lowerLine.includes('positive') ||
            lowerLine.includes('bullish'))) ||
        (type === 'risk' &&
          (lowerLine.includes('risk') ||
            lowerLine.includes('challenge') ||
            lowerLine.includes('concern') ||
            lowerLine.includes('weakness') ||
            lowerLine.includes('bearish')))
      ) {
        inSection = true;
        continue;
      }

      if (
        inSection &&
        (line.includes('# ') ||
          line.includes('## ') ||
          (type === 'strength' && lowerLine.includes('risk')) ||
          (type === 'risk' && lowerLine.includes('conclusion')))
      ) {
        inSection = false;
      }

      if (
        inSection &&
        (line.trim().startsWith('-') || line.trim().startsWith('*'))
      ) {
        const point = line.trim().substring(1).trim();
        if (point.length > 5) {
          insights.push(point);
        }
      }
    }

    if (insights.length === 0) {
      const keywords =
        type === 'strength'
          ? [
              'strong',
              'positive',
              'advantage',
              'growth',
              'increasing',
              'improvement',
            ]
          : [
              'risk',
              'challenge',
              'concern',
              'weakness',
              'decline',
              'decreasing',
              'negative',
            ];

      const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 10);

      for (const sentence of sentences) {
        const lowerSentence = sentence.toLowerCase();
        if (keywords.some((keyword) => lowerSentence.includes(keyword))) {
          insights.push(sentence.trim());
          if (insights.length >= 3) break;
        }
      }
    }

    return insights.length > 0
      ? insights
      : [
          type === 'strength'
            ? 'No clear strengths identified'
            : 'No clear risks identified',
        ];
  }

  /**
   * Determine sentiment from analysis text
   */
  private determineSentimentFromText(
    text: string,
  ): 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish' {
    const lowerText = text.toLowerCase();

    const bearishTerms = [
      'bearish',
      'negative',
      'concern',
      'risk',
      'overvalued',
      'decline',
      'weak',
      'sell',
      'avoid',
    ];
    const bullishTerms = [
      'bullish',
      'positive',
      'strong',
      'growth',
      'undervalued',
      'opportunity',
      'buy',
      'recommend',
    ];
    const veryBearishTerms = [
      'significant risk',
      'highly overvalued',
      'strong sell',
      'dangerous',
      'severe decline',
    ];
    const veryBullishTerms = [
      'strong buy',
      'highly undervalued',
      'exceptional growth',
      'outstanding opportunity',
    ];

    let bearishCount = bearishTerms.reduce(
      (count, term) =>
        count + (lowerText.match(new RegExp(term, 'g')) || []).length,
      0,
    );

    let bullishCount = bullishTerms.reduce(
      (count, term) =>
        count + (lowerText.match(new RegExp(term, 'g')) || []).length,
      0,
    );

    const veryBearishCount = veryBearishTerms.reduce(
      (count, term) =>
        count + (lowerText.match(new RegExp(term, 'g')) || []).length,
      0,
    );

    const veryBullishCount = veryBullishTerms.reduce(
      (count, term) =>
        count + (lowerText.match(new RegExp(term, 'g')) || []).length,
      0,
    );

    bearishCount += veryBearishCount * 2;
    bullishCount += veryBullishCount * 2;

    if (veryBearishCount >= 2 || bearishCount > bullishCount + 5) {
      return 'very_bearish';
    } else if (veryBullishCount >= 2 || bullishCount > bearishCount + 5) {
      return 'very_bullish';
    } else if (bearishCount > bullishCount + 2) {
      return 'bearish';
    } else if (bullishCount > bearishCount + 2) {
      return 'bullish';
    } else {
      return 'neutral';
    }
  }
}
