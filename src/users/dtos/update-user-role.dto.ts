import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../constants/user-contants';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'The new role for the user',
    enum: UserRole,
    example: 'ADMIN',
  })
  @IsNotEmpty()
  @IsEnum(UserRole, {
    message: 'Role must be a valid user role (BASIC_USER or ADMIN)',
  })
  role: UserRole;
}
