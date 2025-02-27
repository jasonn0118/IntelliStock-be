import { Stock } from '../stock/stock.entity';
import { User } from '../users/user.entity';
import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Watchlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.watchListEntries, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Stock, (stock) => stock.watchListEntries, {
    onDelete: 'CASCADE',
  })
  stock: Stock;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
