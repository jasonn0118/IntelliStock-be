import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class CustomCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CustomCacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // Skip caching for non-GET requests
    const request = context.switchToHttp().getRequest();
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Get cache options from metadata
    const cacheKey = this.reflector.get('cache_key', context.getHandler());
    const ttl = this.reflector.get('cache_ttl', context.getHandler());

    // If no cache key is provided, use the request URL as the key
    const key = cacheKey || `route_${request.url}`;

    try {
      // Try to get data from cache
      const cachedData = await this.cacheService.get(key);
      if (cachedData) {
        this.logger.debug(`Cache hit for ${key}`);
        return of(cachedData);
      }

      // If not in cache, call the handler and cache the result
      return next.handle().pipe(
        tap(async (data) => {
          try {
            await this.cacheService.set(key, data, ttl);
            this.logger.debug(`Cached data for ${key}`);
          } catch (error) {
            this.logger.error(`Failed to cache data for ${key}:`, error);
          }
        }),
      );
    } catch (error) {
      this.logger.error('Cache error:', error);
      return next.handle();
    }
  }
}
