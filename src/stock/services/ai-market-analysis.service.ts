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
        - Price: ${compositeIndex.price}
        - Change: ${compositeIndex.change}
        - Change Percent: ${compositeIndex.changePercent}%
        - Volume: ${compositeIndex.volume}
        
        Market Statistics:
        - Total Market Cap: ${stats.totalMarketCap}
        - Market Cap Change: ${stats.marketCapChangePercent}%
        - Average P/E Ratio: ${stats.averagePE}
        - Total Volume: ${stats.totalVolume}
        - Advancing Stocks: ${stats.advancingStocks}
        - Declining Stocks: ${stats.decliningStocks}
        - Unchanged Stocks: ${stats.unchangedStocks}
        
        Market Breadth:
        - Sentiment: ${breadth.sentiment}
        - Advancing Count: ${breadth.advancingCount}
        - Declining Count: ${breadth.decliningCount}
        - Unchanged Count: ${breadth.unchangedCount}
        - Advance/Decline Ratio: ${breadth.advanceDeclineRatio}
        
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
}
