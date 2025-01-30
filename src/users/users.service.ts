import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(email: string, password: string): Promise<User> {
    const user = new User();
    user.email = email;
    user.password = password;
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
      fisrtName: oauthData.firstName || '',
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
