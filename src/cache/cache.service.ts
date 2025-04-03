import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cacheable } from 'cacheable';

interface CacheEntry {
  key: string;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cacheKeys: Map<string, CacheEntry> = new Map();

  constructor(@Inject('CACHE_INSTANCE') private readonly cache: Cacheable) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const data = await this.cache.get<T>(key);
      return data;
    } catch (error) {
      this.logger.error(`Failed to get cached ${key}:`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const ttlToUse = ttl || 24 * 60 * 60 * 1000;
      await this.cache.set(key, value, ttlToUse);

      const expiresAt = Date.now() + ttlToUse;
      this.cacheKeys.set(key, { key, expiresAt });
    } catch (error) {
      this.logger.error(`Failed to cache ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.cache.delete(key);
      this.cacheKeys.delete(key);
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
      await this.cache.clear();
      this.cacheKeys.clear();
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
    }
  }

  /**
   * Refresh the TTL for a cache key
   * @param key Cache key
   * @param ttl New TTL in milliseconds
   */
  async refreshTtl(key: string, ttl?: number): Promise<void> {
    try {
      const value = await this.get(key);
      if (value !== undefined) {
        await this.set(key, value, ttl);
      }
    } catch (error) {
      this.logger.error(`Failed to refresh TTL for ${key}:`, error);
    }
  }

  /**
   * Get remaining TTL for a cache key (estimated based on our tracking)
   * @param key Cache key
   * @returns TTL in milliseconds or undefined if key doesn't exist
   */
  getRemainingTtl(key: string): number | undefined {
    const entry = this.cacheKeys.get(key);
    if (entry) {
      const remaining = entry.expiresAt - Date.now();
      return remaining > 0 ? remaining : undefined;
    }
    return undefined;
  }

  /**
   * Get all cached keys
   * @returns Array of cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cacheKeys.keys());
  }

  /**
   * Get keys that will expire soon (within the next timeframe)
   * @param timeframe Timeframe in milliseconds (default 5 minutes)
   * @returns Array of keys that will expire soon
   */
  getExpiringSoonKeys(timeframe: number = 5 * 60 * 1000): string[] {
    const now = Date.now();
    const expiringSoon: string[] = [];

    this.cacheKeys.forEach((entry) => {
      if (entry.expiresAt - now < timeframe) {
        expiringSoon.push(entry.key);
      }
    });

    return expiringSoon;
  }

  /**
   * Get cache stats
   * @returns Object with cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    keys: string[];
    expiringSoon: string[];
    status: string;
  }> {
    const keys = this.getKeys();
    const expiringSoon = this.getExpiringSoonKeys();
    return {
      totalKeys: keys.length,
      keys,
      expiringSoon,
      status: 'available',
    };
  }
}
