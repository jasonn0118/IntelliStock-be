import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { StockDto } from './stock.dto';

export class TopStockDto {
  @ApiProperty({ type: String, example: 'AAPL' })
  @Expose()
  symbol: string;

  @ApiProperty({ type: String, example: 'Apple Inc.' })
  @Expose()
  name: string;

  @ApiProperty({ type: Number, example: 150.75 })
  @Expose()
  price: number;

  @ApiProperty({ type: Number, example: 1000000000 })
  @Expose()
  marketCap?: number;

  @ApiProperty({ type: Number, example: 1.5 })
  @Expose()
  changesPercentage?: number;

  @ApiProperty({ type: StockDto })
  @Expose()
  @Type(() => StockDto)
  stock: StockDto;

  constructor(partial: Partial<TopStockDto>) {
    Object.assign(this, partial);
  }
}

export class TopStocksResponseDto {
  @ApiProperty({ type: [TopStockDto] })
  marketCap: TopStockDto[];

  @ApiProperty({ type: [TopStockDto] })
  gainers: TopStockDto[];
}
