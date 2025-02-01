import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Stock } from './stock.entity';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { STOCK_EXCHANGE, STOCK_TYPE } from './constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StocksService {
  private readonly logger = new Logger(StocksService.name);
  constructor(
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async importStockList(): Promise<void> {
    const url =
      `https://financialmodelingprep.com/api/v3/stock/list?apikey=${this.configService.get<string>('FMP_API_KEY')}`;
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
}
