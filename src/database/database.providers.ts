import { DataSource } from 'typeorm';

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    useFactory: async () => {
      const dataSource = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'root',
        password: 'root',
        database: 'intel_stock_development',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        // Turn off synchronize in production
        synchronize: true,
      });

      return dataSource.initialize();
    },
  },
];
