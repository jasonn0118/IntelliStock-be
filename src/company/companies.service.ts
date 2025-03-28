import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Stock } from '../stock/stock.entity';
import { Repository } from 'typeorm';
import yahooFinance from 'yahoo-finance2';
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
    if (profile.longName && company.name !== profile.longName) {
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
    if (
      profile.longBusinessSummary &&
      company.description !== profile.longBusinessSummary
    ) {
      company.description = profile.longBusinessSummary;
    }
    if (
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
      company.fullTimeEmployees !== profile.fullTimeEmployees.toString()
    ) {
      company.fullTimeEmployees = profile.fullTimeEmployees.toString();
    }
    if (profile.phone && company.phone !== profile.phone) {
      company.phone = profile.phone;
    }
    if (profile.address1 && company.address !== profile.address1) {
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

  async updateCompanyProfile(symbol: string): Promise<Company> {
    try {
      // Fetch company profile from API
      const profile = await this.fetchCompanyProfile(symbol);

      // Skip if profile is empty or missing required data
      if (!profile || !profile.longName) {
        this.logger.warn(`Skipping empty profile for ${symbol}`);
        return null;
      }

      // Find existing company
      let company = await this.companyRepository.findOne({
        where: { ticker: symbol },
      });

      if (company) {
        // Update existing company
        company = this.updateCompanyFields(company, profile);
        this.logger.log(`Updating existing company: ${symbol}`);
      } else {
        // Create new company
        company = new Company();
        company.ticker = symbol;
        company.name = profile.longName;
        company.sector = profile.sector;
        company.industry = profile.industry;
        company.website = profile.website;
        company.description = profile.longBusinessSummary;
        company.ceo = profile.companyOfficers?.[0]?.name;
        company.country = profile.country;
        company.fullTimeEmployees = profile.fullTimeEmployees?.toString();
        company.phone = profile.phone;
        company.address = profile.address1;
        company.city = profile.city;
        company.state = profile.state;
        company.zip = profile.zip;
        this.logger.log(`Creating new company: ${symbol}`);
      }

      // Set logo URL
      company.logoUrl = this.getLogoUrl(symbol);

      // Save the company
      const savedCompany = await this.companyRepository.save(company);

      // Update the related stock record
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
