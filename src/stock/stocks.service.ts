import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { EmbeddingsService } from '../embedding/embeddings.service';
import { StockQuote } from '../stockquote/stock-quote.entity';
import { STOCK_EXCHANGE, STOCK_TYPE } from './constants';
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
      // Assuming the response data structure contains "historicalStockList"
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

  async getTopStocksByMarketCap(): Promise<StockQuote[]> {
    return this.stockQuoteRepository
      .createQueryBuilder('stock_quote')
      .leftJoinAndSelect('stock_quote.stock', 'stock')
      .where("stock_quote.date = (CURRENT_DATE - INTERVAL '1 day')")
      .andWhere('stock_quote.marketCap IS NOT NULL')
      .orderBy('stock_quote.marketCap', 'DESC')
      .limit(10)
      .getMany();
  }

  async getTopGainers() {
    return this.stockQuoteRepository
      .createQueryBuilder('sq')
      .innerJoinAndSelect('sq.stock', 's')
      .where("sq.date = (CURRENT_DATE - INTERVAL '1 day')")
      .andWhere('sq.marketCap > 100000000') // ✅ Market Cap > $100M
      .andWhere('sq.price > 5') // ✅ Stock price > $5
      .andWhere('sq.avgVolume > 100000') // ✅ Avg Volume > 100K
      .orderBy('sq.changesPercentage', 'DESC') // ✅ Sort by top gainers
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
        `Date: ${quoteDate.toISOString()}`,
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

      await this.embeddingsService.embedAndSaveDocument(embeddingText);

      quotesToSave.push(newQuote);
    }

    if (quotesToSave.length > 0) {
      await this.stockQuoteRepository.save(quotesToSave);
    }

    this.logger.log(`Processed batch of ${quotes.length} stock quotes.`);
  }
}
