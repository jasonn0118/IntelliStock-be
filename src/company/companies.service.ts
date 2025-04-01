import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import yahooFinance from 'yahoo-finance2';
import { Stock } from '../stock/stock.entity';
import { Company } from './company.entity';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);
  private readonly logoDevToken: string;

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    private readonly configService: ConfigService,
  ) {
    this.logoDevToken = this.configService.get<string>('LOGO_DEV_TOKEN');
  }

  private getLogoUrl(symbol: string): string {
    return `https://img.logo.dev/ticker/${symbol.toLowerCase()}?format=webp&retina=true&token=${this.logoDevToken}`;
  }

  async fetchCompanyProfile(symbol: string): Promise<any> {
    try {
      const queryOptions = {
        modules: ['assetProfile' as const],
      };
      const result = await yahooFinance.quoteSummary(symbol, queryOptions);
      return result.assetProfile;
    } catch (error) {
      this.logger.error(
        `Error fetching company profile for ${symbol}`,
        error.stack,
      );
      throw error;
    }
  }

  private updateCompanyFields(company: Company, profile: any): Company {
    // Handle direct name field or longName field (from Yahoo Finance API)
    if (profile.name && company.name !== profile.name) {
      company.name = profile.name;
    } else if (profile.longName && company.name !== profile.longName) {
      company.name = profile.longName;
    }

    if (profile.sector && company.sector !== profile.sector) {
      company.sector = profile.sector;
    }

    if (profile.industry && company.industry !== profile.industry) {
      company.industry = profile.industry;
    }

    if (profile.website && company.website !== profile.website) {
      company.website = profile.website;
    }

    // Handle direct description field or longBusinessSummary field
    if (profile.description && company.description !== profile.description) {
      company.description = profile.description;
    } else if (
      profile.longBusinessSummary &&
      company.description !== profile.longBusinessSummary
    ) {
      company.description = profile.longBusinessSummary;
    }

    // Handle direct CEO field or try to extract from companyOfficers
    if (profile.ceo && company.ceo !== profile.ceo) {
      company.ceo = profile.ceo;
    } else if (
      profile.companyOfficers?.[0]?.name &&
      company.ceo !== profile.companyOfficers[0].name
    ) {
      company.ceo = profile.companyOfficers[0].name;
    }

    if (profile.country && company.country !== profile.country) {
      company.country = profile.country;
    }

    if (
      profile.fullTimeEmployees &&
      company.fullTimeEmployees !== profile.fullTimeEmployees
    ) {
      company.fullTimeEmployees = profile.fullTimeEmployees.toString();
    }

    if (profile.phone && company.phone !== profile.phone) {
      company.phone = profile.phone;
    }

    // Handle direct address field or address1 field
    if (profile.address && company.address !== profile.address) {
      company.address = profile.address;
    } else if (profile.address1 && company.address !== profile.address1) {
      company.address = profile.address1;
    }

    if (profile.city && company.city !== profile.city) {
      company.city = profile.city;
    }

    if (profile.state && company.state !== profile.state) {
      company.state = profile.state;
    }

    if (profile.zip && company.zip !== profile.zip) {
      company.zip = profile.zip;
    }

    return company;
  }

  /**
   * Updates a company profile with provided data (to avoid duplicate API calls)
   * @param symbol Stock ticker symbol
   * @param companyData Pre-fetched company data
   */
  async updateCompanyProfile(
    symbol: string,
    companyData?: any,
  ): Promise<Company> {
    try {
      let profile: any;

      if (companyData) {
        profile = companyData;
      } else {
        profile = await this.fetchCompanyProfile(symbol);
      }

      if (!profile || !profile.name) {
        this.logger.warn(`Skipping empty profile for ${symbol}`);
        return null;
      }

      let company = await this.companyRepository.findOne({
        where: { ticker: symbol },
      });

      if (company) {
        company = this.updateCompanyFields(company, profile);
        this.logger.log(`Updating existing company: ${symbol}`);
      } else {
        company = new Company();
        company.ticker = symbol;
        company.name = profile.name;
        company.sector = profile.sector;
        company.industry = profile.industry;
        company.website = profile.website;
        company.description = profile.description;
        company.ceo = profile.ceo;
        company.country = profile.country;
        company.fullTimeEmployees = profile.fullTimeEmployees;
        company.phone = profile.phone;
        company.address = profile.address;
        company.city = profile.city;
        company.state = profile.state;
        company.zip = profile.zip;
        this.logger.log(`Creating new company: ${symbol}`);
      }

      company.logoUrl = this.getLogoUrl(symbol);

      const savedCompany = await this.companyRepository.save(company);

      const stock = await this.stockRepository.findOne({
        where: { ticker: symbol },
      });

      if (stock) {
        stock.company = savedCompany;
        stock.companyId = savedCompany.id;
        stock.lastUpdated = new Date();
        await this.stockRepository.save(stock);
        this.logger.log(`Linked company ${symbol} to stock record.`);
      }

      return savedCompany;
    } catch (error) {
      this.logger.error(
        `Error updating company profile for ${symbol}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateCompanyLogos(): Promise<void> {
    try {
      const companies = await this.companyRepository.find();
      this.logger.log(`Updating logos for ${companies.length} companies`);

      for (const company of companies) {
        company.logoUrl = this.getLogoUrl(company.ticker);
      }

      await this.companyRepository.save(companies);
      this.logger.log('Successfully updated company logos');
    } catch (error) {
      this.logger.error('Error updating company logos', error.stack);
      throw error;
    }
  }
}
