import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../stock/stock.entity';
import { StockQuote } from '../stockquote/stock-quote.entity';
import { StockStatistic } from './stock-statistic.entity';
import { StockStatisticService } from './stock-statistic.service';

describe('StockStatisticService', () => {
  let service: StockStatisticService;
  let statisticRepository: Repository<StockStatistic>;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockStatisticRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockStatisticService,
        {
          provide: getRepositoryToken(StockStatistic),
          useValue: mockStatisticRepository,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StockStatisticService>(StockStatisticService);
    statisticRepository = module.get<Repository<StockStatistic>>(
      getRepositoryToken(StockStatistic),
    );
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createStatisticFromYahooData', () => {
    const stockId = '1';
    const mockStock = { id: '1', ticker: 'AAPL' } as Stock;
    const testDate = new Date('2023-01-01');
    const mockQuote = { id: '1', date: testDate } as StockQuote;

    const mockYahooStatsData = {
      enterpriseValue: 2500000000000,
      forwardPE: 25.5,
      priceToBook: 35.2,
      enterpriseToRevenue: 7.8,
      enterpriseToEbitda: 20.3,
      profitMargins: 0.218,
      trailingEps: 6.05,
      sharesOutstanding: 16000000000,
      floatShares: 15800000000,
      heldPercentInsiders: 0.0004,
      heldPercentInstitutions: 0.608,
      sharesShort: 120000000,
      shortRatio: 1.23,
      shortPercentOfFloat: 0.0076,
      pegRatio: 2.8,
      '52WeekChange': 0.15,
      SandP52WeekChange: 0.12,
      lastFiscalYearEnd: '2022-09-30',
      mostRecentQuarter: '2022-12-31',
    };

    it('should create a new statistic if none exists', async () => {
      mockStatisticRepository.findOne.mockResolvedValue(null);

      const savedStatistic = new StockStatistic();
      Object.assign(savedStatistic, {
        id: '1',
        date: testDate,
        stockId,
        stock: mockStock,
        enterpriseValue: mockYahooStatsData.enterpriseValue,
      });
      mockStatisticRepository.save.mockResolvedValue(savedStatistic);

      const result = await service.createStatisticFromYahooData(
        stockId,
        mockStock,
        testDate,
        mockYahooStatsData,
        mockQuote,
      );

      expect(mockStatisticRepository.findOne).toHaveBeenCalledWith({
        where: {
          date: testDate,
          stockId,
        },
      });
      expect(mockStatisticRepository.save).toHaveBeenCalled();
      expect(result).toEqual(savedStatistic);

      const saveArg = mockStatisticRepository.save.mock.calls[0][0];
      expect(saveArg.lastFiscalYearEnd).toBeInstanceOf(Date);
      expect(saveArg.mostRecentQuarter).toBeInstanceOf(Date);
    });

    it('should update an existing statistic if one exists', async () => {
      const existingStatistic = new StockStatistic();
      existingStatistic.id = '1';
      existingStatistic.date = testDate;
      existingStatistic.stockId = stockId;
      existingStatistic.stock = mockStock;

      mockStatisticRepository.findOne.mockResolvedValue(existingStatistic);

      const updatedStatistic = { ...existingStatistic };
      mockStatisticRepository.save.mockResolvedValue(updatedStatistic);

      const result = await service.createStatisticFromYahooData(
        stockId,
        mockStock,
        testDate,
        mockYahooStatsData,
        mockQuote,
      );

      expect(mockStatisticRepository.findOne).toHaveBeenCalled();
      expect(mockStatisticRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedStatistic);
    });

    it('should link the statistic to the provided quote', async () => {
      mockStatisticRepository.findOne.mockResolvedValue(null);
      mockStatisticRepository.save.mockImplementation((entity) => entity);

      const result = await service.createStatisticFromYahooData(
        stockId,
        mockStock,
        testDate,
        mockYahooStatsData,
        mockQuote,
      );

      expect(result.quote).toEqual(mockQuote);
      expect(result.quoteId).toEqual(mockQuote.id);
    });

    it('should handle errors gracefully and rethrow them', async () => {
      const error = new Error('Database error');
      mockStatisticRepository.findOne.mockRejectedValue(error);

      await expect(
        service.createStatisticFromYahooData(
          stockId,
          mockStock,
          testDate,
          mockYahooStatsData,
        ),
      ).rejects.toThrow(error);

      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });
});
