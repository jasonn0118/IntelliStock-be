import { Test, TestingModule } from '@nestjs/testing';
import { MarketSummaryResponseDto } from './dtos/market-summary.dto';
import { SearchStockDto } from './dtos/search-stock.dto';
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
    it('should return stock data for a valid ticker', async () => {
      const mockStock = {
        id: '1',
        ticker: 'AAPL',
        exchange: 'NASDAQ',
        name: 'Apple Inc.',
        lastUpdated: new Date(),
        companyId: 1,
        watchListEntries: [],
        company: {
          id: 1,
          ticker: 'AAPL',
          name: 'Apple Inc.',
          industry: 'Technology',
          sector: 'Consumer Electronics',
          website: 'https://www.apple.com',
          description:
            'Apple Inc. designs, manufactures, and markets mobile communication and media devices.',
          ceo: 'Tim Cook',
          country: 'US',
          fullTimeEmployees: '147000',
          phone: '1-408-996-1010',
          address: 'One Apple Park Way',
          city: 'Cupertino',
          state: 'CA',
          zip: '95014',
          logoUrl: 'https://example.com/logo.png',
          stock: null,
          stocks: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        quotes: [
          {
            id: '1',
            date: new Date(),
            open: 150.0,
            dayHigh: 155.0,
            dayLow: 149.0,
            yearLow: 140.0,
            yearHigh: 160.0,
            price: 153.0,
            priceAvg50: 148.0,
            priceAvg200: 145.0,
            adjClose: 153.0,
            volume: 1000000,
            avgVolume: 950000,
            change: 3.0,
            changesPercentage: 2.0,
            eps: 6.0,
            pe: 25.5,
            marketCap: 2500000000000,
            previousClose: 150.0,
            earningsAnnouncement: new Date(),
            sharesOutstanding: 16000000000,
            timestamp: new Date(),
            stock: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        statistics: [
          {
            id: '1',
            date: new Date(),
            enterpriseValue: 2600000000000,
            forwardPE: 25.2,
            priceToBook: 35.6,
            enterpriseToRevenue: 7.6,
            enterpriseToEbitda: 20.5,
            profitMargins: 0.218,
            trailingEps: 6.3,
            sharesOutstanding: 16000000000,
            floatShares: 15800000000,
            heldPercentInsiders: 0.0004,
            heldPercentInstitutions: 0.608,
            sharesShort: 120000000,
            shortRatio: 1.2,
            shortPercentOfFloat: 0.0076,
            pegRatio: 2.8,
            weekChange52: 0.15,
            spWeekChange52: 0.1,
            lastFiscalYearEnd: new Date('2023-09-30'),
            mostRecentQuarter: new Date('2023-12-31'),
            quotes: [],
            stockId: '1',
            stock: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getStock').mockResolvedValue(mockStock);

      const result = await controller.getStock('AAPL');

      expect(result).toEqual(mockStock);
      expect(service.getStock).toHaveBeenCalledWith('AAPL');
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
});
