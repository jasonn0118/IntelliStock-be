import { Test, TestingModule } from '@nestjs/testing';
import { StockDataScheduler } from './stock-data.scheduler';
import { StocksService } from '../stocks.service';


describe('StockDataScheduler', () => {
  let scheduler: StockDataScheduler;
  let stocksService: StocksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockDataScheduler,
        {
          provide: StocksService,
          useValue: {
            getAllSymbols: jest.fn().mockResolvedValue(['AAPL', 'MSFT', 'TSLA']),
            fetchAndSaveDailyQuotes: jest.fn().mockResolvedValue(undefined),
            fetchAndSaveHistoricalQuotes: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    scheduler = module.get<StockDataScheduler>(StockDataScheduler);
    stocksService = module.get<StocksService>(StocksService);
  });

  it('should update daily quotes', async () => {
    await scheduler.updateDailyQuotes();
    expect(stocksService.fetchAndSaveDailyQuotes).toHaveBeenCalled();
  });

  it('should update historical data', async () => {
  await scheduler.updateHistoricalQuotes();
    expect(stocksService.fetchAndSaveHistoricalQuotes).toHaveBeenCalled();
  });
});