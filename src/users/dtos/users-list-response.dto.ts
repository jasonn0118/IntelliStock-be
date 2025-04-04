import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class UsersListResponseDto {
  @ApiProperty({
    type: [UserResponseDto],
    description: 'List of users',
  })
  users: UserResponseDto[];

  @ApiProperty({ example: 10, description: 'Total number of users' })
  count: number;
}
