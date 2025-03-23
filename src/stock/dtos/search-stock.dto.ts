import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SearchStockDto {
  @ApiProperty({ description: 'Stock ticker symbol' })
  @Expose()
  symbol: string;

  @ApiProperty({ description: 'Company name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Current stock price' })
  @Expose()
  price: number;

  @ApiProperty({ description: 'Percentage change in stock price' })
  @Expose()
  changesPercentage: number;

  constructor(partial: Partial<SearchStockDto>) {
    Object.assign(this, partial);
  }
}
