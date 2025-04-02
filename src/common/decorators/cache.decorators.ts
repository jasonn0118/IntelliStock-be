import { SetMetadata } from '@nestjs/common';

/**
 * Set cache key for the endpoint
 * @param key Cache key
 */
export const CacheKey = (key: string) => SetMetadata('cache_key', key);

/**
 * Set cache TTL (Time To Live) for the endpoint in milliseconds
 * @param ttl TTL in milliseconds
 */
export const CacheTTL = (ttl: number) => SetMetadata('cache_ttl', ttl);
