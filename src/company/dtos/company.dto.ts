import { Expose } from 'class-transformer';

export class CompanyDto {
  @Expose()
  name: string;

  @Expose()
  exchange: string;

  @Expose()
  industry: string;

  @Expose()
  sector: string;

  @Expose()
  website: string;

  @Expose()
  description: string;
}
