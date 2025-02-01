import { Stock } from 'src/stock/stock.entity';
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
  @Column({ type: 'date' })
  quoteDate: Date;

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

  // Many quotes can be associated with one stock.
  @ManyToOne(() => Stock, (stock) => stock.quotes, { onDelete: 'CASCADE' })
  stock: Stock;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
