import { ApiProperty } from '@nestjs/swagger';

export class LogoUpdateResponseDto {
  @ApiProperty({
    example: true,
    description: 'Whether the update was successful',
  })
  success: boolean;

  @ApiProperty({
    example: 'Company logos updated successfully',
    description: 'Status message',
  })
  message: string;

  @ApiProperty({ example: 10, description: 'Number of company logos updated' })
  count: number;

  @ApiProperty({
    example: '2023-12-31T23:59:59.999Z',
    description: 'Timestamp of the update',
  })
  timestamp: Date;
}
