import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Company } from '../company/company.entity';
import { STOCK_EXCHANGE } from './constants';
import { StockDynamicDto } from './dtos/stock-dynamic.dto';
import { StockStaticDto } from './dtos/stock-static.dto';
import { TopStockDto, TopStocksResponseDto } from './dtos/top-stock.dto';
import { StockDataScheduler } from './scheduler/stock-data.scheduler';
import { MarketCacheService } from './services/market-cache.service';
import { Stock } from './stock.entity';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';

describe('StocksController', () => {
  let controller: StocksController;
  let stocksService: StocksService;
  let marketCacheService: MarketCacheService;
  let stockDataScheduler: StockDataScheduler;

  const mockStocksService = {
    getAllSymbols: jest.fn(),
    searchStocks: jest.fn(),
    getTopStocks: jest.fn(),
    getMarketSummary: jest.fn(),
    getStockStatic: jest.fn(),
    getStock: jest.fn(),
    generateStockAnalysis: jest.fn(),
  };

  const mockStockDataScheduler = {
    updateDailyQuotes: jest.fn(),
    handleGenerateMarketSummaries: jest.fn(),
    refreshMarketCache: jest.fn(),
  };

  const mockMarketCacheService = {
    getCachedMarketData: jest.fn(),
    cacheMarketData: jest.fn(),
    invalidateCache: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
    stocksService = module.get<StocksService>(StocksService);
    stockDataScheduler = module.get<StockDataScheduler>(StockDataScheduler);
    marketCacheService = module.get<MarketCacheService>(MarketCacheService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSymbols', () => {
    it('should return a list of stock symbols', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOG'];
      mockStocksService.getAllSymbols.mockResolvedValue(symbols);

      const result = await controller.getSymbols();

      expect(result).toEqual(symbols);
      expect(mockStocksService.getAllSymbols).toHaveBeenCalled();
    });
  });

  describe('searchStocks', () => {
    it('should return stocks matching the search query', async () => {
      const searchResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150,
          changesPercentage: 1.5,
        },
        {
          symbol: 'AAPU',
          name: 'Some other company',
          price: 50,
          changesPercentage: -0.5,
        },
      ];
      mockStocksService.searchStocks.mockResolvedValue(searchResults);

      const result = await controller.searchStocks('AAP');

      expect(result).toEqual(searchResults);
      expect(mockStocksService.searchStocks).toHaveBeenCalledWith('AAP');
    });
  });

  describe('getTopStocks', () => {
    it('should return cached top stocks if available', async () => {
      const cachedTopStocks: TopStocksResponseDto = {
        marketCap: [
          new TopStockDto({
            symbol: 'AAPL',
            name: 'Apple Inc.',
            price: 200.5,
            marketCap: 3000000000000,
            changesPercentage: 1.75,
          }),
          new TopStockDto({
            symbol: 'MSFT',
            name: 'Microsoft Corporation',
            price: 350.75,
            marketCap: 2800000000000,
            changesPercentage: -0.65,
          }),
        ],
        gainers: [
          new TopStockDto({
            symbol: 'NVDA',
            name: 'NVIDIA Corporation',
            price: 950.5,
            changesPercentage: 5.25,
          }),
        ],
      };

      mockMarketCacheService.getCachedMarketData.mockResolvedValue(
        cachedTopStocks,
      );

      const result = await controller.getTopStocks();

      expect(result).toEqual(cachedTopStocks);
      expect(mockMarketCacheService.getCachedMarketData).toHaveBeenCalledWith(
        'top-stocks',
      );
      expect(mockStocksService.getTopStocks).not.toHaveBeenCalled();
    });

    it('should fetch and cache top stocks if not cached', async () => {
      const topStocks: TopStocksResponseDto = {
        marketCap: [
          new TopStockDto({
            symbol: 'AAPL',
            name: 'Apple Inc.',
            price: 200.5,
            marketCap: 3000000000000,
            changesPercentage: 1.75,
          }),
        ],
        gainers: [
          new TopStockDto({
            symbol: 'NVDA',
            name: 'NVIDIA Corporation',
            price: 950.5,
            changesPercentage: 5.25,
          }),
        ],
      };

      mockMarketCacheService.getCachedMarketData.mockResolvedValue(null);
      mockStocksService.getTopStocks.mockResolvedValue(topStocks);

      const result = await controller.getTopStocks();

      expect(result).toEqual(topStocks);
      expect(mockMarketCacheService.getCachedMarketData).toHaveBeenCalledWith(
        'top-stocks',
      );
      expect(mockStocksService.getTopStocks).toHaveBeenCalled();
      expect(mockMarketCacheService.cacheMarketData).toHaveBeenCalledWith(
        'top-stocks',
        topStocks,
      );
    });
  });

  describe('getStockStatic', () => {
    it('should return cached static stock info if available', async () => {
      const ticker = 'AAPL';
      const staticInfo: StockStaticDto = {
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
      };

      mockMarketCacheService.getCachedMarketData.mockResolvedValue(staticInfo);

      const result = await controller.getStockStatic(ticker);

      expect(result).toEqual(staticInfo);
      expect(mockMarketCacheService.getCachedMarketData).toHaveBeenCalledWith(
        'stock-static-AAPL',
      );
      expect(mockStocksService.getStockStatic).not.toHaveBeenCalled();
    });

    it('should fetch and cache static stock info if not cached', async () => {
      const ticker = 'AAPL';
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
        },
      } as Stock;

      mockMarketCacheService.getCachedMarketData.mockResolvedValue(null);
      mockStocksService.getStockStatic.mockResolvedValue(mockStock);

      const result = await controller.getStockStatic(ticker);

      expect(result).toEqual(
        expect.objectContaining({
          id: '1',
          ticker: 'AAPL',
          name: 'Apple Inc.',
          exchange: STOCK_EXCHANGE.NASDAQ,
        }),
      );
      expect(mockMarketCacheService.getCachedMarketData).toHaveBeenCalledWith(
        'stock-static-AAPL',
      );
      expect(mockStocksService.getStockStatic).toHaveBeenCalledWith(ticker);
      expect(mockMarketCacheService.cacheMarketData).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stock not found', async () => {
      const ticker = 'UNKNOWN';

      mockMarketCacheService.getCachedMarketData.mockResolvedValue(null);
      mockStocksService.getStockStatic.mockResolvedValue(null);

      await expect(controller.getStockStatic(ticker)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStockDynamic', () => {
    it('should return cached dynamic stock info if available', async () => {
      const ticker = 'AAPL';
      const dynamicInfo = new StockDynamicDto();
      Object.assign(dynamicInfo, {
        quotes: [],
        statistics: [],
        structuredAnalysis: { sentiment: 'positive' },
        lastUpdated: new Date(),
      });

      mockMarketCacheService.getCachedMarketData.mockResolvedValue(dynamicInfo);

      const result = await controller.getStockDynamic(ticker);

      expect(result).toEqual(dynamicInfo);
      expect(mockMarketCacheService.getCachedMarketData).toHaveBeenCalledWith(
        'stock-dynamic-AAPL',
      );
      expect(mockStocksService.getStock).not.toHaveBeenCalled();
    });

    it('should fetch, analyze and cache dynamic stock info if not cached', async () => {
      const ticker = 'AAPL';
      const stockData = {
        id: '1',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        quotes: [],
        statistics: [],
      } as Stock;

      const analysisResult = {
        analysisStructured: { sentiment: 'positive' },
      };

      mockMarketCacheService.getCachedMarketData.mockResolvedValue(null);
      mockStocksService.getStock.mockResolvedValue(stockData);
      mockStocksService.generateStockAnalysis.mockResolvedValue(analysisResult);

      const result = await controller.getStockDynamic(ticker);

      expect(result).toMatchObject({
        quotes: [],
        statistics: [],
        structuredAnalysis: { sentiment: 'positive' },
      });
      expect(mockMarketCacheService.getCachedMarketData).toHaveBeenCalledWith(
        'stock-dynamic-AAPL',
      );
      expect(mockStocksService.getStock).toHaveBeenCalledWith('AAPL');
      expect(mockStocksService.generateStockAnalysis).toHaveBeenCalledWith(
        stockData,
      );
      expect(mockMarketCacheService.cacheMarketData).toHaveBeenCalled();
    });

    it('should throw NotFoundException if stock not found', async () => {
      const ticker = 'UNKNOWN';

      mockMarketCacheService.getCachedMarketData.mockResolvedValue(null);
      mockStocksService.getStock.mockResolvedValue(null);

      await expect(controller.getStockDynamic(ticker)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
