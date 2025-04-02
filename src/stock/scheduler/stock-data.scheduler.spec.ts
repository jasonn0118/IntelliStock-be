import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MarketCacheService } from '../services/market-cache.service';
import { StocksService } from '../stocks.service';
import { StockDataScheduler } from './stock-data.scheduler';

describe('StockDataScheduler', () => {
  let scheduler: StockDataScheduler;
  let stocksService: StocksService;

  const mockStocksService = {
    getAllSymbols: jest.fn(),
    fetchAndSaveDailyQuotes: jest.fn(),
    fetchAndSaveHistoricalQuotes: jest.fn(),
    generateAndStoreMarketSummaries: jest.fn(),
  };

  const mockMarketCacheService = {
    getCachedMarketData: jest.fn(),
    cacheMarketData: jest.fn(),
  };

  beforeEach(async () => {
    // Mock the Logger to prevent error logs during testing
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockDataScheduler,
        {
          provide: StocksService,
          useValue: mockStocksService,
        },
        {
          provide: MarketCacheService,
          useValue: mockMarketCacheService,
        },
      ],
    }).compile();

    scheduler = module.get<StockDataScheduler>(StockDataScheduler);
    stocksService = module.get<StocksService>(StocksService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('updateDailyQuotes', () => {
    it('should update daily quotes successfully', async () => {
      mockStocksService.getAllSymbols.mockResolvedValue(['AAPL', 'GOOGL']);
      mockStocksService.fetchAndSaveDailyQuotes.mockResolvedValue(undefined);

      await scheduler.updateDailyQuotes();

      expect(mockStocksService.getAllSymbols).toHaveBeenCalled();
      expect(mockStocksService.fetchAndSaveDailyQuotes).toHaveBeenCalled();
    });

    it('should handle errors when updating daily quotes', async () => {
      const error = new Error('Failed to update quotes');
      mockStocksService.getAllSymbols.mockRejectedValue(error);

      await expect(scheduler.updateDailyQuotes()).rejects.toThrow(
        'Failed to update quotes',
      );
    });
  });

  describe('handleGenerateMarketSummaries', () => {
    it('should generate market summaries successfully', async () => {
      mockStocksService.generateAndStoreMarketSummaries.mockResolvedValue(
        undefined,
      );

      await scheduler.handleGenerateMarketSummaries();

      expect(
        mockStocksService.generateAndStoreMarketSummaries,
      ).toHaveBeenCalled();
    });

    it('should handle errors when generating market summaries', async () => {
      const error = new Error('Failed to generate summaries');
      mockStocksService.generateAndStoreMarketSummaries.mockRejectedValue(
        error,
      );

      await expect(scheduler.handleGenerateMarketSummaries()).rejects.toThrow(
        'Failed to generate summaries',
      );
    });
  });
});
