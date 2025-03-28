import { Expose } from 'class-transformer';

export class CompanyDto {
  @Expose()
  name: string;

  @Expose()
  industry: string;

  @Expose()
  sector: string;

  @Expose()
  website: string;

  @Expose()
  description: string;

  @Expose()
  ceo: string;

  @Expose()
  country: string;

  @Expose()
  fullTimeEmployees: string;

  @Expose()
  phone: string;

  @Expose()
  address: string;

  @Expose()
  city: string;

  @Expose()
  state: string;

  @Expose()
  zip: string;
}
