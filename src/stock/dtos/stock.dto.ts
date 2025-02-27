import { Expose, Type } from 'class-transformer';
import { CompanyDto } from 'src/company/dtos/company.dto';

export class StockDto {
  @Expose()
  id: string;

  @Expose()
  ticker: string;

  @Expose()
  name: string;

  @Expose()
  exchange: string;

  @Expose()
  @Type(() => CompanyDto)
  company: CompanyDto;
}
