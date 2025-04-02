import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../cache/cache.service';
import { MarketCacheService } from './market-cache.service';

describe('MarketCacheService', () => {
  let service: MarketCacheService;
  let cacheService: CacheService;
  let configService: ConfigService;

  const mockCacheService = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketCacheService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MarketCacheService>(MarketCacheService);
    cacheService = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cacheMarketData', () => {
    const testKey = 'test-key';
    const testData = { value: 'test-data' };

    it('should cache data with default TTL when no TTL is provided', async () => {
      await service.cacheMarketData(testKey, testData);

      expect(cacheService.set).toHaveBeenCalledWith(
        testKey,
        testData,
        24 * 60 * 60 * 1000,
      );
      expect(Logger.prototype.log).toHaveBeenCalled();
    });

    it('should cache data with provided TTL', async () => {
      const ttl = 3600; // 1 hour in seconds
      await service.cacheMarketData(testKey, testData, ttl);

      // Check if ttl is passed correctly (service converts seconds to milliseconds internally)
      expect(cacheService.set).toHaveBeenCalledWith(
        testKey,
        testData,
        ttl * 1000,
      );
    });

    it('should handle errors gracefully and rethrow them', async () => {
      const error = new Error('Cache error');
      mockCacheService.set.mockRejectedValueOnce(error);

      await expect(service.cacheMarketData(testKey, testData)).rejects.toThrow(
        error,
      );
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('getCachedMarketData', () => {
    const testKey = 'test-key';
    const testData = { value: 'test-data' };

    it('should retrieve cached data successfully', async () => {
      mockCacheService.get.mockResolvedValueOnce(testData);

      const result = await service.getCachedMarketData(testKey);

      expect(result).toEqual(testData);
      expect(cacheService.get).toHaveBeenCalledWith(testKey);
    });

    it('should return null and log error when cache retrieval fails', async () => {
      const error = new Error('Cache retrieval error');
      mockCacheService.get.mockRejectedValueOnce(error);

      const result = await service.getCachedMarketData(testKey);

      expect(result).toBeNull();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('invalidateCache', () => {
    const testKey = 'test-key';

    it('should delete cache data successfully', async () => {
      await service.invalidateCache(testKey);

      expect(cacheService.delete).toHaveBeenCalledWith(testKey);
      expect(Logger.prototype.log).toHaveBeenCalled();
    });

    it('should handle errors gracefully and rethrow them', async () => {
      const error = new Error('Cache invalidation error');
      mockCacheService.delete.mockRejectedValueOnce(error);

      await expect(service.invalidateCache(testKey)).rejects.toThrow(error);
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });
});
