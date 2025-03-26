import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Document {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ nullable: true })
  type: 'summary' | 'stock' | 'news' | 'exchange';

  @Column({ nullable: true })
  category:
    | 'top_gainers'
    | 'top_losers'
    | 'market_cap'
    | 'nasdaq_summary'
    | 'stock_quote'
    | null;

  @Column({ type: 'date', nullable: true })
  date: Date; // Used to filter documents by specific trading day

  @Column({ type: 'text', select: false, nullable: true })
  embedding: string;

  @Column({ type: 'text', nullable: true })
  text: string;

  @Column({ nullable: true })
  @Index()
  ticker: string;

  @Column({ nullable: true })
  source: string;

  @Column({ type: 'float', nullable: true, default: 1.0 })
  reliabilityScore: number;

  @Column({ type: 'timestamp', nullable: true })
  contentDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
