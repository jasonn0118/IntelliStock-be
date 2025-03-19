import {
  BadRequestException,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserDto } from '../users/dtos/create-user.dto';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

const mockAuthService = {
  signUp: jest.fn(),
  signIn: jest.fn(),
  loginWithJwt: jest.fn(),
};

@Injectable()
class MockLocalAuthGuard extends LocalAuthGuard {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = { id: 1, email: 'test@example.com' };
    return true;
  }
}

@Injectable()
class MockAuthGuardGoogle extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = { id: 2, email: 'googleuser@example.com' };
    return true;
  }
}

@Injectable()
class MockAuthGuardGithub extends AuthGuard('github') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = { id: 3, email: 'githubuser@example.com' };
    return true;
  }
}

@Injectable()
class MockJwtAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    request.user = { id: 1, email: 'test@example.com' };
    return true;
  }
}

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useClass(MockLocalAuthGuard)
      .overrideGuard(AuthGuard('google'))
      .useClass(MockAuthGuardGoogle)
      .overrideGuard(AuthGuard('github'))
      .useClass(MockAuthGuardGithub)
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .compile();

    authController = moduleRef.get<AuthController>(AuthController);
    authService = moduleRef.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should create a new user and return the access token, role, and user details', async () => {
      const dto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'securepassword',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockUserResponse = {
        access_token: 'mockJwtToken',
        role: 'user',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockAuthService.signUp.mockResolvedValue(mockUserResponse);

      const result = await authController.signUp(dto);

      expect(authService.signUp).toHaveBeenCalledWith(dto);

      expect(result).toEqual(mockUserResponse);
    });

    it('should throw an error if email is already in use', async () => {
      const dto: CreateUserDto = {
        email: 'existinguser@example.com',
        password: 'securepassword',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      mockAuthService.signUp.mockRejectedValue(
        new BadRequestException('Email already in use'),
      );

      await expect(authController.signUp(dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(authService.signUp).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    describe('login', () => {
      it('should return a role and set a JWT access token in cookies', async () => {
        const dto: CreateUserDto = {
          email: 'signinuser@example.com',
          password: 'password456',
        };

        const mockUser = {
          id: 1,
          email: 'test@example.com',
        };

        const mockJwt = {
          access_token: 'mockJwtToken',
          role: 'user',
        };

        mockAuthService.loginWithJwt.mockResolvedValue(mockJwt);

        const req = { user: mockUser };

        const res = {
          cookie: jest.fn(),
        };

        const result = await authController.signIn(req, dto, res);

        expect(authService.loginWithJwt).toHaveBeenCalledWith(mockUser);

        expect(res.cookie).toHaveBeenCalledWith(
          'access_token',
          mockJwt.access_token,
          {
            httpOnly: true,
            path: '/',
          },
        );

        expect(result).toEqual({ role: mockJwt.role });
      });
    });

    it('should handle login failure', async () => {
      const mockUser = null;

      mockAuthService.loginWithJwt.mockRejectedValue(new Error('Login failed'));
      const dto: CreateUserDto = {
        email: 'signinuser@example.com',
        password: 'password456',
      };

      const req = {
        user: mockUser,
      };

      const res = { cookie: jest.fn() }; // Mock response object
      await expect(authController.signIn(req, dto, res)).rejects.toThrow(
        'Login failed',
      );
      expect(authService.loginWithJwt).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('Google OAuth', () => {
    it('should initiate Google OAuth flow', async () => {
      // Since the route is guarded and redirects, we can test that the method exists and is callable
      const result = await authController.googleAuth();
      expect(result).toBeUndefined();
    });

    it('should handle Google OAuth callback and return JWT', async () => {
      const mockGoogleUser = {
        id: 2,
        email: 'googleuser@example.com',
      };

      const mockJwt = {
        access_token: 'googleJwtToken',
      };

      mockAuthService.loginWithJwt.mockResolvedValue(mockJwt);

      const req = {
        user: mockGoogleUser,
      };

      const result = await authController.googleAuthRedirect(req);
      expect(authService.loginWithJwt).toHaveBeenCalledWith(mockGoogleUser);
      expect(result).toEqual(mockJwt);
    });
  });

  describe('GitHub OAuth', () => {
    it('should initiate GitHub OAuth flow', async () => {
      // Since the route is guarded and redirects, we can test that the method exists and is callable
      const result = await authController.githubAuth();
      expect(result).toBeUndefined();
    });

    it('should handle GitHub OAuth callback and return JWT', async () => {
      const mockGithubUser = {
        id: 3,
        email: 'githubuser@example.com',
      };

      const mockJwt = {
        access_token: 'githubJwtToken',
      };

      mockAuthService.loginWithJwt.mockResolvedValue(mockJwt);

      const req = {
        user: mockGithubUser,
      };

      const result = await authController.githubAuthRedirect(req);
      expect(authService.loginWithJwt).toHaveBeenCalledWith(mockGithubUser);
      expect(result).toEqual(mockJwt);
    });
  });

  describe('getProfile', () => {
    it('should return the authenticated user profile', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };

      const result = await authController.getProfile(mockUser);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user is not provided', async () => {
      const nullUser = null;

      await expect(authController.getProfile(nullUser)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
