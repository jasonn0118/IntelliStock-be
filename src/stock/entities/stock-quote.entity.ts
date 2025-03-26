import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class StockQuote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  stockId: number;

  @Column()
  date: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  open: number;

  @Column('decimal', { precision: 10, scale: 2 })
  high: number;

  @Column('decimal', { precision: 10, scale: 2 })
  low: number;

  @Column('decimal', { precision: 10, scale: 2 })
  close: number;

  @Column()
  volume: number;

  @Column('decimal', { precision: 5, scale: 2 })
  percentChange: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
