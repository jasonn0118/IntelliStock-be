import { Module, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './users/user.module';
import { APP_PIPE } from '@nestjs/core';

@Module({
  imports: [DatabaseModule, UserModule],
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
