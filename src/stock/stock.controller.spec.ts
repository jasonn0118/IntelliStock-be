import { Test, TestingModule } from '@nestjs/testing';
import { TopStockDto } from './dtos/top-stock.dto';
import { StocksContoller } from './stocks.controller';
import { StocksService } from './stocks.service';
import { SearchStockDto } from './dtos/search-stock.dto';

describe('StocksController', () => {
  let stocksController: StocksContoller;
  let stocksService: StocksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StocksContoller],
      providers: [
        {
          provide: StocksService,
          useValue: {
            getTopStocksByMarketCap: jest.fn(),
            getTopGainers: jest.fn(),
            searchStocks: jest.fn(),
            getStock: jest.fn(),
            importStockList: jest.fn(),
            getAllSymbols: jest.fn(),
            fetchAndSaveDailyQuotes: jest.fn(),
          },
        },
      ],
    }).compile();

    stocksController = module.get<StocksContoller>(StocksContoller);
    stocksService = module.get<StocksService>(StocksService);
  });

  describe('getTopStocks', () => {
    it('should return top market cap and gainer stocks', async () => {
      const mockMarketCapStocks = [
        {
          stock: { ticker: 'AAPL', name: 'Apple Inc.' },
          price: 215.24,
          marketCap: 3233356804000,
          changesPercentage: 1.19893,
        },
        {
          stock: { ticker: 'MSFT', name: 'Microsoft Corporation' },
          price: 387.82,
          marketCap: 2883046123600,
          changesPercentage: 1.12119,
        },
      ];

      const mockGainerStocks = [
        {
          stock: { ticker: 'LSE', name: 'Leishen Energy Holding Co., Ltd.' },
          price: 12.5,
          changesPercentage: 66.00266,
        },
        {
          stock: { ticker: 'DGNX', name: 'Diginex Limited Ordinary Shares' },
          price: 103,
          changesPercentage: 42.93644,
        },
      ];

      jest
        .spyOn(stocksService, 'getTopStocksByMarketCap')
        .mockResolvedValue(mockMarketCapStocks as any);

      jest
        .spyOn(stocksService, 'getTopGainers')
        .mockResolvedValue(mockGainerStocks as any);

      const result = await stocksController.getTopStocks();

      expect(result).toEqual({
        marketCap: mockMarketCapStocks.map(
          (quote) =>
            new TopStockDto({
              symbol: quote.stock.ticker,
              name: quote.stock.name,
              price: quote.price,
              marketCap: quote.marketCap,
              changesPercentage: quote.changesPercentage,
            }),
        ),
        gainers: mockGainerStocks.map(
          (quote) =>
            new TopStockDto({
              symbol: quote.stock.ticker,
              name: quote.stock.name,
              price: quote.price,
              changesPercentage: quote.changesPercentage,
            }),
        ),
      });

      expect(stocksService.getTopStocksByMarketCap).toHaveBeenCalledTimes(1);
      expect(stocksService.getTopGainers).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchStocks', () => {
    it('should return an empty array when query is empty', async () => {
      jest.spyOn(stocksService, 'searchStocks').mockResolvedValue([]);
      
      const result = await stocksController.searchStocks('');
      
      expect(result).toEqual([]);
      expect(stocksService.searchStocks).toHaveBeenCalledWith('');
    });

    it('should return matching stocks ordered by relevance', async () => {
      const mockSearchResults = [
        new SearchStockDto({
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.25,
          changesPercentage: 1.5,
        }),
        new SearchStockDto({
          symbol: 'AAPX',
          name: 'Another Apple Company',
          price: 50.75,
          changesPercentage: -0.8,
        }),
      ];

      jest.spyOn(stocksService, 'searchStocks').mockResolvedValue(mockSearchResults);

      const result = await stocksController.searchStocks('AAPL');

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(SearchStockDto);
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].name).toBe('Apple Inc.');
      expect(result[0].price).toBe(150.25);
      expect(result[0].changesPercentage).toBe(1.5);
      expect(stocksService.searchStocks).toHaveBeenCalledWith('AAPL');
    });

    it('should search by both ticker and company name', async () => {
      const mockSearchResults = [
        new SearchStockDto({
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          price: 300.50,
          changesPercentage: 0.75,
        }),
      ];

      jest.spyOn(stocksService, 'searchStocks').mockResolvedValue(mockSearchResults);

      const result = await stocksController.searchStocks('Microsoft');

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('MSFT');
      expect(result[0].name).toBe('Microsoft Corporation');
      expect(stocksService.searchStocks).toHaveBeenCalledWith('Microsoft');
    });

    it('should handle no results found', async () => {
      jest.spyOn(stocksService, 'searchStocks').mockResolvedValue([]);

      const result = await stocksController.searchStocks('NonExistentStock');

      expect(result).toEqual([]);
      expect(stocksService.searchStocks).toHaveBeenCalledWith('NonExistentStock');
    });
  });
});
