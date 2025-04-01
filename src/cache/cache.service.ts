import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cacheable } from 'cacheable';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject('CACHE_INSTANCE') private readonly cache: Cacheable) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      this.logger.debug(`Getting cached data for key: ${key}`);
      const data = await this.cache.get<T>(key);
      this.logger.debug(`Cache ${key}: ${data ? 'HIT' : 'MISS'}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get cached ${key}:`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const ttlToUse = ttl || 24 * 60 * 60 * 1000; // Default to 24 hours if not specified
      this.logger.debug(`Caching data for key: ${key} with TTL: ${ttlToUse}ms`);
      await this.cache.set(key, value, ttlToUse);
      this.logger.debug(`Successfully cached ${key}`);
    } catch (error) {
      this.logger.error(`Failed to cache ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      this.logger.debug(`Deleting cached data for key: ${key}`);
      await this.cache.delete(key);
      this.logger.debug(`Successfully deleted cache for ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache for ${key}:`, error);
    }
  }

  /**
   * Check if a key exists in the cache
   */
  async has(key: string): Promise<boolean> {
    try {
      return await this.cache.has(key);
    } catch (error) {
      this.logger.error(`Failed to check if ${key} exists in cache:`, error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      this.logger.debug('Clearing all cache');
      await this.cache.clear();
      this.logger.debug('Cache cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
    }
  }
}
