import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class MarketCacheService {
  private readonly logger = new Logger(MarketCacheService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async cacheMarketData(
    key: string,
    data: any,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      const ttlMs = ttlSeconds || 24 * 60 * 60 * 1000;
      await this.cacheService.set(key, data, ttlMs);
      this.logger.log(`Cached ${key} for 24 hours`);
    } catch (error) {
      this.logger.error(`Failed to cache ${key}:`, error);
      throw error;
    }
  }

  async getCachedMarketData(key: string): Promise<any> {
    try {
      return await this.cacheService.get(key);
    } catch (error) {
      this.logger.error(`Failed to get cached ${key}:`, error);
      return null;
    }
  }

  async invalidateCache(key: string): Promise<void> {
    try {
      await this.cacheService.delete(key);
      this.logger.log(`Invalidated cache for ${key}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for ${key}:`, error);
      throw error;
    }
  }
}
