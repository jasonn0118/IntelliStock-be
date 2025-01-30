// src/users/users.controller.ts

import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('/:id')
  async getUser(@Param('id') id: number) {
    return this.usersService.findOne(id);
  }

  @Get()
  async getUsers() {
    return this.usersService.findAll();
  }

  // Add other user-related routes as needed
}
