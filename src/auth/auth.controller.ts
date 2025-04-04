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

  // Get the frontend URL from environment variables
  private getFrontendUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:3001';
  }

  @Post('/signup')
  async signUp(
    @Body() body: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { access_token, role, firstName, lastName } =
        await this.authService.signUp(body);

      res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return {
        message: 'User registered successfully',
        firstName,
        lastName,
        role,
      };
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
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
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @UseGuards(AuthGuard('google'))
  @Get('/google/callback')
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    // Handles Google OAuth callback

    if (!req.user) {
      throw new UnauthorizedException();
    }

    const access_token =
      req.user.access_token ||
      (await this.authService.loginWithJwt(req.user)).access_token;

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.redirect(this.getFrontendUrl());
  }

  @Get('/github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Initiates GitHub OAuth flow
  }

  @UseGuards(AuthGuard('github'))
  @Get('/github/callback')
  async githubAuthRedirect(@Request() req, @Res() res: Response) {
    // Handles GitHub OAuth callback

    if (!req.user) {
      throw new UnauthorizedException();
    }

    const access_token =
      req.user.access_token ||
      (await this.authService.loginWithJwt(req.user)).access_token;

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.redirect(this.getFrontendUrl());
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
