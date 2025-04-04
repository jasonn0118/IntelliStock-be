import { ApiProperty } from '@nestjs/swagger';

export class CompanyUpdateResponseDto {
  @ApiProperty({
    example: true,
    description: 'Whether the update was successful',
  })
  success: boolean;

  @ApiProperty({
    example: 'Company profile updated successfully',
    description: 'Status message',
  })
  message: string;

  @ApiProperty({ example: 'AAPL', description: 'Stock ticker symbol' })
  ticker: string;

  @ApiProperty({
    example: '2023-12-31T23:59:59.999Z',
    description: 'Timestamp of the update',
  })
  timestamp: Date;
}
