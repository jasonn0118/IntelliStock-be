import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { DatabaseModule } from './database/database.module';
import { DocumentModule } from './document/document.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { StockModule } from './stock/stock.module';
import { StockStatisticModule } from './stockstatistic/stock-statistic.module';
import { UserModule } from './users/user.module';
import { WatchlistModule } from './watchlist/watchlist.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({
      isGlobal: true,
      ttl: 24 * 60 * 60,
      max: 100,
    }),
    UserModule,
    AuthModule,
    StockModule,
    CompanyModule,
    WatchlistModule,
    DocumentModule,
    EmbeddingModule,
    StockStatisticModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      // This is a global pipe that will be applied to every route handler.
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
