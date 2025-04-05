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
    const request = context.switchToHttp().getRequest();
    if (request.method !== 'GET') {
      return next.handle();
    }

    const noCache = this.reflector.get('no_cache', context.getHandler());
    if (noCache) {
      return next.handle();
    }

    const cacheKey = this.reflector.get('cache_key', context.getHandler());
    const ttl = this.reflector.get('cache_ttl', context.getHandler());

    const key = cacheKey || `route_${request.url}`;

    try {
      const cachedData = await this.cacheService.get(key);
      if (cachedData) {
        return of(cachedData);
      }

      return next.handle().pipe(
        tap(async (data) => {
          try {
            await this.cacheService.set(key, data, ttl);
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
