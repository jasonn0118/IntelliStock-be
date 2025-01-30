import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  UseInterceptors,
  ClassSerializerInterceptor,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dtos/create-user.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  async signUp(@Body() body: CreateUserDto) {
    const user = await this.authService.signUp(body.email, body.password);
    return user;
  }

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(@Request() req) {
    return this.authService.loginWithJwt(req.user);
  }

  @Post('/signin')
  async signIn(@Body() body: CreateUserDto) {
    const user = await this.authService.signIn(body.email, body.password);
    return user;
  }

  @UseGuards(AuthGuard('google'))
  @Get('/google')
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @UseGuards(AuthGuard('google'))
  @Get('/google/callback')
  async googleAuthRedirect(@Request() req) {
    // Handles Google OAuth callback
    return this.authService.loginWithJwt(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/profile')
  async getProfile(@Request() req) {
    return req.user;
  }
}
