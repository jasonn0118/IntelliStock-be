import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateUserDto } from '../users/dtos/create-user.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  async signUp(@Body() body: CreateUserDto) {
    const user = await this.authService.signUp(body);
    return user;
  }

  @UseGuards(LocalAuthGuard)
  @Post('/signin')
  async signIn(
    @Request() req,
    @Body() body: CreateUserDto,
    @Res({ passthrough: true }) res,
  ) {
    const { access_token, role, firstName, lastName } =
      await this.authService.loginWithJwt(req.user);

    res.cookie('access_token', access_token, {
      httpOnly: true,
      path: '/',
      // TODO: Update later secure to true in production
      // secure: process.env.NODE_ENV === 'production',
      // sameSite: 'strict',
    });

    return { role, firstName, lastName };
  }

  @UseGuards(JwtAuthGuard)
  @Post('/signout')
  async signOut(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { message: 'success' };
  }

  @Get('/google')
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @UseGuards(AuthGuard('google'))
  @Get('/google/callback')
  async googleAuthRedirect(@Request() req) {
    // Handles Google OAuth callback

    if (!req.user) {
      throw new UnauthorizedException();
    }

    // Ensure loginWithJwt is called only once
    if (req.user.access_token) {
      return req.user;
    }

    return this.authService.loginWithJwt(req.user);
  }

  @Get('/github')
  async githubAuth() {
    // Initiates GitHub OAuth flow
  }

  @UseGuards(AuthGuard('github'))
  @Get('/github/callback')
  async githubAuthRedirect(@Request() req) {
    // Handles GitHub OAuth callback

    if (!req.user) {
      throw new UnauthorizedException();
    }

    // Ensure loginWithJwt is called only once
    if (req.user.access_token) {
      return req.user;
    }

    return this.authService.loginWithJwt(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/me')
  async getCurrentuser(@Request() req) {
    return {
      email: req.user.email,
      role: req.user.role,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('/profile')
  async getProfile(@CurrentUser() user) {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    return user;
  }
}
