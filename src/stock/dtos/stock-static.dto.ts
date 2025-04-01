import { ApiProperty } from '@nestjs/swagger';
import { Company } from '../../company/company.entity';

export class StockStaticDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ticker: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  exchange: string;

  @ApiProperty({ type: () => Company })
  company: Company;
}
