import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from './constants/user-contants';
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

  async updateUserRole(
    id: number,
    newRole: UserRole,
    currentUser?: User,
  ): Promise<User> {
    // Don't allow users to modify their own role if currentUser is provided
    if (currentUser && currentUser.id === id) {
      throw new ForbiddenException('You cannot modify your own role');
    }

    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.role = newRole;
    return this.userRepository.save(user);
  }
}
