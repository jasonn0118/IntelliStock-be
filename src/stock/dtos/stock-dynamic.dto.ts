import { ApiProperty } from '@nestjs/swagger';
import { StockQuote } from '../../stockquote/stock-quote.entity';
import { StockStatistic } from '../../stockstatistic/stock-statistic.entity';
import { StockAnalysisDto } from './stock.dto';

export class StockDynamicDto {
  @ApiProperty({ type: () => [StockQuote] })
  quotes: StockQuote[];

  @ApiProperty({ type: () => [StockStatistic] })
  statistics: StockStatistic[];

  @ApiProperty()
  structuredAnalysis: StockAnalysisDto;

  @ApiProperty()
  lastUpdated: Date;
}
