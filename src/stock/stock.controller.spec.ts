import { Test, TestingModule } from '@nestjs/testing';
import { Company } from '../company/company.entity';
import { MarketSummaryResponseDto } from './dtos/market-summary.dto';
import { SearchStockDto } from './dtos/search-stock.dto';
import { StockDataScheduler } from './scheduler/stock-data.scheduler';
import { MarketCacheService } from './services/market-cache.service';
import { Stock } from './stock.entity';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';

describe('StocksController', () => {
  let controller: StocksController;
  let service: StocksService;

  const mockStocksService = {
    getMarketSummary: jest.fn(),
    searchStocks: jest.fn(),
    getStock: jest.fn(),
    getTopStocksByMarketCap: jest.fn(),
    getTopGainers: jest.fn(),
    getTopLosers: jest.fn(),
    getAllSymbols: jest.fn(),
    importStockList: jest.fn(),
    fetchAndSaveDailyQuotes: jest.fn(),
    generateAndStoreMarketSummaries: jest.fn(),
    getTopStocks: jest.fn(),
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

  describe('getStock', () => {
    it('should return stock data', async () => {
      const mockCompany: Company = {
        id: 1,
        ticker: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        industry: 'Technology',
        sector: 'Consumer Electronics',
        website: 'https://www.apple.com',
        description: 'Technology company',
        stock: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockStock: Stock = {
        id: '1',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        exchange: 'NASDAQ',
        lastUpdated: new Date(),
        quotes: [],
        companyId: 1,
        company: mockCompany,
        watchListEntries: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockStocksService.getStock.mockResolvedValue(mockStock);

      const result = await controller.getStock('AAPL');
      expect(result).toEqual(mockStock);
      expect(service.getStock).toHaveBeenCalledWith('AAPL');
    });
  });

  describe('getTopStocks', () => {
    it('should return top stocks by market cap and gainers', async () => {
      const mockMarketCapStocks = [
        {
          stock: { ticker: 'AAPL', name: 'Apple Inc.' },
          price: 150.25,
          marketCap: 2500000000000,
          changesPercentage: 1.5,
        },
      ];

      const mockGainerStocks = [
        {
          stock: { ticker: 'MSFT', name: 'Microsoft Corporation' },
          price: 300.5,
          changesPercentage: 2.5,
        },
      ];

      const expectedResponse = {
        marketCap: mockMarketCapStocks.map((quote) => ({
          symbol: quote.stock.ticker,
          name: quote.stock.name,
          price: quote.price,
          marketCap: quote.marketCap,
          changesPercentage: quote.changesPercentage,
          stock: quote.stock,
        })),
        gainers: mockGainerStocks.map((quote) => ({
          symbol: quote.stock.ticker,
          name: quote.stock.name,
          price: quote.price,
          changesPercentage: quote.changesPercentage,
          stock: quote.stock,
        })),
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
});
