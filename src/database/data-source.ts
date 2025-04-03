import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const isProduction = process.env.NODE_ENV === 'production';
export const appDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: isProduction
    ? ['dist/src/**/*.entity.js']
    : ['**/*.entity{.ts,.js}'],
  migrations: isProduction
    ? ['dist/src/migrations/*.js']
    : ['src/migrations/*{.ts,.js}'],
} as DataSourceOptions);
