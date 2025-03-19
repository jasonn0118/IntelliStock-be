import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/users/dtos/create-user.dto';
import { User } from 'src/users/user.entity';
import { UsersService } from '../users/users.service';

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
    if (user && isPasswordMatching) {
      const { password, ...result } = user;
      return result;
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  async validateOauthLogin(user: any, provider: string): Promise<any> {
    const existingUser = await this.usersService.findByEmail(user.email);
    if (existingUser) {
      return this.loginWithJwt(existingUser);
    } else {
      const newUser = await this.usersService.createUserOAuth(
        user.email,
        provider,
        user,
      );
      return this.loginWithJwt(newUser);
    }
  }

  async loginWithJwt(user: Partial<User>) {
    const payload = { email: user.email, sub: user.id };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async signUp(createUserDto: CreateUserDto) {
    const { email, password, firstName, lastName } = createUserDto;

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, saltOrRounds);

    const newUser = await this.usersService.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });

    const access_token = this.jwtService.sign({
      sub: newUser.id,
      email: newUser.email,
    });

    return {
      access_token,
      role: newUser.role,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
    };
  }
}
