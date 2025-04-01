import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MarketSummaryResponseDto } from './dtos/market-summary.dto';
import { SearchStockDto } from './dtos/search-stock.dto';
import { StockDynamicDto } from './dtos/stock-dynamic.dto';
import { StockStaticDto } from './dtos/stock-static.dto';
import { StockDataScheduler } from './scheduler/stock-data.scheduler';
import { MarketCacheService } from './services/market-cache.service';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';

describe('StocksController', () => {
  let controller: StocksController;
  let service: StocksService;

  const mockStocksService = {
    getMarketSummary: jest.fn(),
    searchStocks: jest.fn(),
    getStock: jest.fn(),
    getStockStatic: jest.fn(),
    getTopStocksByMarketCap: jest.fn(),
    getTopGainers: jest.fn(),
    getTopLosers: jest.fn(),
    getAllSymbols: jest.fn(),
    importStockList: jest.fn(),
    fetchAndSaveDailyQuotes: jest.fn(),
    generateAndStoreMarketSummaries: jest.fn(),
    getTopStocks: jest.fn(),
    generateStockAnalysis: jest.fn(),
  };

  const mockStockDataScheduler = {
    updateDailyQuotes: jest.fn(),
    updateHistoricalQuotes: jest.fn(),
    handleGenerateMarketSummaries: jest.fn(),
  };

  const mockMarketCacheService = {
    getCachedMarketData: jest.fn(),
    cacheMarketData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StocksController],
      providers: [
        {
          provide: StocksService,
          useValue: mockStocksService,
        },
        {
          provide: StockDataScheduler,
          useValue: mockStockDataScheduler,
        },
        {
          provide: MarketCacheService,
          useValue: mockMarketCacheService,
        },
      ],
    }).compile();

    controller = module.get<StocksController>(StocksController);
    service = module.get<StocksService>(StocksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMarketSummary', () => {
    it('should return market summary data with date-specific caching', async () => {
      const testDate = '2024-03-20';
      const expectedDate = new Date(testDate);
      const mockSummary: MarketSummaryResponseDto = {
        date: testDate,
        exchange: 'NASDAQ',
        compositeIndex: {
          price: 15000,
          change: 150,
          changePercent: 1.0,
          volume: 1000000000,
        },
        stats: {
          totalMarketCap: 5000000000000,
          marketCapChangePercent: 1.5,
          averagePE: 25.5,
          totalVolume: 1000000000,
          advancingStocks: 1500,
          decliningStocks: 1000,
          unchangedStocks: 500,
          advanceDeclineRatio: 1.5,
        },
        breadth: {
          advancingCount: 1500,
          decliningCount: 1000,
          unchangedCount: 500,
          advanceDeclineRatio: 1.5,
          sentiment: 'positive',
        },
        timestamp: Date.now(),
      };

      const cacheKey = 'market-summary';
      mockMarketCacheService.getCachedMarketData.mockResolvedValue(null);
      mockStocksService.getMarketSummary.mockResolvedValue(mockSummary);
      mockMarketCacheService.cacheMarketData.mockResolvedValue(undefined);

      const result = await controller.getMarketSummary(testDate);
      expect(result).toEqual(mockSummary);
      expect(mockStocksService.getMarketSummary).toHaveBeenCalledWith(
        expectedDate,
      );
      expect(mockMarketCacheService.cacheMarketData).toHaveBeenCalledWith(
        cacheKey,
        mockSummary,
      );
    });

    it('should return cached market summary data if available', async () => {
      const testDate = '2024-03-20';
      const mockSummary: MarketSummaryResponseDto = {
        date: testDate,
        exchange: 'NASDAQ',
        compositeIndex: {
          price: 15000,
          change: 150,
          changePercent: 1.0,
          volume: 1000000000,
        },
        stats: {
          totalMarketCap: 5000000000000,
          marketCapChangePercent: 1.5,
          averagePE: 25.5,
          totalVolume: 1000000000,
          advancingStocks: 1500,
          decliningStocks: 1000,
          unchangedStocks: 500,
          advanceDeclineRatio: 1.5,
        },
        breadth: {
          advancingCount: 1500,
          decliningCount: 1000,
          unchangedCount: 500,
          advanceDeclineRatio: 1.5,
          sentiment: 'positive',
        },
        timestamp: Date.now(),
      };

      const cacheKey = 'market-summary';
      // Reset mock calls before the test
      mockStocksService.getMarketSummary.mockClear();
      mockMarketCacheService.cacheMarketData.mockClear();
      mockMarketCacheService.getCachedMarketData.mockResolvedValue(mockSummary);

      const result = await controller.getMarketSummary(testDate);
      expect(result).toEqual(mockSummary);
      expect(mockStocksService.getMarketSummary).not.toHaveBeenCalled();
      expect(mockMarketCacheService.cacheMarketData).not.toHaveBeenCalled();
    });

    it('should use current date when no date is provided', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockSummary: MarketSummaryResponseDto = {
        date: today,
        exchange: 'NASDAQ',
        compositeIndex: {
          price: 15000,
          change: 150,
          changePercent: 1.0,
          volume: 1000000000,
        },
        stats: {
          totalMarketCap: 5000000000000,
          marketCapChangePercent: 1.5,
          averagePE: 25.5,
          totalVolume: 1000000000,
          advancingStocks: 1500,
          decliningStocks: 1000,
          unchangedStocks: 500,
          advanceDeclineRatio: 1.5,
        },
        breadth: {
          advancingCount: 1500,
          decliningCount: 1000,
          unchangedCount: 500,
          advanceDeclineRatio: 1.5,
          sentiment: 'positive',
        },
        timestamp: Date.now(),
      };

      const cacheKey = 'market-summary';
      mockMarketCacheService.getCachedMarketData.mockResolvedValue(null);
      mockStocksService.getMarketSummary.mockResolvedValue(mockSummary);
      mockMarketCacheService.cacheMarketData.mockResolvedValue(undefined);

      const result = await controller.getMarketSummary();
      expect(result).toEqual(mockSummary);
      expect(mockStocksService.getMarketSummary).toHaveBeenCalledWith(
        expect.any(Date),
      );
      expect(mockMarketCacheService.cacheMarketData).toHaveBeenCalledWith(
        cacheKey,
        mockSummary,
      );
    });
  });

  describe('searchStocks', () => {
    it('should return search results', async () => {
      const mockResults: SearchStockDto[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.25,
          changesPercentage: 1.5,
        },
      ];
      mockStocksService.searchStocks.mockResolvedValue(mockResults);

      const result = await controller.searchStocks('AAPL');
      expect(result).toEqual(mockResults);
      expect(service.searchStocks).toHaveBeenCalledWith('AAPL');
    });
  });

  describe('getTopStocks', () => {
    it('should return top stocks by market cap and gainers', async () => {
      const mockMarketCapStocks = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.25,
          marketCap: 2500000000000,
          changesPercentage: 1.5,
          logoUrl:
            'https://img.logo.dev/ticker/aapl?format=webp&retina=true&token=xxx',
        },
      ];

      const mockGainerStocks = [
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          price: 300.5,
          changesPercentage: 2.5,
          logoUrl:
            'https://img.logo.dev/ticker/msft?format=webp&retina=true&token=xxx',
        },
      ];

      const expectedResponse = {
        marketCap: mockMarketCapStocks,
        gainers: mockGainerStocks,
      };

      mockMarketCacheService.getCachedMarketData.mockResolvedValue(null);
      mockStocksService.getTopStocks.mockResolvedValue(expectedResponse);
      mockMarketCacheService.cacheMarketData.mockResolvedValue(undefined);

      const result = await controller.getTopStocks();
      expect(result).toEqual(expectedResponse);
      expect(service.getTopStocks).toHaveBeenCalled();
      expect(mockMarketCacheService.cacheMarketData).toHaveBeenCalledWith(
        'top-stocks',
        expectedResponse,
      );
    });
  });

  describe('getSymbols', () => {
    it('should return all stock symbols', async () => {
      const mockSymbols = ['AAPL', 'MSFT', 'GOOGL'];
      mockStocksService.getAllSymbols.mockResolvedValue(mockSymbols);

      const result = await controller.getSymbols();
      expect(result).toEqual(mockSymbols);
      expect(service.getAllSymbols).toHaveBeenCalled();
    });
  });

  describe('importStockList', () => {
    it('should import stock list', async () => {
      await controller.importStockList();
      expect(service.importStockList).toHaveBeenCalled();
    });
  });

  describe('fetchQuotes', () => {
    it('should fetch daily quotes', async () => {
      await controller.fetchQuotes();
      expect(service.fetchAndSaveDailyQuotes).toHaveBeenCalled();
    });
  });

  describe('generateMarketSummaries', () => {
    it('should generate market summaries', async () => {
      await controller.generateMarketSummaries();
      expect(
        mockStockDataScheduler.handleGenerateMarketSummaries,
      ).toHaveBeenCalled();
    });
  });

  describe('getStockStatic', () => {
    it('should return static stock data for a valid ticker', async () => {
      const mockStock = {
        id: '1',
        ticker: 'AAPL',
        exchange: 'NASDAQ',
        name: 'Apple Inc.',
        company: {
          id: 1,
          name: 'Apple Inc.',
          industry: 'Technology',
          sector: 'Consumer Electronics',
          description:
            'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
        },
      };

      const expectedResponse = new StockStaticDto();
      Object.assign(expectedResponse, {
        id: mockStock.id,
        ticker: mockStock.ticker,
        name: mockStock.name,
        exchange: mockStock.exchange,
        company: mockStock.company,
      });

      const cacheKey = 'stock-static-AAPL';
      mockMarketCacheService.getCachedMarketData.mockResolvedValue(null);
      mockStocksService.getStockStatic.mockResolvedValue(mockStock);
      mockMarketCacheService.cacheMarketData.mockResolvedValue(undefined);

      const result = await controller.getStockStatic('AAPL');

      expect(result).toEqual(expectedResponse);
      expect(mockStocksService.getStockStatic).toHaveBeenCalledWith('AAPL');
      expect(mockMarketCacheService.cacheMarketData).toHaveBeenCalledWith(
        cacheKey,
        expectedResponse,
        7 * 24 * 60 * 60,
      );
    });

    it('should throw NotFoundException when ticker is not found', async () => {
      mockMarketCacheService.getCachedMarketData.mockResolvedValue(null);
      mockStocksService.getStockStatic.mockResolvedValue(null);

      await expect(controller.getStockStatic('INVALID')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockStocksService.getStockStatic).toHaveBeenCalledWith('INVALID');
    });
  });

  describe('getStockDynamic', () => {
    it('should return dynamic stock data for a valid ticker', async () => {
      const mockStock = {
        id: '1',
        ticker: 'AAPL',
        quotes: [{ price: 150, changesPercentage: 1.5 }],
        statistics: [{ enterpriseValue: 2600000000000 }],
      };

      const mockAnalysis = {
        analysisStructured: {
          summary: 'Mock analysis summary',
          strengths: ['Strength 1', 'Strength 2'],
          risks: ['Risk 1', 'Risk 2'],
        },
      };

      const expectedResponse = new StockDynamicDto();
      Object.assign(expectedResponse, {
        quotes: mockStock.quotes,
        statistics: mockStock.statistics,
        structuredAnalysis: mockAnalysis.analysisStructured,
        lastUpdated: expect.any(Date),
      });

      const cacheKey = 'stock-dynamic-AAPL';
      mockMarketCacheService.getCachedMarketData.mockResolvedValue(null);
      mockStocksService.getStock.mockResolvedValue(mockStock);
      mockStocksService.generateStockAnalysis.mockResolvedValue(mockAnalysis);
      mockMarketCacheService.cacheMarketData.mockResolvedValue(undefined);

      const result = await controller.getStockDynamic('AAPL');

      expect(result).toMatchObject({
        quotes: expectedResponse.quotes,
        statistics: expectedResponse.statistics,
        structuredAnalysis: expectedResponse.structuredAnalysis,
      });
      expect(mockStocksService.getStock).toHaveBeenCalledWith('AAPL');
      expect(mockStocksService.generateStockAnalysis).toHaveBeenCalledWith(
        mockStock,
      );
      expect(mockMarketCacheService.cacheMarketData).toHaveBeenCalledWith(
        cacheKey,
        expect.objectContaining({
          quotes: expectedResponse.quotes,
          statistics: expectedResponse.statistics,
          structuredAnalysis: expectedResponse.structuredAnalysis,
        }),
      );
    });

    it('should throw NotFoundException when ticker is not found', async () => {
      mockMarketCacheService.getCachedMarketData.mockResolvedValue(null);
      mockStocksService.getStock.mockResolvedValue(null);

      await expect(controller.getStockDynamic('INVALID')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockStocksService.getStock).toHaveBeenCalledWith('INVALID');
    });
  });
});
