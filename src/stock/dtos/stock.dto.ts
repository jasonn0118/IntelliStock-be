import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { StockStatisticDto } from 'src/stockstatistic/dtos/stock-statistic.dto';
import { CompanyDto } from '../../company/dtos/company.dto';
import { StockQuoteDto } from './stock-quote.dto';

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

  @ApiProperty({ description: 'Latest stock quote', type: [StockQuoteDto] })
  @Expose()
  @Type(() => StockQuoteDto)
  quotes: StockQuoteDto[];

  @ApiProperty({
    description: 'Latest stock statistics',
    type: StockStatisticDto,
  })
  @Expose()
  @Type(() => StockStatisticDto) // Using dynamic type to avoid circular dependency
  statistic: StockStatisticDto; // Using any to avoid circular reference

  @ApiProperty({
    description: 'AI-generated stock analysis',
    example:
      'Detailed analysis of the stock based on its financial data and market performance.',
    required: false,
  })
  @Expose()
  analysis?: string;
}
