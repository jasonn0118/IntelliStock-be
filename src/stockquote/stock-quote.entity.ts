import { Stock } from '../stock/stock.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class StockQuote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The date for which this quote is applicable (e.g., end-of-day)
  @Column({ type: 'date', nullable: true })
  date: Date;

  @Column('decimal', { nullable: true })
  open: number;

  @Column('decimal', { nullable: true })
  dayHigh: number;

  @Column('decimal', { nullable: true })
  dayLow: number;

  @Column('decimal', { nullable: true })
  yearLow: number;

  @Column('decimal', { nullable: true })
  yearHigh: number;

  @Column('decimal', { nullable: true })
  price: number;

  @Column('decimal', { nullable: true })
  priceAvg50: number;

  @Column('decimal', { nullable: true })
  priceAvg200: number;

  @Column('decimal', { nullable: true })
  adjClose: number;

  @Column({ nullable: true })
  volume: number;

  @Column('decimal', { nullable: true })
  avgVolume: number;

  @Column('decimal', { nullable: true })
  change: number;

  @Column('decimal', { nullable: true })
  changesPercentage: number;

  @Column('decimal', { nullable: true })
  eps: number;

  @Column('decimal', { nullable: true })
  pe: number;

  // Many quotes can be associated with one stock.
  @ManyToOne(() => Stock, (stock) => stock.quotes, { onDelete: 'CASCADE' })
  stock: Stock;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
