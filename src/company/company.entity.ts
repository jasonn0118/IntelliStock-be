import { Stock } from '../stock/stock.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  ticker: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  exchange: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  sector: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true })
  description: string;

  // Inverse side of the one-to-one relationship with Stock.
  @OneToOne(() => Stock, (stock) => stock.company)
  stock: Stock;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
