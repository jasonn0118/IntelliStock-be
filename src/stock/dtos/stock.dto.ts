import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CompanyDto } from '../../company/dtos/company.dto';

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

export class StockDto {
  @ApiProperty({ description: 'Stock ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Stock ticker symbol' })
  @Expose()
  ticker: string;

  @ApiProperty({ description: 'Stock name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Stock exchange' })
  @Expose()
  exchange: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @Expose()
  lastUpdated: Date;

  @ApiProperty({ description: 'Company information' })
  @Expose()
  @Type(() => CompanyDto)
  company: CompanyDto;

  @ApiProperty({ description: 'Latest stock quote', type: StockQuoteDto })
  @Expose()
  @Type(() => StockQuoteDto)
  quotes: StockQuoteDto[];
}
