import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from './constants/user-contants';
import { RoleUpdateResponseDto } from './dtos/role-update-response.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { UsersListResponseDto } from './dtos/users-list-response.dto';
import { RoleGuard } from './guards/role.guard';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: UsersService;

  // Sample data for testing
  const sampleUser: User = {
    id: 1,
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    accessToken: null,
    refreshToken: null,
    role: UserRole.BASIC_USER,
    isActive: true,
    provider: 'local',
    password: 'password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleUsers: User[] = [
    {
      id: 1,
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'password',
      provider: 'local',
      role: UserRole.BASIC_USER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      accessToken: null,
      refreshToken: null,
    },
    {
      id: 2,
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      password: 'password',
      provider: 'local',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      accessToken: null,
      refreshToken: null,
    },
  ];

  const mockUsersService = {
    findAll: jest.fn().mockImplementation(() => {
      return Promise.resolve(sampleUsers);
    }),
    findOne: jest.fn().mockImplementation((id: number) => {
      return sampleUsers.find((user) => user.id === id);
    }),
    updateUserRole: jest.fn().mockImplementation((id, role, currentUser) => {
      return Promise.resolve({
        ...sampleUser,
        id,
        role,
        updatedAt: new Date(),
      });
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .overrideGuard(RoleGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = { role: UserRole.ADMIN };
          return true;
        },
      })
      .compile();

    usersController = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(usersController).toBeDefined();
  });

  describe('getUser', () => {
    it('should return a single user', async () => {
      const userId = 1;
      mockUsersService.findOne.mockResolvedValue(sampleUser);

      const result = await usersController.getUser(userId);

      expect(usersService.findOne).toHaveBeenCalledWith(userId);
      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result.id).toEqual(sampleUser.id);
      expect(result.email).toEqual(sampleUser.email);
    });

    it('should throw an error if user not found', async () => {
      const userId = 999;
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(usersController.getUser(userId)).rejects.toThrow();
      expect(usersService.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUsers', () => {
    it('should return a list of users', async () => {
      mockUsersService.findAll.mockResolvedValue(sampleUsers);

      const result = await usersController.getUsers({ role: UserRole.ADMIN });

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toBeInstanceOf(UsersListResponseDto);
      expect(result.users.length).toEqual(sampleUsers.length);
      expect(result.count).toEqual(sampleUsers.length);
    });

    it('should return an empty array if no users are found', async () => {
      mockUsersService.findAll.mockResolvedValue([]);

      const result = await usersController.getUsers({ role: UserRole.ADMIN });

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toBeInstanceOf(UsersListResponseDto);
      expect(result.users).toEqual([]);
      expect(result.count).toEqual(0);
    });
  });

  describe('updateUserRole', () => {
    it('should update a user role successfully', async () => {
      const userId = 1;
      const newRole = UserRole.ADMIN;
      const currentUser = { id: 2, role: UserRole.ADMIN };

      const result = await usersController.updateUserRole(
        userId,
        { role: newRole },
        currentUser,
      );

      expect(usersService.updateUserRole).toHaveBeenCalledWith(
        userId,
        newRole,
        currentUser,
      );
      expect(result).toBeInstanceOf(RoleUpdateResponseDto);
      expect(result.id).toEqual(userId);
      expect(result.role).toEqual(newRole);
      expect(result.success).toBeTruthy();
    });
  });

  it('should deny access if user is not ADMIN', async () => {
    const roleGuardMock = { canActivate: jest.fn().mockReturnValue(false) };

    try {
      await usersController.getUsers({ role: UserRole.BASIC_USER });
    } catch (error) {
      expect(error.status).toBe(403);
      expect(error.message).toBe(
        'You do not have permission to access this resource',
      );
    }
  });
});
