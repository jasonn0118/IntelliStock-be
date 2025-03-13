import { Module, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './users/user.module';
import { APP_PIPE } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { StockModule } from './stock/stock.module';
import { CompanyModule } from './company/company.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { DocumentModule } from './document/document.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    AuthModule,
    StockModule,
    CompanyModule,
    WatchlistModule,
    DocumentModule,
    EmbeddingModule,
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
  ],
})
export class AppModule {}
