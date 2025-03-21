import { Expose, Type } from 'class-transformer';
import { StockDto } from './stock.dto';

export class TopStockDto {
  @Expose()
  symbol: string;

  @Expose()
  name: string;

  @Expose()
  price: number;

  @Expose()
  marketCap?: number; // Only for market cap stocks

  @Expose()
  changesPercentage?: number; // Only for gainers

  @Expose()
  @Type(() => StockDto)
  stock: StockDto;

  constructor(partial: Partial<TopStockDto>) {
    Object.assign(this, partial);
  }
}
