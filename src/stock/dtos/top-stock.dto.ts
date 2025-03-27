import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TopStockDto {
  @ApiProperty({ type: String, example: 'AAPL' })
  @Expose()
  symbol: string;

  @ApiProperty({ type: String, example: 'Apple Inc.' })
  @Expose()
  name: string;

  @ApiProperty({ type: Number, example: 223.85 })
  @Expose()
  price: number;

  @ApiProperty({ type: Number, example: 3362697085000 })
  @Expose()
  marketCap?: number;

  @ApiProperty({ type: Number, example: 1.04726 })
  @Expose()
  changesPercentage?: number;

  @ApiProperty({
    type: String,
    example:
      'https://img.logo.dev/ticker/aapl?format=webp&retina=true&token=xxx',
  })
  @Expose()
  logoUrl?: string;

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
