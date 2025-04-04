import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
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

    // Mock the getFrontendUrl method to return localhost for tests
    jest
      .spyOn(authController as any, 'getFrontendUrl')
      .mockReturnValue('http://localhost:3001');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should create a new user, set cookie, and return user details', async () => {
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

      // ✅ Fix: Fully mock the Express Response object
      const res = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as Partial<Response>;

      const result = await authController.signUp(dto, res as Response);

      // ✅ Ensure authService.signUp() was called with correct DTO
      expect(authService.signUp).toHaveBeenCalledWith(dto);

      // ✅ Ensure cookie is set correctly
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'mockJwtToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      // ✅ Ensure structured response is returned
      expect(result).toEqual({
        message: 'User registered successfully',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
      });
    });

    it('should throw an error if signup fails', async () => {
      const dto: CreateUserDto = {
        email: 'existinguser@example.com',
        password: 'securepassword',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      mockAuthService.signUp.mockRejectedValue(
        new UnauthorizedException('Signup failed'),
      );

      const res = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as Partial<Response>;

      // ✅ Expect the function to throw UnauthorizedException
      await expect(authController.signUp(dto, res as Response)).rejects.toThrow(
        UnauthorizedException,
      );

      // ✅ Ensure authService.signUp() was called with correct DTO
      expect(authService.signUp).toHaveBeenCalledWith(dto);

      // ✅ Ensure cookie was NOT set due to error
      expect(res.cookie).not.toHaveBeenCalled();
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
            secure: false,
            sameSite: 'lax',
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
      const result = await authController.googleAuth();
      expect(result).toBeUndefined();
    });

    it('should handle Google OAuth callback and redirect', async () => {
      const req = { user: { access_token: 'google-token' } };
      const res = {
        redirect: jest.fn(),
        cookie: jest.fn(),
      } as Partial<Response>;

      await authController.googleAuthRedirect(req, res as Response);

      expect(res.cookie).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3001');
    });

    it('should throw an error if user is not authenticated', async () => {
      const req = { user: null };
      const res = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as Partial<Response>;

      await expect(
        authController.googleAuthRedirect(req, res as Response),
      ).rejects.toThrow(UnauthorizedException);
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  describe('GitHub OAuth', () => {
    it('should initiate GitHub OAuth flow', async () => {
      const result = await authController.githubAuth();
      expect(result).toBeUndefined();
    });

    it('should handle GitHub OAuth callback and redirect', async () => {
      const req = { user: { access_token: 'github-token' } };
      const res = {
        redirect: jest.fn(),
        cookie: jest.fn(),
      } as Partial<Response>;

      await authController.githubAuthRedirect(req, res as Response);

      expect(res.cookie).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3001');
    });

    it('should throw an error if user is not authenticated', async () => {
      const req = { user: null }; // No user object
      const res = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as Partial<Response>;

      await expect(
        authController.githubAuthRedirect(req, res as Response),
      ).rejects.toThrow(UnauthorizedException);
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
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
