import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      // Supplies the method by which the JWT will be extracted from the request.
      //We will use the standard approach of supplying a bearer token in the Authorization header of our API requests.
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          if (!request?.cookies?.access_token) {
            throw new UnauthorizedException('No JWT token found in cookies');
          }
          return request.cookies.access_token;
        },
      ]),
      //just to be explicit, we choose the default false setting, which delegates the responsibility of ensuring that a JWT has not expired to the Passport module.
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token: user not found');
    }
    return user;
  }
}
