# Redis Caching Implementation

## Overview

IntelliStock uses Redis as a distributed caching system to improve performance and reduce load on external APIs. The implementation provides fallback to in-memory caching if Redis is unavailable, ensuring reliability.

## Configuration

Redis configuration is managed through environment variables:

```
# Redis Cache Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=86400        # 24 hours in seconds
REDIS_NAMESPACE=intelli-stock
```

## Technical Implementation

### Cache Module

The cache module (`src/cache/cache.module.ts`) provides a factory for creating the cache instance. It:

1. Reads Redis configuration from environment variables
2. Creates a Redis connection with the appropriate namespace and TTL
3. Handles Redis connection errors gracefully
4. Provides a fallback to in-memory cache if Redis is unavailable

```typescript
// Cache module factory
useFactory: (configService: ConfigService) => {
  const redisUrl = configService.get('REDIS_URL') || 'redis://localhost:6379';
  const redisNamespace = configService.get('REDIS_NAMESPACE') || 'intelli-stock';
  const redisTtl = configService.get('REDIS_TTL') || 24 * 60 * 60 * 1000;
  
  try {
    const secondary = createKeyv(redisUrl, {
      namespace: redisNamespace,
      ttl: redisTtl,
    });
    
    secondary.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    return new Cacheable({
      secondary,
      ttl: redisTtl,
    });
  } catch (error) {
    // Fallback to in-memory cache
    return new Cacheable({
      ttl: redisTtl,
    });
  }
}
```

### Cache Service

The `CacheService` (`src/cache/cache.service.ts`) provides a common interface for cache operations:

- `get()`: Retrieve data from cache
- `set()`: Store data in cache with TTL
- `delete()`: Remove data from cache
- `has()`: Check if key exists in cache
- `clear()`: Clear all cache data
- `refreshTtl()`: Refresh TTL for an existing key
- `getRemainingTtl()`: Get estimated remaining TTL for a key
- `getKeys()`: Get all cached keys
- `getExpiringSoonKeys()`: Get keys that will expire soon
- `getStats()`: Get cache statistics

### Market Cache Service

The `MarketCacheService` extends the capabilities with market-specific functionality:

- `cacheMarketData()`: Store market-related data with appropriate TTL
- `getCachedMarketData()`: Retrieve market-related data
- `invalidateCache()`: Invalidate specific cache keys
- `getCacheStats()`: Get detailed cache statistics with market-specific filtering

## Cache Invalidation Strategy

The cache implements several invalidation strategies:

1. **TTL-based invalidation**: All cache entries have a Time-To-Live (TTL) after which they expire
2. **Scheduled refresh**: Critical data like market summaries and top stocks are refreshed automatically at midnight EST
3. **Manual invalidation**: Admin endpoints allow for manual cache invalidation when needed
4. **Health monitoring**: Cache status endpoints provide visibility into cache health and contents

## Monitoring

The `/stocks/cache-status` endpoint provides detailed information about the current cache status, including:

- Cache implementation type (Redis or In-Memory)
- Total number of cached keys
- List of all cached keys
- Keys specific to market data
- Keys that will expire soon
- Default TTL configuration

## Performance Benefits

Redis caching provides several performance benefits:

1. **Reduced API calls**: External financial APIs often have rate limits and can be slow
2. **Improved response times**: Cached responses are served in milliseconds instead of seconds
3. **Distributed caching**: Multiple application instances can share the same cache
4. **Persistence**: Cache survives application restarts
5. **Scalability**: Redis can handle millions of operations per second 