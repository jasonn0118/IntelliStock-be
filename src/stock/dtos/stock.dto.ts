import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CompanyDto } from '../../company/dtos/company.dto';
import { StockQuoteDto } from './stock-quote.dto';
import { StockStatistic } from 'src/stockstatistic/stock-statistic.entity';
import { StockStatisticDto } from 'src/stockstatistic/dtos/stock-statistic.dto';

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

}
