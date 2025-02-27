import { Expose, Type } from 'class-transformer';
import { WatchlistStockDto } from './watchlist-stock.dto';

export class WatchlistDto {
  @Expose()
  id: string;

  @Expose()
  @Type(() => WatchlistStockDto)
  stock: WatchlistStockDto;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
