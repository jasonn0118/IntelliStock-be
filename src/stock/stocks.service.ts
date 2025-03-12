import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Stock } from './stock.entity';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { STOCK_EXCHANGE, STOCK_TYPE } from './constants';
import { ConfigService } from '@nestjs/config';
import { StockQuote } from '../stockquote/stock-quote.entity';
import { EmbeddingsService } from '../embedding/embeddings.service';

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
        const embeddingText = `Symbol: ${quote.symbol}, Price: ${quote.price}, Open: ${quote.open}, DayHigh: ${quote.dayHigh}, DayLow: ${quote.dayLow}, AdjClose: ${quote.adjClose}, Volume: ${quote.volume}, AvgVolume: ${quote.avgVolume}, Change: ${quote.change}, ChangesPercentage: ${quote.changesPercentage}, YearHigh: ${quote.yearHigh}, YearLow: ${quote.yearLow}, PriceAvg50: ${quote.priceAvg50}, PriceAvg200: ${quote.priceAvg200}, EPS: ${quote.eps}, PE: ${quote.pe}`;

        await this.embeddingsService.embedAndSaveDocument(embeddingText);

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
}
