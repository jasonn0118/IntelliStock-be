import { StockQuote } from 'src/stockquote/stock-quote.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Stock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  ticker: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  exchange: string; // NYSE, NASDAQ, etc.

  @Column({ nullable: true })
  sector: string; // Technology, Healthcare, etc.

  @Column({ nullable: true })
  industry: string; // Software, Biotechnology, etc.

  @Column({ nullable: true })
  currency: string; // USD, EUR, etc.

  // Price data – you might choose to update these fields on a schedule
  @Column('decimal', { nullable: true, precision: 10, scale: 2 })
  latestPrice: number;

  @Column('decimal', { nullable: true, precision: 10, scale: 2 })
  open: number;

  @Column('decimal', { nullable: true, precision: 10, scale: 2 })
  high: number;

  @Column('decimal', { nullable: true, precision: 10, scale: 2 })
  low: number;

  @Column('decimal', { nullable: true, precision: 10, scale: 2 })
  close: number;

  @Column({ nullable: true })
  volume: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUpdated: Date;

  // Relation to historical quotes
  @OneToMany(() => StockQuote, (quote) => quote.stock)
  quotes: StockQuote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
