import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Stock } from '../stock/stock.entity';
import { StockQuote } from '../stockquote/stock-quote.entity';

@Entity()
export class StockStatistic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Collection date
  @Column({ type: 'date', nullable: false })
  date: Date;

  // Valuation metrics
  @Column('decimal', { nullable: true })
  enterpriseValue: number;

  @Column('decimal', { nullable: true })
  forwardPE: number;

  @Column('decimal', { nullable: true })
  priceToBook: number;

  @Column('decimal', { nullable: true })
  enterpriseToRevenue: number;

  @Column('decimal', { nullable: true })
  enterpriseToEbitda: number;

  // Profitability metrics
  @Column('decimal', { nullable: true })
  profitMargins: number;

  @Column('decimal', { nullable: true })
  trailingEps: number;

  // Ownership structure
  @Column('decimal', { nullable: true })
  sharesOutstanding: number;

  @Column('decimal', { nullable: true })
  floatShares: number;

  @Column('decimal', { nullable: true })
  heldPercentInsiders: number;

  @Column('decimal', { nullable: true })
  heldPercentInstitutions: number;

  // Short interest
  @Column('decimal', { nullable: true })
  sharesShort: number;

  @Column('decimal', { nullable: true })
  shortRatio: number;

  @Column('decimal', { nullable: true })
  shortPercentOfFloat: number;

  // Growth and performance
  @Column('decimal', { nullable: true })
  pegRatio: number;

  @Column('decimal', { nullable: true, name: 'week_change_52' })
  weekChange52: number; // renamed from 52WeekChange for valid property name

  @Column('decimal', { nullable: true, name: 'sp_week_change_52' })
  spWeekChange52: number; // renamed from SandP52WeekChange

  // Financial dates
  @Column({ type: 'date', nullable: true })
  lastFiscalYearEnd: Date;

  @Column({ type: 'date', nullable: true })
  mostRecentQuarter: Date;

  // Relationships
  @OneToOne(() => StockQuote)
  @JoinColumn({ name: 'quoteId' })
  quote: StockQuote;

  @Column({ nullable: true })
  quoteId: string;

  @ManyToOne(() => Stock, (stock) => stock.statistics, { onDelete: 'CASCADE' })
  stock: Stock;

  @Column({ nullable: false })
  stockId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
