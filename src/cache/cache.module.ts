import { createKeyv } from '@keyv/redis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Cacheable } from 'cacheable';
import { CustomCacheInterceptor } from '../common/interceptors/custom-cache.interceptor';
import { CacheService } from './cache.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'CACHE_INSTANCE',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl =
          configService.get('REDIS_URL') || 'redis://localhost:6379';
        const secondary = createKeyv(redisUrl, {
          namespace: 'intelli-stock',
        });
        return new Cacheable({
          secondary,
          ttl: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        });
      },
    },
    CacheService,
    CustomCacheInterceptor,
  ],
  exports: ['CACHE_INSTANCE', CacheService, CustomCacheInterceptor],
})
export class CacheModule {}
