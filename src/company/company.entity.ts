import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Stock } from '../stock/stock.entity';

@Entity()
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  ticker: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  sector: string;

  @Column({ nullable: true })
  website: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  ceo: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  fullTimeEmployees: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  zip: string;

  @Column({ nullable: true })
  logoUrl: string;

  // Inverse side of the one-to-one relationship with Stock.
  @OneToOne(() => Stock, (stock) => stock.company)
  stock: Stock;

  @OneToMany(() => Stock, (stock) => stock.company)
  stocks: Stock[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
