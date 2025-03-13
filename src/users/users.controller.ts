import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RoleGuard } from './guards/role.guard';
import { Roles } from '../common/decorators/user-role.decorator';
import { UserRole } from './constants/user-contants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('/:id')
  async getUser(@Param('id') id: number) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async getUsers(@CurrentUser() user) {
    return this.usersService.findAll();
  }
}
