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
  date: string; // YYYY-MM-DD format
  exchange: string; // e.g., "NASDAQ"
  compositeIndex: IndexData; // NASDAQ Composite data
  stats: MarketStats; // Overall market statistics
  breadth: MarketBreadth; // Market breadth information
  timestamp: number; // Unix timestamp of the data
}
