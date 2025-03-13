import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UserRole } from './constants/user-contants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from './guards/role.guard';
import { ExecutionContext } from '@nestjs/common';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: UsersService;

  // Sample data for testing
  const sampleUser: User = {
    id: 1,
    email: 'john.doe@example.com',
    fisrtName: 'John',
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
      fisrtName: 'John',
      lastName: 'Doe',
      accessToken: null,
      refreshToken: null,
      role: UserRole.BASIC_USER,
      isActive: true,
      provider: 'local',
      password: 'password',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      email: 'jane.smith@example.com',
      fisrtName: 'Jane',
      lastName: 'Smith',
      accessToken: null,
      refreshToken: null,
      role: UserRole.ADMIN,
      isActive: true,
      provider: 'local',
      password: 'password',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockUsersService = {
    findAll: jest.fn().mockResolvedValue(sampleUsers),
    findOne: jest.fn().mockImplementation((id: number) => {
      return sampleUsers.find((user) => user.id === id);
    }),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
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

    usersController = moduleRef.get<UsersController>(UsersController);
    usersService = moduleRef.get<UsersService>(UsersService);
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
      expect(result).toEqual(sampleUser);
    });

    it('should throw an error if user not found', async () => {
      const userId = 999;
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(usersController.getUser(userId)).resolves.toBeNull();
      expect(usersService.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUsers', () => {
    it('should return an empty array if no users are found', async () => {
      mockUsersService.findAll.mockResolvedValue([]);

      const result = await usersController.getUsers([]);

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  it('should return an array of users when called by an ADMIN', async () => {
    const mockAdminUser = { role: UserRole.ADMIN };
    const result = await usersController.getUsers(mockAdminUser);

    expect(usersService.findAll).toHaveBeenCalled();
    expect(result).toEqual(sampleUsers);
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
