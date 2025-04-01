import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../company/company.entity';
import { StockQuote } from '../stockquote/stock-quote.entity';
import { StockStatistic } from '../stockstatistic/stock-statistic.entity';
import { Watchlist } from '../watchlist/watchlist.entity';

@Entity()
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  ticker: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  exchange: string;

  @Column({ type: 'timestamp', nullable: true })
  lastUpdated: Date;

  @OneToMany(() => StockQuote, (quote) => quote.stock)
  quotes: StockQuote[];

  @OneToMany(() => StockStatistic, (statistic) => statistic.stock)
  statistics: StockStatistic[];

  @Column({ nullable: true })
  companyId: number;

  @OneToOne(() => Company, (company) => company.stock)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @OneToMany(() => Watchlist, (watchlist) => watchlist.stock)
  watchListEntries: Watchlist[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
