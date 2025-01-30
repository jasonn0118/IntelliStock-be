import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

const saltOrRounds = 10;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }
    const isPasswordMatching = await bcrypt.compare(password, user.password);
    if (user && !isPasswordMatching) {
      const { password, ...result } = user;
      return result;
    }

    return user;
  }

  async loginWithJwt(user: any) {
    const payload = { username: 'john', sub: user.id };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async signUp(email: string, password: string) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    console.log({ password, saltOrRounds });
    const hashedPassword = await bcrypt.hash(password, saltOrRounds);

    return this.usersService.create(email, hashedPassword);
  }

  async signIn(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isPasswordMatching = await bcrypt.compare(password, user.password);
    if (!isPasswordMatching) {
      throw new BadRequestException('Invalid password');
    }

    return user;
  }
}
