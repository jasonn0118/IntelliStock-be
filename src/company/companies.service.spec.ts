jest.mock('yahoo-finance2', () => ({
  default: {
    quoteSummary: jest.fn(),
  },
}));

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import yahooFinance from 'yahoo-finance2';
import { Stock } from '../stock/stock.entity';
import { CompaniesService } from './companies.service';
import { Company } from './company.entity';

const mockedQuoteSummary = yahooFinance.quoteSummary as jest.Mock;

describe('CompaniesService', () => {
  let service: CompaniesService;
  let companyRepository: Repository<Company>;
  let stockRepository: Repository<Stock>;
  let configService: ConfigService;

  const mockAssetProfile = {
    name: 'Apple Inc.',
    longName: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    website: 'https://www.apple.com',
    description:
      'Apple Inc. designs, manufactures, and markets smartphones, tablets, and computers.',
    longBusinessSummary:
      'Apple Inc. designs, manufactures, and markets smartphones, tablets, and computers.',
    ceo: 'Tim Cook',
    country: 'United States',
    fullTimeEmployees: 154000,
    phone: '408-996-1010',
    address: '1 Apple Park Way',
    address1: '1 Apple Park Way',
    city: 'Cupertino',
    state: 'CA',
    zip: '95014',
  };

  const mockCompany = {
    id: 1,
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    website: 'https://www.apple.com',
    description:
      'Apple Inc. designs, manufactures, and markets smartphones, tablets, and computers.',
    ceo: 'Tim Cook',
    country: 'United States',
    fullTimeEmployees: '154000',
    phone: '408-996-1010',
    address: '1 Apple Park Way',
    city: 'Cupertino',
    state: 'CA',
    zip: '95014',
    logoUrl:
      'https://img.logo.dev/ticker/aapl?format=webp&retina=true&token=mock-token',
  };

  const mockStock = {
    id: 'uuid-1',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    lastUpdated: new Date(),
    companyId: null,
    company: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: getRepositoryToken(Company),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Stock),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-token'),
          },
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    companyRepository = module.get<Repository<Company>>(
      getRepositoryToken(Company),
    );
    stockRepository = module.get<Repository<Stock>>(getRepositoryToken(Stock));
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchCompanyProfile', () => {
    it('should fetch company profile from Yahoo Finance', async () => {
      const symbol = 'AAPL';
      mockedQuoteSummary.mockResolvedValueOnce({
        price: {
          longName: 'Apple Inc.',
        },
        assetProfile: mockAssetProfile,
      });

      const result = await service.fetchCompanyProfile(symbol);

      expect(mockedQuoteSummary).toHaveBeenCalledWith(symbol, {
        modules: ['price', 'assetProfile'],
      });
      expect(result).toEqual({
        price: {
          longName: 'Apple Inc.',
        },
        assetProfile: mockAssetProfile,
      });
    });

    it('should throw error when Yahoo Finance API fails', async () => {
      const symbol = 'INVALID';
      const error = new Error('Symbol not found');
      mockedQuoteSummary.mockRejectedValueOnce(error);

      await expect(service.fetchCompanyProfile(symbol)).rejects.toThrow(error);
    });
  });

  describe('updateCompanyProfile', () => {
    it('should update an existing company profile', async () => {
      const symbol = 'AAPL';
      const existingCompany = { ...mockCompany };
      const updatedProfile = {
        price: {
          longName: 'Apple Inc.',
        },
        assetProfile: {
          ...mockAssetProfile,
          fullTimeEmployees: 160000,
          ceo: 'Timothy Cook',
        },
      };

      jest
        .spyOn(companyRepository, 'findOne')
        .mockResolvedValueOnce(existingCompany as any);
      jest.spyOn(companyRepository, 'save').mockResolvedValueOnce({
        ...existingCompany,
        fullTimeEmployees: '160000',
        ceo: 'Timothy Cook',
      } as any);
      jest
        .spyOn(stockRepository, 'findOne')
        .mockResolvedValueOnce(mockStock as any);
      jest.spyOn(stockRepository, 'save').mockResolvedValueOnce({
        ...mockStock,
        companyId: existingCompany.id,
        company: existingCompany,
      } as any);
      mockedQuoteSummary.mockResolvedValueOnce(updatedProfile);

      const result = await service.updateCompanyProfile(symbol);

      expect(companyRepository.findOne).toHaveBeenCalledWith({
        where: { ticker: symbol },
      });
      expect(companyRepository.save).toHaveBeenCalled();
      expect(stockRepository.findOne).toHaveBeenCalledWith({
        where: { ticker: symbol },
      });
      expect(stockRepository.save).toHaveBeenCalled();
      expect(result.ceo).toBe('Timothy Cook');
      expect(result.fullTimeEmployees).toBe('160000');
    });

    it('should create a new company if it does not exist', async () => {
      const symbol = 'MSFT';
      jest.spyOn(companyRepository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(companyRepository, 'save').mockImplementationOnce((entity) =>
        Promise.resolve({
          id: 2,
          ...entity,
        } as any),
      );
      jest.spyOn(stockRepository, 'findOne').mockResolvedValueOnce({
        ...mockStock,
        ticker: 'MSFT',
        name: 'Microsoft Corporation',
      } as any);
      jest.spyOn(stockRepository, 'save').mockResolvedValueOnce({} as any);
      mockedQuoteSummary.mockResolvedValueOnce({
        price: {
          longName: 'Microsoft Corporation',
        },
        assetProfile: mockAssetProfile,
      });

      const result = await service.updateCompanyProfile(symbol);

      expect(companyRepository.findOne).toHaveBeenCalledWith({
        where: { ticker: symbol },
      });
      expect(companyRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('Microsoft Corporation');
      expect(result.ticker).toBe('MSFT');
    });

    it('should use provided company data if available', async () => {
      const symbol = 'GOOG';
      const companyData = {
        price: {
          longName: 'Alphabet Inc.',
        },
        assetProfile: {
          sector: 'Technology',
          industry: 'Internet Content & Information',
        },
      };

      jest.spyOn(companyRepository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(companyRepository, 'save').mockImplementationOnce((entity) =>
        Promise.resolve({
          id: 3,
          ...entity,
        } as any),
      );
      jest.spyOn(stockRepository, 'findOne').mockResolvedValueOnce(null);

      const result = await service.updateCompanyProfile(symbol, companyData);

      expect(mockedQuoteSummary).not.toHaveBeenCalled();
      expect(result.name).toBe('Alphabet Inc.');
    });
  });

  describe('updateCompanyLogos', () => {
    it('should update logos for all companies', async () => {
      const companies = [
        { ...mockCompany, ticker: 'AAPL' },
        {
          ...mockCompany,
          ticker: 'MSFT',
          id: 2,
          name: 'Microsoft Corporation',
        },
        { ...mockCompany, ticker: 'GOOG', id: 3, name: 'Alphabet Inc.' },
      ];

      jest
        .spyOn(companyRepository, 'find')
        .mockResolvedValueOnce(companies as any);
      jest
        .spyOn(companyRepository, 'save')
        .mockResolvedValueOnce(companies as any);

      await service.updateCompanyLogos();

      expect(companyRepository.find).toHaveBeenCalled();
      expect(companyRepository.save).toHaveBeenCalledWith(companies);
      expect(companies[0].logoUrl).toMatch(/aapl/);
      expect(companies[1].logoUrl).toMatch(/msft/);
      expect(companies[2].logoUrl).toMatch(/goog/);
    });

    it('should handle errors during logo update', async () => {
      jest
        .spyOn(companyRepository, 'find')
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(service.updateCompanyLogos()).rejects.toThrow(
        'Database error',
      );
    });
  });
});
