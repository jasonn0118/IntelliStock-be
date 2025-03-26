import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class MarketStatsDto {
  @ApiProperty({
    description: 'Total market capitalization of all stocks',
    example: 2500000000000000,
  })
  @IsNumber()
  totalMarketCap: number;

  @ApiProperty({
    description: 'Percentage change in market capitalization from previous day',
    example: 1.5,
  })
  @IsNumber()
  marketCapChangePercent: number;

  @ApiProperty({
    description: 'Average P/E ratio of all stocks',
    example: 25.5,
  })
  @IsNumber()
  averagePE: number;

  @ApiProperty({
    description: 'Total trading volume',
    example: 1000000000,
  })
  @IsNumber()
  totalVolume: number;

  @ApiProperty({
    description: 'Number of advancing stocks',
    example: 1500,
  })
  @IsNumber()
  advancingStocks: number;

  @ApiProperty({
    description: 'Number of declining stocks',
    example: 1000,
  })
  @IsNumber()
  decliningStocks: number;

  @ApiProperty({
    description: 'Number of unchanged stocks',
    example: 500,
  })
  @IsNumber()
  unchangedStocks: number;

  @ApiProperty({
    description: 'Ratio of advancing to declining stocks',
    example: 1.5,
  })
  @IsNumber()
  advanceDeclineRatio: number;
}

export class MarketBreadthDto {
  @ApiProperty({
    description: 'Market sentiment based on price movement and breadth',
    enum: ['very positive', 'positive', 'neutral', 'negative', 'very negative'],
    example: 'positive',
  })
  @IsString()
  sentiment: string;

  @ApiProperty({
    description: 'Number of advancing stocks',
    example: 1500,
  })
  @IsNumber()
  advancingCount: number;

  @ApiProperty({
    description: 'Number of declining stocks',
    example: 1000,
  })
  @IsNumber()
  decliningCount: number;

  @ApiProperty({
    description: 'Number of unchanged stocks',
    example: 500,
  })
  @IsNumber()
  unchangedCount: number;

  @ApiProperty({
    description: 'Ratio of advancing to declining stocks',
    example: 1.5,
  })
  @IsNumber()
  advanceDeclineRatio: number;
}

export class CompositeIndexDto {
  @ApiProperty({
    description: 'Current price of the composite index',
    example: 15000.5,
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    description: 'Price change from previous close',
    example: 150.25,
  })
  @IsNumber()
  change: number;

  @ApiProperty({
    description: 'Percentage change from previous close',
    example: 1.01,
  })
  @IsNumber()
  changePercent: number;

  @ApiProperty({
    description: 'Trading volume',
    example: 2500000000,
  })
  @IsNumber()
  volume: number;
}
