import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../constants/user-contants';

export class RoleUpdateResponseDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  id: number;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.ADMIN,
    description: 'The updated role',
  })
  role: UserRole;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: "User's email address",
  })
  email: string;

  @ApiProperty({
    example: true,
    description: 'Whether the update was successful',
  })
  success: boolean;

  @ApiProperty({
    example: 'User role updated successfully',
    description: 'Status message',
  })
  message: string;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'When the update was performed',
  })
  updatedAt: Date;
}
