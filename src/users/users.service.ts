import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;
    const user = new User();
    user.email = email;
    user.password = password;
    user.firstName = createUserDto.firstName || '';
    user.lastName = createUserDto.lastName || '';
    return this.userRepository.save(user);
  }

  async createUserOAuth(
    email: string,
    provider: string,
    oauthData: any,
  ): Promise<User> {
    const user = this.userRepository.create({
      email,
      provider,
      firstName: oauthData.firstName || '',
      lastName: oauthData.lastName || '',
      accessToken: oauthData.accessToken || '',
      refreshToken: oauthData.refreshToken || '',
    });

    return this.userRepository.save(user);
  }
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: number): Promise<User> {
    return this.userRepository.findOneBy({ id });
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOneBy({ email });
  }
}
