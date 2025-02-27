import { Expose } from 'class-transformer';

export class WatchlistStockDto {
  @Expose()
  ticker: string;

  @Expose()
  name: string;

  @Expose()
  exchange: string;
}
