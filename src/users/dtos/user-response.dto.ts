import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../constants/user-contants';

export class UserResponseDto {
  @ApiProperty({ example: 1, description: 'Unique user ID' })
  id: number;

  @ApiProperty({ example: 'John', description: "User's first name" })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: "User's last name" })
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: "User's email address",
  })
  email: string;

  @ApiProperty({
    example: 'google',
    description: 'Authentication provider if using OAuth',
    required: false,
  })
  provider?: string;

  @ApiProperty({
    example: true,
    description: 'Whether the user account is active',
  })
  isActive: boolean;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.BASIC_USER,
    description: "User's role in the system",
  })
  role: UserRole;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'When the user was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'When the user was last updated',
  })
  updatedAt: Date;
}
