import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import yahooFinance from 'yahoo-finance2';
import { Stock } from '../stock/stock.entity';
import { Company } from './company.entity';
import { YahooQuoteSummaryResponse } from './interfaces/yahoo-finance.interface';

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

  /**
   * Generates a logo URL for a stock symbol
   * @param symbol Stock ticker symbol
   * @returns Logo URL
   */
  public getLogoUrl(symbol: string): string {
    return `https://img.logo.dev/ticker/${symbol.toLowerCase()}?format=webp&retina=true&token=${this.logoDevToken}`;
  }

  /**
   * Fetches company profile information from Yahoo Finance
   * @param symbol Stock ticker symbol
   * @returns Yahoo Finance quote summary response
   */
  async fetchCompanyProfile(
    symbol: string,
  ): Promise<YahooQuoteSummaryResponse> {
    try {
      const queryOptions = {
        modules: ['price' as const, 'assetProfile' as const],
      };
      const result = await yahooFinance.quoteSummary(symbol, queryOptions);
      return result as YahooQuoteSummaryResponse;
    } catch (error) {
      this.logger.error(
        `Error fetching company profile for ${symbol}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Updates a Company entity with data from Yahoo Finance profile
   * @param company Company entity to update
   * @param profile Yahoo Finance profile data
   * @returns Updated Company entity
   */
  private updateCompanyFields(
    company: Company,
    profile: YahooQuoteSummaryResponse,
  ): Company {
    if (profile.price.longName && company.name !== profile.price.longName) {
      company.name = profile.price.longName;
    }

    if (
      profile.assetProfile.sector &&
      company.sector !== profile.assetProfile.sector
    ) {
      company.sector = profile.assetProfile.sector;
    }

    if (
      profile.assetProfile.industry &&
      company.industry !== profile.assetProfile.industry
    ) {
      company.industry = profile.assetProfile.industry;
    }

    if (
      profile.assetProfile.website &&
      company.website !== profile.assetProfile.website
    ) {
      company.website = profile.assetProfile.website;
    }

    if (
      profile.assetProfile.description &&
      company.description !== profile.assetProfile.description
    ) {
      company.description = profile.assetProfile.description;
    } else if (
      profile.assetProfile.longBusinessSummary &&
      company.description !== profile.assetProfile.longBusinessSummary
    ) {
      company.description = profile.assetProfile.longBusinessSummary;
    }

    if (profile.assetProfile.ceo && company.ceo !== profile.assetProfile.ceo) {
      company.ceo = profile.assetProfile.ceo;
    } else if (
      profile.assetProfile.companyOfficers?.[0]?.name &&
      company.ceo !== profile.assetProfile.companyOfficers[0].name
    ) {
      company.ceo = profile.assetProfile.companyOfficers[0].name;
    }

    if (
      profile.assetProfile.country &&
      company.country !== profile.assetProfile.country
    ) {
      company.country = profile.assetProfile.country;
    }

    if (
      profile.assetProfile.fullTimeEmployees &&
      company.fullTimeEmployees !==
        profile.assetProfile.fullTimeEmployees.toString()
    ) {
      company.fullTimeEmployees =
        profile.assetProfile.fullTimeEmployees.toString();
    }

    if (
      profile.assetProfile.phone &&
      company.phone !== profile.assetProfile.phone
    ) {
      company.phone = profile.assetProfile.phone;
    }

    if (
      profile.assetProfile.address &&
      company.address !== profile.assetProfile.address
    ) {
      company.address = profile.assetProfile.address;
    } else if (
      profile.assetProfile.address1 &&
      company.address !== profile.assetProfile.address1
    ) {
      company.address = profile.assetProfile.address1;
    }

    if (
      profile.assetProfile.city &&
      company.city !== profile.assetProfile.city
    ) {
      company.city = profile.assetProfile.city;
    }

    if (
      profile.assetProfile.state &&
      company.state !== profile.assetProfile.state
    ) {
      company.state = profile.assetProfile.state;
    }

    if (profile.assetProfile.zip && company.zip !== profile.assetProfile.zip) {
      company.zip = profile.assetProfile.zip;
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
    companyData?: YahooQuoteSummaryResponse,
  ): Promise<Company> {
    try {
      let profile: YahooQuoteSummaryResponse;

      if (companyData) {
        profile = companyData;
      } else {
        profile = await this.fetchCompanyProfile(symbol);
      }

      this.logger.log(`Profile: ${JSON.stringify(profile.price.longName)}`);

      if (!profile || !profile.price.longName) {
        this.logger.warn(`Skipping empty profile for ${symbol}`);
        return null;
      }

      let company = await this.companyRepository.findOne({
        where: { ticker: symbol },
      });

      this.logger.log(`Company: ${JSON.stringify(company)}`);

      if (company) {
        company = this.updateCompanyFields(company, profile);
        this.logger.log(`Updating existing company: ${symbol}`);
      } else {
        company = new Company();
        company.ticker = symbol;
        company.name = profile.price.longName;
        company.sector = profile.assetProfile.sector;
        company.industry = profile.assetProfile.industry;
        company.website = profile.assetProfile.website;
        company.description =
          profile.assetProfile.description ||
          profile.assetProfile.longBusinessSummary;
        company.ceo =
          profile.assetProfile.ceo ||
          profile.assetProfile.companyOfficers?.[0]?.name;
        company.country = profile.assetProfile.country;
        company.fullTimeEmployees =
          profile.assetProfile.fullTimeEmployees?.toString();
        company.phone = profile.assetProfile.phone;
        company.address =
          profile.assetProfile.address || profile.assetProfile.address1;
        company.city = profile.assetProfile.city;
        company.state = profile.assetProfile.state;
        company.zip = profile.assetProfile.zip;
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
