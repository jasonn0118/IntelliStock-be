import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { MarketBreadthDto, MarketStatsDto } from '../dtos/market-stats.dto';

interface MarketAnalysisInput {
  date: Date;
  exchange: string;
  compositeIndex: {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  };
  stats: MarketStatsDto;
  breadth: MarketBreadthDto;
}

export interface MarketAnalysisResponse {
  overallMarketSentiment: string;
  keyTechnicalIndicatorsAndMarketBreadth: string;
  volumeAnalysisAndTradingActivity: string;
  peRatioEvaluation: string;
  keyPointsToWatch: string;
  recommendations: string;
}

@Injectable()
export class AiMarketAnalysisService {
  private readonly logger = new Logger(AiMarketAnalysisService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateMarketAnalysis(
    input: MarketAnalysisInput,
  ): Promise<MarketAnalysisResponse> {
    const { date, exchange, compositeIndex, stats, breadth } = input;

    try {
      const formattedDate = date.toISOString().split('T')[0];

      const prompt = `
        Generate a market analysis for ${exchange} on ${formattedDate} based on the following data:
        
        Composite Index:
        - Price: ${Number(compositeIndex.price).toFixed(2)}
        - Change: ${Number(compositeIndex.change).toFixed(2)}
        - Change Percent: ${Number(compositeIndex.changePercent).toFixed(2)}%
        - Volume: ${this.formatLargeNumber(compositeIndex.volume)}
        
        Market Statistics:
        - Total Market Cap: ${this.formatLargeNumber(stats.totalMarketCap)}
        - Market Cap Change: ${Number(stats.marketCapChangePercent).toFixed(2)}%
        - Average P/E Ratio: ${Number(stats.averagePE).toFixed(2)}
        - Total Volume: ${this.formatLargeNumber(stats.totalVolume)}
        - Advancing Stocks: ${stats.advancingStocks}
        - Declining Stocks: ${stats.decliningStocks}
        - Unchanged Stocks: ${stats.unchangedStocks}
        
        Market Breadth:
        - Sentiment: ${breadth.sentiment}
        - Advancing Count: ${breadth.advancingCount}
        - Declining Count: ${breadth.decliningCount}
        - Unchanged Count: ${breadth.unchangedCount}
        - Advance/Decline Ratio: ${Number(breadth.advanceDeclineRatio).toFixed(2)}
        
        Provide a market analysis in JSON format with the following structure:
        {
          "overallMarketSentiment": "A detailed paragraph about the overall market sentiment and momentum based on index performance and breadth indicators",
          "keyTechnicalIndicatorsAndMarketBreadth": "A detailed paragraph analyzing key technical indicators and market breadth metrics",
          "volumeAnalysisAndTradingActivity": "A detailed paragraph analyzing trading volume, participation, and activity patterns",
          "peRatioEvaluation": "A detailed paragraph evaluating current P/E ratios relative to historical norms",
          "keyPointsToWatch": "A detailed paragraph highlighting specific indicators or trends to monitor in the next trading session",
          "recommendations": "A detailed paragraph providing strategic recommendations based on the current market conditions"
        }
        
        Do not include any commentary, explanations, or text outside the JSON structure. Return only valid JSON that can be parsed.
        Make sure each field contains a detailed and insightful analysis.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional market analyst specializing in detailed market analysis. Your response must be in valid JSON format.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content.trim();
      const jsonResponse = JSON.parse(content) as MarketAnalysisResponse;

      return jsonResponse;
    } catch (error) {
      this.logger.error(`Error generating market analysis: ${error.message}`);
      return {
        overallMarketSentiment: `Market analysis unavailable. Error: ${error.message}`,
        keyTechnicalIndicatorsAndMarketBreadth: 'Data unavailable',
        volumeAnalysisAndTradingActivity: 'Data unavailable',
        peRatioEvaluation: 'Data unavailable',
        keyPointsToWatch: 'Data unavailable',
        recommendations: 'Data unavailable',
      };
    }
  }

  /**
   * Generate a custom analysis based on a provided prompt
   * @param prompt The complete prompt to send to the AI
   * @returns A string containing the analysis
   */
  async generateCustomAnalysis(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional financial analyst specializing in stock analysis.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      const content = response.choices[0].message.content.trim();
      return content;
    } catch (error) {
      this.logger.error(`Error generating custom analysis: ${error.message}`);
      return `Analysis unavailable. Error: ${error.message}`;
    }
  }

  /**
   * Format large numbers to use M (millions), B (billions), or T (trillions) suffixes
   */
  private formatLargeNumber(num: number): string {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';

    if (num >= 1e12) {
      return `${(num / 1e12).toFixed(2)}T`;
    } else if (num >= 1e9) {
      return `${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `${(num / 1e6).toFixed(2)}M`;
    } else {
      return num.toFixed(2);
    }
  }
}
