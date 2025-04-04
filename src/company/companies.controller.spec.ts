import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminInternalRoleGuard } from '../users/guards/admin-internal-role.guard';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };
const mockAdminInternalRoleGuard = { canActivate: jest.fn(() => true) };

describe('CompaniesController', () => {
  let controller: CompaniesController;
  let service: CompaniesService;

  const mockCompanyProfile = {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    industry: 'Technology',
    description:
      'Apple Inc. designs, manufactures, and markets smartphones, tablets, and computers.',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [
        {
          provide: CompaniesService,
          useValue: {
            fetchCompanyProfile: jest
              .fn()
              .mockResolvedValue(mockCompanyProfile),
            updateCompanyProfile: jest.fn().mockResolvedValue({
              success: true,
              ticker: 'AAPL',
            }),
            updateCompanyLogos: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(AdminInternalRoleGuard)
      .useValue(mockAdminInternalRoleGuard)
      .compile();

    controller = module.get<CompaniesController>(CompaniesController);
    service = module.get<CompaniesService>(CompaniesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCompanyProfile', () => {
    it('should return company profile information', async () => {
      const ticker = 'AAPL';
      const result = await controller.getCompanyProfile(ticker);

      expect(service.fetchCompanyProfile).toHaveBeenCalledWith(ticker);
      expect(result).toEqual(mockCompanyProfile);
    });

    it('should handle errors from service', async () => {
      const ticker = 'INVALID';
      jest
        .spyOn(service, 'fetchCompanyProfile')
        .mockRejectedValueOnce(new Error('Company not found'));

      await expect(controller.getCompanyProfile(ticker)).rejects.toThrow(
        'Company not found',
      );
      expect(service.fetchCompanyProfile).toHaveBeenCalledWith(ticker);
    });
  });

  describe('updateCompanyProfile', () => {
    it('should update company profile successfully', async () => {
      const symbol = 'AAPL';
      const result = await controller.updateCompanyProfile(symbol);

      expect(service.updateCompanyProfile).toHaveBeenCalledWith(symbol);
      expect(result).toBeInstanceOf(Object);
      expect(result.success).toBe(true);
      expect(result.message).toContain('updated successfully');
      expect(result.ticker).toBe(symbol);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should check if JwtAuthGuard is applied', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.updateCompanyProfile,
      );
      const guardTypes = guards.map((guard) => guard.name);

      expect(guardTypes).toContain('JwtAuthGuard');
    });

    it('should check if AdminInternalRoleGuard is applied', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.updateCompanyProfile,
      );
      const guardTypes = guards.map((guard) => guard.name);

      expect(guardTypes).toContain('AdminInternalRoleGuard');
    });
  });

  describe('updateCompanyLogos', () => {
    it('should update company logos successfully', async () => {
      const result = await controller.updateCompanyLogos();

      expect(service.updateCompanyLogos).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Object);
      expect(result.success).toBe(true);
      expect(result.message).toContain('updated successfully');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(typeof result.count).toBe('number');
    });

    it('should check if JwtAuthGuard is applied', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.updateCompanyLogos,
      );
      const guardTypes = guards.map((guard) => guard.name);

      expect(guardTypes).toContain('JwtAuthGuard');
    });

    it('should check if AdminInternalRoleGuard is applied', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.updateCompanyLogos,
      );
      const guardTypes = guards.map((guard) => guard.name);

      expect(guardTypes).toContain('AdminInternalRoleGuard');
    });
  });
});
