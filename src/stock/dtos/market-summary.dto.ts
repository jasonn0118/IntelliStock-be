import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsString } from 'class-validator';
import {
  CompositeIndexDto,
  MarketBreadthDto,
  MarketStatsDto,
} from './market-stats.dto';

export interface MarketStats {
  totalMarketCap: number;
  marketCapChangePercent: number;
  averagePE: number;
  totalVolume: number;
  advancingStocks: number;
  decliningStocks: number;
  unchangedStocks: number;
  advanceDeclineRatio: number;
}

export interface IndexData {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface MarketBreadth {
  sentiment:
    | 'very positive'
    | 'positive'
    | 'neutral'
    | 'negative'
    | 'very negative';
  advancingCount: number;
  decliningCount: number;
  unchangedCount: number;
  advanceDeclineRatio: number;
}

export class MarketSummaryResponseDto {
  @ApiProperty({
    description: 'Date of the market summary',
    example: '2024-03-25',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Stock exchange name',
    example: 'NASDAQ',
  })
  @IsString()
  exchange: string;

  @ApiProperty({
    description: 'Composite index data',
    type: CompositeIndexDto,
  })
  compositeIndex: CompositeIndexDto;

  @ApiProperty({
    description: 'Market statistics',
    type: MarketStatsDto,
  })
  stats: MarketStatsDto;

  @ApiProperty({
    description: 'Market breadth information',
    type: MarketBreadthDto,
  })
  breadth: MarketBreadthDto;

  @ApiProperty({
    description: 'Timestamp of the data',
    example: 1711392000,
  })
  @IsNumber()
  timestamp: number;
}
