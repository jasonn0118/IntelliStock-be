import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/user-role.decorator';
import { UserRole } from './constants/user-contants';
import { RoleUpdateResponseDto } from './dtos/role-update-response.dto';
import { UpdateUserRoleDto } from './dtos/update-user-role.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { UsersListResponseDto } from './dtos/users-list-response.dto';
import { RoleGuard } from './guards/role.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id') id: number): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Map to DTO to exclude sensitive information
    const response = new UserResponseDto();
    Object.assign(response, user);

    return response;
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Patch('/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
    type: RoleUpdateResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Cannot modify your own role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRole(
    @Param('id') id: number,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @CurrentUser() currentUser?,
  ): Promise<RoleUpdateResponseDto> {
    const user = await this.usersService.updateUserRole(
      id,
      updateUserRoleDto.role,
      currentUser,
    );

    const response = new RoleUpdateResponseDto();
    response.id = user.id;
    response.role = user.role;
    response.email = user.email;
    response.success = true;
    response.message = 'User role updated successfully';
    response.updatedAt = user.updatedAt;

    return response;
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Returns all users',
    type: UsersListResponseDto,
  })
  async getUsers(@CurrentUser() user?): Promise<UsersListResponseDto> {
    const users = await this.usersService.findAll();

    // Map to DTOs to exclude sensitive information
    const userDtos = users.map((user) => {
      const dto = new UserResponseDto();
      Object.assign(dto, user);
      return dto;
    });

    const response = new UsersListResponseDto();
    response.users = userDtos;
    response.count = userDtos.length;

    return response;
  }
}
