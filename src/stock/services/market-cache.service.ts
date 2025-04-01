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

  private getNextMidnight(): Date {
    const now = new Date();
    const est = new Date(
      now.toLocaleString('en-US', { timeZone: 'America/New_York' }),
    );
    const tomorrow = new Date(est);
    tomorrow.setDate(est.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  async cacheMarketData(
    key: string,
    data: any,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      const nextMidnight = this.getNextMidnight();
      const ttl =
        ttlSeconds || Math.floor((nextMidnight.getTime() - Date.now()) / 1000);

      // Convert seconds to milliseconds for the CacheService
      await this.cacheService.set(key, data, ttl * 1000);
      this.logger.log(`Cached ${key} until ${nextMidnight.toISOString()}`);
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
