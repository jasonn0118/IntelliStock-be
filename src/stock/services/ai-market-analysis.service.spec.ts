import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AiMarketAnalysisService } from './ai-market-analysis.service';

const mockChatCompletions = {
  create: jest.fn(),
};

jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: mockChatCompletions,
    },
  })),
}));

describe('AiMarketAnalysisService', () => {
  let service: AiMarketAnalysisService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('fake-api-key'),
  };

  const loggerErrorSpy = jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => undefined);

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiMarketAnalysisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AiMarketAnalysisService>(AiMarketAnalysisService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateMarketAnalysis', () => {
    const mockMarketInput = {
      date: new Date('2023-01-01'),
      exchange: 'NASDAQ',
      compositeIndex: {
        price: 15000.5,
        change: 150.25,
        changePercent: 1.02,
        volume: 1000000000,
      },
      stats: {
        totalMarketCap: 25000000000000,
        marketCapChangePercent: 1.5,
        averagePE: 22.5,
        totalVolume: 1500000000,
        advancingStocks: 3000,
        decliningStocks: 2000,
        unchangedStocks: 500,
        advanceDeclineRatio: 1.5,
      },
      breadth: {
        advancingCount: 3000,
        decliningCount: 2000,
        unchangedCount: 500,
        advanceDeclineRatio: 1.5,
        sentiment: 'positive',
      },
    };

    const mockAnalysisResponse = {
      overallMarketSentiment: 'The market showed positive momentum today.',
      keyTechnicalIndicatorsAndMarketBreadth:
        'Technical indicators are strong.',
      volumeAnalysisAndTradingActivity: 'Trading volume was above average.',
      peRatioEvaluation: 'P/E ratios are slightly above historical averages.',
      keyPointsToWatch: 'Watch for continuation of this trend tomorrow.',
      recommendations: 'Consider maintaining current positions.',
    };

    it('should generate market analysis successfully', async () => {
      mockChatCompletions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysisResponse),
            },
          },
        ],
      });

      const result = await service.generateMarketAnalysis(mockMarketInput);

      expect(result).toEqual(mockAnalysisResponse);
      expect(configService.get).toHaveBeenCalledWith('OPENAI_API_KEY');
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockChatCompletions.create.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.generateMarketAnalysis(mockMarketInput);

      expect(result.overallMarketSentiment).toContain('Error');
      expect(result.keyTechnicalIndicatorsAndMarketBreadth).toBe(
        'Data unavailable',
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error generating market analysis'),
      );
    });
  });

  describe('generateCustomAnalysis', () => {
    const mockPrompt = 'Analyze this stock market data';
    const mockResponse = 'This is a detailed analysis of the stock market data';

    it('should generate custom analysis successfully', async () => {
      mockChatCompletions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: mockResponse,
            },
          },
        ],
      });

      const result = await service.generateCustomAnalysis(mockPrompt);

      expect(result).toEqual(mockResponse);
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockChatCompletions.create.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.generateCustomAnalysis(mockPrompt);

      expect(result).toContain('Error');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error generating custom analysis'),
      );
    });
  });

  describe('formatLargeNumber', () => {
    it('should format trillions correctly', () => {
      const formattedNumber = service['formatLargeNumber'](2500000000000);
      expect(formattedNumber).toBe('2.50T');
    });

    it('should format billions correctly', () => {
      const formattedNumber = service['formatLargeNumber'](3500000000);
      expect(formattedNumber).toBe('3.50B');
    });

    it('should format millions correctly', () => {
      const formattedNumber = service['formatLargeNumber'](4500000);
      expect(formattedNumber).toBe('4.50M');
    });

    it('should format smaller numbers with fixed decimals', () => {
      const formattedNumber = service['formatLargeNumber'](4500);
      expect(formattedNumber).toBe('4500.00');
    });

    it('should handle null/undefined/NaN values', () => {
      expect(service['formatLargeNumber'](null)).toBe('N/A');
      expect(service['formatLargeNumber'](undefined)).toBe('N/A');
      expect(service['formatLargeNumber'](NaN)).toBe('N/A');
    });
  });
});
