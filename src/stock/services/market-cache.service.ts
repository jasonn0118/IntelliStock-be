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
      const ttlMs = ttlSeconds ? ttlSeconds * 1000 : 24 * 60 * 60 * 1000;
      await this.cacheService.set(key, data, ttlMs);
      this.logger.log(`Cached ${key} for ${ttlMs / 1000} seconds`);
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

  /**
   * Get cache statistics
   * @returns Object with cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      const stats = await this.cacheService.getStats();
      return {
        ...stats,
        marketKeys: stats.keys.filter(
          (key) =>
            key.startsWith('market-') ||
            key.startsWith('stock-') ||
            key.startsWith('top-'),
        ),
        cacheImplementation: this.configService.get('REDIS_URL')
          ? 'Redis'
          : 'In-Memory',
        ttlConfiguration: {
          default: this.configService.get('REDIS_TTL') || 24 * 60 * 60,
          unit: 'seconds',
        },
      };
    } catch (error) {
      this.logger.error('Failed to get cache statistics:', error);
      return {
        status: 'error',
        error: error.message,
      };
    }
  }
}
