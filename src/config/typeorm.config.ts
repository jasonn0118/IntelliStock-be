import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): Promise<TypeOrmModuleOptions> | TypeOrmModuleOptions {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    return {
      type: 'postgres',
      host: this.configService.get('DB_HOST'),
      port: this.configService.get('DB_PORT'),
      username: this.configService.get('DB_USERNAME'),
      password: this.configService.get('DB_PASSWORD'),
      database: this.configService.get('DB_NAME'),
      entities: isProduction
        ? ['dist/src/**/*.entity.js']
        : ['**/*.entity{.ts,.js}'],
      synchronize: false,
      migrationsRun: true,
      migrations: isProduction
        ? ['src/migrations/*{.ts,.js}']
        : ['dist/src/migrations/*.js'],
      extra: {
        installExtensions: true,
      },
    };
  }
}
