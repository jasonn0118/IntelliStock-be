// src/users/users.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';

// Define a mock UsersService
const mockUsersService = {
  findOne: jest.fn(),
  findAll: jest.fn(),
};

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
      isActive: true,
      provider: 'local',
      password: 'password',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

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
    it('should return an array of users', async () => {
      mockUsersService.findAll.mockResolvedValue(sampleUsers);

      const result = await usersController.getUsers();

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toEqual(sampleUsers);
    });

    it('should return an empty array if no users are found', async () => {
      mockUsersService.findAll.mockResolvedValue([]);

      const result = await usersController.getUsers();

      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
