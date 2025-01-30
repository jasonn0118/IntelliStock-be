import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dtos/create-user.dto';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Post('/signup')
  async signUp(@Body() body: CreateUserDto) {
    const user = await this.authService.signUp(body.email, body.password);
    return user;
  }

  @Post('/signin')
  async signIn(@Body() body: CreateUserDto) {
    const user = await this.authService.signIn(body.email, body.password);
    return user;
  }

  @Get('/:id')
  async getUser(id: number) {
    return this.usersService.findOne(id);
  }
}
