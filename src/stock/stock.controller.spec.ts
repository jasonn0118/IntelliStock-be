import { Test, TestingModule } from '@nestjs/testing';
import { TopStockDto } from './dtos/top-stock.dto';
import { StocksContoller } from './stocks.controller';
import { StocksService } from './stocks.service';

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
});
