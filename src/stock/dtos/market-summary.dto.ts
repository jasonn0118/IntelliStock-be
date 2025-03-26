import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsString } from 'class-validator';
import { MarketAnalysisResponse } from '../services/ai-market-analysis.service';
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

  @ApiProperty({
    required: false,
    description: 'AI-generated market analysis',
    type: Object,
    example: {
      overallMarketSentiment:
        'The NASDAQ Composite Index closed at 18,271.855, reflecting a modest increase of 83.26367 points or 0.4578%. Despite the positive price movement, the broader market sentiment remains neutral.',
      keyTechnicalIndicatorsAndMarketBreadth:
        'The advance/decline ratio highlights a challenging market environment, with 415 stocks advancing against 853 declining and 8 unchanged.',
      volumeAnalysisAndTradingActivity:
        'Trading volume for the session registered at 4.81B shares, which is below the average daily volume.',
      peRatioEvaluation:
        'The average P/E ratio stands at 25.8, slightly above historical norms, suggesting elevated valuations.',
      keyPointsToWatch:
        'Monitor volume trends in the next session for confirmation of market direction.',
      recommendations:
        'Consider maintaining a balanced portfolio allocation with a focus on quality stocks.',
    },
  })
  aiAnalysis?: MarketAnalysisResponse;
}
