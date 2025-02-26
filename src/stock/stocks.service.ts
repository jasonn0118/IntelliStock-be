import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Stock } from './stock.entity';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { STOCK_EXCHANGE, STOCK_TYPE } from './constants';
import { ConfigService } from '@nestjs/config';
import { StockQuote } from '../stockquote/stock-quote.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

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
  ) {}

  async importStockList(): Promise<void> {
    const url = `${this.baseUrl}/stock/list?apikey=${this.configService.get<string>('FMP_API_KEY')}`;
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const stockList = response.data;

      const stockToSave = stockList
        .filter(
          (stock) =>
            (stock.exchangeShortName === STOCK_EXCHANGE.NASDAQ ||
              stock.exchangeShortName === STOCK_EXCHANGE.NYSE) &&
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

  async fetchAndSaveDailyQuotes(tickers: string[]): Promise<void> {
    try {
      const symbolList = tickers.join(',');
      const url = `${this.baseUrl}/quote/${symbolList}?apikey=${this.configService.get<string>('FMP_API_KEY')}`;
      const response = await firstValueFrom(this.httpService.get(url));
      const quotes = response.data;

      const quotesToSavePromises = quotes.map(async (quote) => {
        // Convert timestamp to a Date object (if needed, multiply by 1000)
        const quoteDate = new Date(quote.timestamp * 1000);
        // Await the async call to find an existing quote
        const existingQuote = await this.stockQuoteRepository.findOne({
          where: { date: quoteDate, stock: { ticker: quote.symbol } },
        });
        if (existingQuote) {
          return null;
        }

        const stock = await this.stockRepository.findOne({
          where: { ticker: quote.symbol },
        });
        if (!stock) {
          return null;
        }

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
        newQuote.stock = stock as Stock;
        return newQuote;
      });

      const quotesToSave = (await Promise.all(quotesToSavePromises)).filter(
        (q) => q !== null,
      );

      await this.stockQuoteRepository.save(quotesToSave);
      this.logger.log('Daily quotes saved');
    } catch (error) {
      this.logger.error(error.message);
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

      // Use flatMap to create a single array of StockQuote objects
      const quotesToSavePromises = historicalData.flatMap(async (data) => {
        const stock = await this.stockRepository.findOne({
          where: { ticker: data.symbol },
        });
        if (!stock) {
          return [];
        }
        return data.historical.map((quote) => {
          const newQuote = new StockQuote();
          newQuote.date = new Date(quote.date); // converting string date to Date object
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
      // Bulk save all quotes
      await this.stockQuoteRepository.save(quotesToSave);
    } catch (error) {
      this.logger.error(error.message);
      throw error;
    }
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

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron(): Promise<void> {
    this.logger.debug('Called when the current second is 10');
  }

  @Cron(CronExpression.EVERY_DAY_AT_6PM)
  async updateDailyQuotes(): Promise<void> {
    try {
      const tickers = await this.getAllSymbols();
      // Split tickers into batches of 1000
      const batchSize = 1000;
      for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        await this.fetchAndSaveDailyQuotes(batch);
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
      const symbols = await this.getAllSymbols();
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
        await this.fetchAndSaveHistoricalQuotes(batch);
      }
      this.logger.log(
        `Historical data updated for ${symbolsToUpdate.length} symbols.`,
      );
    } catch (error) {
      this.logger.error('Error updating historical data', error.stack);
    }
  }
}
