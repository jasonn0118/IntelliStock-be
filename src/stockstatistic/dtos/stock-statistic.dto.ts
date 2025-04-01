import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { StockQuoteDto } from '../../stock/dtos/stock-quote.dto';

export class StockStatisticDto {
  @ApiProperty({ description: 'Unique identifier for the statistic record' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Date when statistics were collected' })
  @Expose()
  date: Date;

  // Valuation metrics
  @ApiProperty({
    description: 'Enterprise value of the company',
    example: 46541389824,
  })
  @Expose()
  enterpriseValue: number;

  @ApiProperty({
    description: 'Forward price-to-earnings ratio',
    example: 124.5,
  })
  @Expose()
  forwardPE: number;

  @ApiProperty({ description: 'Price-to-book ratio', example: 23.31 })
  @Expose()
  priceToBook: number;

  @ApiProperty({
    description: 'Enterprise value to revenue ratio',
    example: 35.037,
  })
  @Expose()
  enterpriseToRevenue: number;

  @ApiProperty({
    description: 'Enterprise value to EBITDA ratio',
    example: -37.24,
  })
  @Expose()
  enterpriseToEbitda: number;

  // Profitability metrics
  @ApiProperty({ description: 'Profit margins', example: -0.95135 })
  @Expose()
  profitMargins: number;

  @ApiProperty({
    description: 'Trailing 12-month earnings per share',
    example: -0.79,
  })
  @Expose()
  trailingEps: number;

  // Ownership structure
  @ApiProperty({ description: 'Total shares outstanding', example: 1805229952 })
  @Expose()
  sharesOutstanding: number;

  @ApiProperty({
    description: 'Float shares available for trading',
    example: 1513962964,
  })
  @Expose()
  floatShares: number;

  @ApiProperty({
    description: 'Percentage of shares held by insiders',
    example: 0.12776,
  })
  @Expose()
  heldPercentInsiders: number;

  @ApiProperty({
    description: 'Percentage of shares held by institutions',
    example: 0.25067,
  })
  @Expose()
  heldPercentInstitutions: number;

  // Short interest
  @ApiProperty({
    description: 'Number of shares sold short',
    example: 58395451,
  })
  @Expose()
  sharesShort: number;

  @ApiProperty({ description: 'Days to cover short positions', example: 2.11 })
  @Expose()
  shortRatio: number;

  @ApiProperty({
    description: 'Percentage of float that is short',
    example: 0.0359,
  })
  @Expose()
  shortPercentOfFloat: number;

  // Growth and performance
  @ApiProperty({ description: 'Price/earnings to growth ratio', example: 3.58 })
  @Expose()
  pegRatio: number;

  @ApiProperty({ description: '52-week price change', example: 1.6210527 })
  @Expose()
  weekChange52: number;

  @ApiProperty({
    description: 'S&P 500 change over same 52-week period',
    example: 0.32111573,
  })
  @Expose()
  spWeekChange52: number;

  // Financial dates
  @ApiProperty({ description: 'Last fiscal year end date' })
  @Expose()
  lastFiscalYearEnd: Date;

  @ApiProperty({ description: 'Most recent quarter end date' })
  @Expose()
  mostRecentQuarter: Date;

  // Associated quote (one-to-one relationship)
  @ApiProperty({
    description: 'Associated stock quote',
    type: () => StockQuoteDto,
  })
  @Expose()
  @Type(() => StockQuoteDto)
  quote: StockQuoteDto;

  // Backward compatibility property
  @ApiProperty({
    description: 'Associated stock quotes (deprecated, use quote instead)',
    type: [StockQuoteDto],
  })
  @Expose()
  @Type(() => StockQuoteDto)
  get quotes(): StockQuoteDto[] {
    return this.quote ? [this.quote] : [];
  }

  set quotes(value: StockQuoteDto[]) {
    if (value && value.length > 0) {
      this.quote = value[0];
    }
  }

  @ApiProperty({ description: 'Stock ID this statistic belongs to' })
  @Expose()
  stockId: string;
}
