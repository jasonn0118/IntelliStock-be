import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class StockQuoteDto {
  @ApiProperty({ description: 'Quote date' })
  @Expose()
  date: Date;

  @ApiProperty({ description: 'Opening price' })
  @Expose()
  open: number;

  @ApiProperty({ description: 'Highest price of the day' })
  @Expose()
  dayHigh: number;

  @ApiProperty({ description: 'Lowest price of the day' })
  @Expose()
  dayLow: number;

  @ApiProperty({ description: '52-week low price' })
  @Expose()
  yearLow: number;

  @ApiProperty({ description: '52-week high price' })
  @Expose()
  yearHigh: number;

  @ApiProperty({ description: 'Current price' })
  @Expose()
  price: number;

  @ApiProperty({ description: '50-day moving average price' })
  @Expose()
  priceAvg50: number;

  @ApiProperty({ description: '200-day moving average price' })
  @Expose()
  priceAvg200: number;

  @ApiProperty({ description: 'Adjusted closing price' })
  @Expose()
  adjClose: number;

  @ApiProperty({ description: 'Trading volume' })
  @Expose()
  volume: number;

  @ApiProperty({ description: 'Average trading volume' })
  @Expose()
  avgVolume: number;

  @ApiProperty({ description: 'Price change' })
  @Expose()
  change: number;

  @ApiProperty({ description: 'Percentage price change' })
  @Expose()
  changesPercentage: number;

  @ApiProperty({ description: 'Earnings per share' })
  @Expose()
  eps: number;

  @ApiProperty({ description: 'Price-to-earnings ratio' })
  @Expose()
  pe: number;

  @ApiProperty({ description: 'Market capitalization' })
  @Expose()
  marketCap: number;

  @ApiProperty({ description: 'Previous day closing price' })
  @Expose()
  previousClose: number;

  @ApiProperty({ description: 'Earnings announcement date' })
  @Expose()
  earningsAnnouncement: Date;

  @ApiProperty({ description: 'Number of shares outstanding' })
  @Expose()
  sharesOutstanding: number;

  @ApiProperty({ description: 'Quote timestamp' })
  @Expose()
  timestamp: Date;
}
