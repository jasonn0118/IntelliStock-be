import { ApiProperty } from '@nestjs/swagger';
import { StockQuote } from '../../stockquote/stock-quote.entity';
import { StockStatistic } from '../../stockstatistic/stock-statistic.entity';

export class StockDynamicDto {
  @ApiProperty({ type: () => [StockQuote] })
  quotes: StockQuote[];

  @ApiProperty({ type: () => [StockStatistic] })
  statistics: StockStatistic[];

  @ApiProperty()
  structuredAnalysis: any; // Use your analysis interface type here

  @ApiProperty()
  lastUpdated: Date;
}
