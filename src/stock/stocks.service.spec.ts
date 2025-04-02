import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of } from 'rxjs';
import { Repository } from 'typeorm';
import { CompaniesService } from '../company/companies.service';
import { Company } from '../company/company.entity';
import { EmbeddingsService } from '../embedding/embeddings.service';
import { StockQuote } from '../stockquote/stock-quote.entity';
import { StockStatistic } from '../stockstatistic/stock-statistic.entity';
import { StockStatisticService } from '../stockstatistic/stock-statistic.service';
import { STOCK_EXCHANGE, STOCK_TYPE } from './constants';
import { AiMarketAnalysisService } from './services/ai-market-analysis.service';
import { Stock } from './stock.entity';
import { StocksService } from './stocks.service';

jest.mock('yahoo-finance2', () => ({
  quote: jest.fn(),
}));

describe('StocksService', () => {
  let service: StocksService;
  let stockRepository: Repository<Stock>;
  let stockQuoteRepository: Repository<StockQuote>;
  let stockStatisticRepository: Repository<StockStatistic>;
  let httpService: HttpService;
  let configService: ConfigService;
  let embeddingsService: EmbeddingsService;
  let aiMarketAnalysisService: AiMarketAnalysisService;
  let companiesService: CompaniesService;
  let stockStatisticService: StockStatisticService;

  const mockStockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  const mockStockQuoteRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getRawOne: jest.fn().mockResolvedValue({ maxDate: new Date() }),
      clone: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(10),
    })),
  };

  const mockStockStatisticRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockEmbeddingsService = {
    createEmbedding: jest.fn(),
  };

  const mockAiMarketAnalysisService = {
    generateMarketAnalysis: jest.fn(),
    generateCustomAnalysis: jest.fn(),
  };

  const mockCompaniesService = {
    findByTicker: jest.fn(),
  };

  const mockStockStatisticService = {
    createStatisticFromYahooData: jest.fn(),
  };

  const loggerSpy = jest
    .spyOn(Logger.prototype, 'log')
    .mockImplementation(() => undefined);
  const loggerErrorSpy = jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => undefined);
  const loggerWarnSpy = jest
    .spyOn(Logger.prototype, 'warn')
    .mockImplementation(() => undefined);

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StocksService,
        {
          provide: getRepositoryToken(Stock),
          useValue: mockStockRepository,
        },
        {
          provide: getRepositoryToken(StockQuote),
          useValue: mockStockQuoteRepository,
        },
        {
          provide: getRepositoryToken(StockStatistic),
          useValue: mockStockStatisticRepository,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EmbeddingsService,
          useValue: mockEmbeddingsService,
        },
        {
          provide: AiMarketAnalysisService,
          useValue: mockAiMarketAnalysisService,
        },
        {
          provide: CompaniesService,
          useValue: mockCompaniesService,
        },
        {
          provide: StockStatisticService,
          useValue: mockStockStatisticService,
        },
      ],
    }).compile();

    service = module.get<StocksService>(StocksService);
    stockRepository = module.get<Repository<Stock>>(getRepositoryToken(Stock));
    stockQuoteRepository = module.get<Repository<StockQuote>>(
      getRepositoryToken(StockQuote),
    );
    stockStatisticRepository = module.get<Repository<StockStatistic>>(
      getRepositoryToken(StockStatistic),
    );
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    embeddingsService = module.get<EmbeddingsService>(EmbeddingsService);
    aiMarketAnalysisService = module.get<AiMarketAnalysisService>(
      AiMarketAnalysisService,
    );
    companiesService = module.get<CompaniesService>(CompaniesService);
    stockStatisticService = module.get<StockStatisticService>(
      StockStatisticService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('importStockList', () => {
    it('should import stock list successfully', async () => {
      const mockResponse = {
        data: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            exchangeShortName: STOCK_EXCHANGE.NASDAQ,
            type: STOCK_TYPE.STOCK,
          },
          {
            symbol: 'MSFT',
            name: 'Microsoft Corporation',
            exchangeShortName: STOCK_EXCHANGE.NASDAQ,
            type: STOCK_TYPE.STOCK,
          },
          {
            symbol: 'INVALID',
            name: 'Invalid Stock',
            exchangeShortName: 'NYSE',
            type: STOCK_TYPE.STOCK,
          },
        ],
      };

      mockConfigService.get.mockReturnValue('fake-api-key');
      mockHttpService.get.mockReturnValue(of(mockResponse));

      await service.importStockList();

      // Only NASDAQ stocks should be saved
      expect(mockStockRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({
          ticker: 'AAPL',
          name: 'Apple Inc.',
          exchange: STOCK_EXCHANGE.NASDAQ,
        }),
        expect.objectContaining({
          ticker: 'MSFT',
          name: 'Microsoft Corporation',
          exchange: STOCK_EXCHANGE.NASDAQ,
        }),
      ]);
      expect(loggerSpy).toHaveBeenCalledWith('Stock list imported');
    });

    it('should handle errors during import', async () => {
      const error = new Error('API error');
      mockConfigService.get.mockReturnValue('fake-api-key');
      mockHttpService.get.mockImplementation(() => {
        throw error;
      });

      await expect(service.importStockList()).rejects.toThrow(error);
      expect(loggerErrorSpy).toHaveBeenCalledWith(error.message);
    });
  });

  describe('getStockStatic', () => {
    it('should return static stock information', async () => {
      const mockStock = {
        id: '1',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        exchange: STOCK_EXCHANGE.NASDAQ,
        company: {
          id: 1,
          name: 'Apple Inc.',
          sector: 'Technology',
          industry: 'Consumer Electronics',
        } as Company,
        lastUpdated: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        companyId: 1,
        watchListEntries: [],
        quotes: [],
        statistics: [],
      } as Stock;

      mockStockRepository.findOne.mockResolvedValue(mockStock);

      const result = await service.getStockStatic('AAPL');

      expect(result).toEqual(mockStock);
      expect(mockStockRepository.findOne).toHaveBeenCalledWith({
        where: { ticker: 'AAPL' },
        relations: ['company'],
      });
    });

    it('should return null if stock not found', async () => {
      mockStockRepository.findOne.mockResolvedValue(null);

      const result = await service.getStockStatic('UNKNOWN');

      expect(result).toBeNull();
    });
  });

  describe('getTopStocksByMarketCap', () => {
    it('should return top stocks by market cap', async () => {
      const mockStockQuotes = [
        {
          id: '1',
          stock: {
            id: '1',
            ticker: 'AAPL',
            name: 'Apple Inc.',
          } as Stock,
          marketCap: 3000000000000,
          price: 200.5,
          changesPercentage: 1.5,
          date: new Date(),
          statistic: null,
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as StockQuote,
        {
          id: '2',
          stock: {
            id: '2',
            ticker: 'MSFT',
            name: 'Microsoft Corporation',
          } as Stock,
          marketCap: 2800000000000,
          price: 350.75,
          changesPercentage: -0.5,
          date: new Date(),
          statistic: null,
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as StockQuote,
      ];

      mockStockQuoteRepository
        .createQueryBuilder()
        .getMany.mockResolvedValue(mockStockQuotes);

      jest
        .spyOn(service, 'getTopStocksByMarketCap')
        .mockResolvedValue(mockStockQuotes);

      const result = await service.getTopStocksByMarketCap();

      expect(result).toEqual(mockStockQuotes);
    });

    it('should return empty array if no quotes found', async () => {
      mockStockQuoteRepository
        .createQueryBuilder()
        .getRawOne.mockResolvedValue({ maxDate: null });

      jest.spyOn(service, 'getTopStocksByMarketCap').mockResolvedValue([]);

      const result = await service.getTopStocksByMarketCap();

      expect(result).toEqual([]);
    });
  });

  describe('getMarketSummary', () => {
    it('should return market summary with AI analysis', async () => {
      const mockCompositeData = {
        price: 15000,
        change: 150,
        changesPercentage: 1.2,
        volume: 1000000000,
        dayHigh: 15100,
        dayLow: 14900,
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
        sentiment: 'positive',
        timestamp: Date.now() / 1000,
        previousClose: 14850,
        open: 14900,
        marketState: 'REGULAR',
        fiftyDayAverage: 14800,
        twoHundredDayAverage: 14500,
        fiftyTwoWeekHigh: 15200,
        fiftyTwoWeekLow: 14000,
        averageDailyVolume3Month: 950000000,
        averageDailyVolume10Day: 1100000000,
        exchangeTimezoneName: 'America/New_York',
        exchangeTimezoneShortName: 'EDT',
      };

      const mockAnalysis = {
        overallMarketSentiment: 'The market showed positive momentum today.',
        keyTechnicalIndicatorsAndMarketBreadth:
          'Technical indicators are strong.',
        volumeAnalysisAndTradingActivity: 'Trading volume was above average.',
        peRatioEvaluation: 'P/E ratios are slightly above historical averages.',
        keyPointsToWatch: 'Watch for continuation of this trend tomorrow.',
        recommendations: 'Consider maintaining current positions.',
      };

      jest
        .spyOn(service as any, 'getNasdaqComposite')
        .mockResolvedValue(mockCompositeData);
      mockAiMarketAnalysisService.generateMarketAnalysis.mockResolvedValue(
        mockAnalysis,
      );

      const testDate = new Date('2023-01-01');
      const result = await service.getMarketSummary(testDate);

      expect(result).toEqual(
        expect.objectContaining({
          date: '2023-01-01',
          exchange: STOCK_EXCHANGE.NASDAQ,
          compositeIndex: expect.objectContaining({
            price: 15000,
            change: 150,
            changePercent: 1.2,
          }),
          stats: expect.objectContaining({
            totalMarketCap: 25000000000000,
            marketCapChangePercent: 1.5,
          }),
          breadth: expect.objectContaining({
            sentiment: 'positive',
            advanceDeclineRatio: 1.5,
          }),
          aiAnalysis: mockAnalysis,
        }),
      );

      expect(
        mockAiMarketAnalysisService.generateMarketAnalysis,
      ).toHaveBeenCalled();
    });
  });

  describe('getStock', () => {
    it('should return stock with quotes and statistics', async () => {
      const mockStock = {
        id: '1',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        exchange: STOCK_EXCHANGE.NASDAQ,
        quotes: [
          {
            id: '1',
            date: new Date(),
            price: 200.5,
            change: 3.25,
            changesPercentage: 1.65,
            volume: 80000000,
            marketCap: 3000000000000,
          } as StockQuote,
        ],
        statistics: [
          {
            id: '1',
            date: new Date(),
            enterpriseValue: 3100000000000,
            forwardPE: 25.5,
            priceToBook: 35.2,
          } as StockStatistic,
        ],
        company: {
          id: 1,
          name: 'Apple Inc.',
          sector: 'Technology',
          industry: 'Consumer Electronics',
        } as Company,
        lastUpdated: new Date(),
        companyId: 1,
        watchListEntries: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Stock;

      mockStockRepository.findOne.mockResolvedValue(mockStock);

      const mockAnalysis = {
        analysisStructured: {
          ticker: 'AAPL',
          analysis: {
            companyProfile: 'Apple Inc. (AAPL)',
            valuation: 'Valuation analysis...',
            performance: 'Performance analysis...',
            ownership: 'Ownership analysis...',
            shortInterest: 'Short interest analysis...',
            strengthsAndRisks: 'Strengths and risks analysis...',
            summary: 'Overall summary...',
            sentiment: 'bullish' as 'bullish',
          },
        },
      };

      jest
        .spyOn(service, 'generateStockAnalysis')
        .mockResolvedValue(mockAnalysis);

      const result = await service.getStock('AAPL');

      expect(result).toEqual(mockStock);
      expect(mockStockRepository.findOne).toHaveBeenCalledWith({
        where: { ticker: 'AAPL' },
        relations: ['company'],
      });
    });

    it('should return null if stock not found', async () => {
      mockStockRepository.findOne.mockResolvedValue(null);

      const result = await service.getStock('UNKNOWN');

      expect(result).toBeNull();
      expect(mockStockRepository.findOne).toHaveBeenCalledWith({
        where: { ticker: 'UNKNOWN' },
        relations: ['company'],
      });
    });
  });

  describe('generateStockAnalysis', () => {
    it('should generate analysis for stock with data', async () => {
      const mockStock = {
        id: '1',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        exchange: STOCK_EXCHANGE.NASDAQ,
        quotes: [
          {
            id: '1',
            date: new Date(),
            price: 200.5,
            change: 3.25,
            changesPercentage: 1.65,
            volume: 80000000,
            marketCap: 3000000000000,
          } as StockQuote,
        ],
        statistics: [
          {
            id: '1',
            date: new Date(),
            enterpriseValue: 3100000000000,
            forwardPE: 25.5,
            priceToBook: 35.2,
          } as StockStatistic,
        ],
        company: {
          id: 1,
          name: 'Apple Inc.',
          sector: 'Technology',
          industry: 'Consumer Electronics',
        } as Company,
        lastUpdated: new Date(),
        companyId: 1,
        watchListEntries: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Stock;

      const mockAnalysisData = {
        ticker: 'AAPL',
        analysis: {
          companyProfile: 'Apple Inc. (AAPL)',
          valuation: 'Valuation analysis...',
          performance: 'Performance analysis...',
          ownership: 'Ownership analysis...',
          shortInterest: 'Short interest analysis...',
          strengthsAndRisks: 'Strengths and risks analysis...',
          summary: 'Overall summary...',
          sentiment: 'bullish' as
            | 'bullish'
            | 'bearish'
            | 'neutral'
            | 'very_bullish'
            | 'very_bearish',
        },
      };

      mockAiMarketAnalysisService.generateCustomAnalysis.mockResolvedValue(
        JSON.stringify(mockAnalysisData),
      );

      jest
        .spyOn(service as any, 'formatStockAnalysisPrompt')
        .mockReturnValue('Mocked prompt');

      jest
        .spyOn(service as any, 'extractStructuredData')
        .mockReturnValue(mockAnalysisData);

      const expectedResult = {
        analysisStructured: mockAnalysisData,
      };

      jest
        .spyOn(service, 'generateStockAnalysis')
        .mockResolvedValue(expectedResult);

      const result = await service.generateStockAnalysis(mockStock);

      expect(result).toEqual(expectedResult);
    });

    it('should return default analysis if stock has insufficient data', async () => {
      const mockStock = {
        id: '1',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        exchange: STOCK_EXCHANGE.NASDAQ,
        quotes: [],
        statistics: [],
        company: {
          id: 1,
          name: 'Apple Inc.',
          sector: 'Technology',
          industry: 'Consumer Electronics',
        } as Company,
        lastUpdated: new Date(),
        companyId: 1,
        watchListEntries: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Stock;

      const expectedResult = {
        analysisStructured: {
          ticker: 'AAPL',
          analysis: {
            companyProfile: 'Apple Inc. (AAPL)',
            valuation: 'Insufficient data',
            performance: 'Insufficient data',
            ownership: 'Insufficient data',
            shortInterest: 'Insufficient data',
            strengthsAndRisks: 'Insufficient data available',
            summary: 'Insufficient data available to generate analysis.',
            sentiment: 'neutral' as 'neutral',
          },
        },
      };

      const result = await service.generateStockAnalysis(mockStock);

      expect(result).toEqual(expectedResult);
      expect(
        mockAiMarketAnalysisService.generateCustomAnalysis,
      ).not.toHaveBeenCalled();
    });
  });
});
