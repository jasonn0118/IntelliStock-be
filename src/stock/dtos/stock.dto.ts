import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { StockStatisticDto } from '../../stockstatistic/dtos/stock-statistic.dto';
import { CompanyDto } from '../../company/dtos/company.dto';
import { StockQuoteDto } from './stock-quote.dto';

// Define structured analysis interface
export class StockAnalysisDto {
  @ApiProperty({ description: 'Stock ticker symbol' })
  ticker: string;

  @ApiProperty({
    description: 'Analysis content sections',
    type: 'object',
    properties: {
      companyProfile: {
        type: 'string',
        description: 'Company profile summary',
      },
      valuation: { type: 'string', description: 'Valuation metrics summary' },
      performance: {
        type: 'string',
        description: 'Performance metrics summary',
      },
      ownership: { type: 'string', description: 'Ownership data summary' },
      shortInterest: {
        type: 'string',
        description: 'Short interest data summary',
      },
      strengthsAndRisks: {
        type: 'string',
        description: 'Strengths and risks assessment',
      },
      summary: { type: 'string', description: 'Overall summary' },
      sentiment: {
        type: 'string',
        description: 'Overall sentiment',
        enum: ['very_bearish', 'bearish', 'neutral', 'bullish', 'very_bullish'],
      },
    },
  })
  analysis: {
    companyProfile: string;
    valuation: string;
    performance: string;
    ownership: string;
    shortInterest: string;
    strengthsAndRisks: string;
    summary: string;
    sentiment:
      | 'very_bearish'
      | 'bearish'
      | 'neutral'
      | 'bullish'
      | 'very_bullish';
  };
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
  statistic: StockStatisticDto;

  @ApiProperty({
    description: 'AI-generated stock analysis in markdown format',
    example:
      '## 📊 Tesla, Inc. (TSLA) Analysis\n\n### 🏢 Company Profile\nTesla operates in...',
    required: false,
  })
  @Expose()
  analysis?: string;

  @ApiProperty({
    description: 'Structured AI-generated stock analysis in JSON format',
    type: StockAnalysisDto,
    required: false,
  })
  @Expose()
  structuredAnalysis?: StockAnalysisDto;
}
