import { Exclude } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  fisrtName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column()
  email: string;

  @Column({nullable: true})
  provider: string;

  @Column({nullable: true})
  @Exclude()
  password: string;

  @Column({ default: false })
  isActive: boolean;

  @Column({ nullable: true })
  accessToken: string;

  @Column({ nullable: true })
  refreshToken: string;
}
