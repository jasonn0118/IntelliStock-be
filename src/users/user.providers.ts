import { DataSource } from 'typeorm';
import { User } from './user.entity';
import { DatabaseConnection, UserRepository } from 'src/constants/constants';

export const userProviders = [
  {
    provide: UserRepository,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(User),
    inject: [DatabaseConnection],
  },
];
