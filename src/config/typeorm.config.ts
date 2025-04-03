import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): Promise<TypeOrmModuleOptions> | TypeOrmModuleOptions {
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';
    return {
      type: 'postgres',
      host: this.configService.get('DB_HOST'),
      port: this.configService.get('DB_PORT'),
      username: this.configService.get('DB_USERNAME'),
      password: this.configService.get('DB_PASSWORD'),
      database: this.configService.get('DB_NAME'),
      entities: isDevelopment
        ? ['**/*.entity{.ts,.js}']
        : ['dist/src/**/*.entity{.js}'],
      synchronize: false,
      migrationsRun: true,
      migrations: isDevelopment
        ? ['src/migrations/*.ts']
        : ['dist/src/migrations/*.js'],
      extra: {
        // Ensure extension is available when TypeORM syncs
        installExtensions: true,
      },
    };
  }
}
