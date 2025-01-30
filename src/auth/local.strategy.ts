import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // With passport-local, we can pass no configuration options object, so simply calls super().
    // By default, Passport expects 'username' and 'password'
    // If you're using 'email', configure it here
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    console.log({ email, password });
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
