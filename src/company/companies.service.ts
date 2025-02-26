import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from './company.entity';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as csv from 'csvtojson';
import { STOCK_EXCHANGE } from 'src/stock/constants';
import { Stock } from 'src/stock/stock.entity';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);
  private readonly baseUrl =
    'https://financialmodelingprep.com/stable/profile-bulk';
  private readonly totalParts = 4;
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Stock)
    private stockRepository: Repository<Stock>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async fetchBulkCompanyProfiles(): Promise<any[]> {
    try {
      const requests = Array.from({ length: this.totalParts }, (_, index) => {
        const url = `${this.baseUrl}?part=${index}&apikey=${this.configService.get<string>('FMP_API_KEY')}`;
        return firstValueFrom(this.httpService.get(url));
      });
      // Wait for all requests to complete
      const responses = await Promise.all(requests);

      const allProfiles: any[] = [];
      for (const response of responses) {
        const profiles = await csv().fromString(response.data);
        allProfiles.push(...profiles);
      }
      this.logger.log(
        `Fetched ${allProfiles.length} profiles from bulk endpoint.`,
      );
      return allProfiles;
    } catch (error) {
      this.logger.error('Error fetching company profiles', error.stack);
      throw error;
    }
  }

  async getFilteredProfiles(): Promise<any[]> {
    const profiles = await this.fetchBulkCompanyProfiles();
    const filteredProfiles = profiles.filter((profile: any) => {
      const exchange = profile.exchange; // adjust if CSV headers differ
      const isFund = profile.isFund;
      return (
        (exchange === STOCK_EXCHANGE.NASDAQ ||
          exchange === STOCK_EXCHANGE.NYSE) &&
        isFund === 'false'
      );
    });

    this.logger.log(`Filtered ${filteredProfiles.length} profiles.`);
    return filteredProfiles;
  }

  async createCompanyProfiles(): Promise<Company[]> {
    const filteredProfiles = await this.getFilteredProfiles();

    const companiesToSave: Company[] = filteredProfiles.map((profile) => {
      const company = new Company();
      company.ticker = profile.symbol;
      company.name = profile.companyName;
      company.exchange = profile.exchange;
      company.sector = profile.sector;
      company.industry = profile.industry;
      company.website = profile.website;
      company.description = profile.description;
      return company;
    });

    const chunkSize = 100; // adjust as needed
    const savedCompanies: Company[] = [];
    for (let i = 0; i < companiesToSave.length; i += chunkSize) {
      const chunk = companiesToSave.slice(i, i + chunkSize);
      const result = await this.companyRepository.save(chunk);
      savedCompanies.push(...result);
    }

    this.logger.log(`Saved ${savedCompanies.length} companies.`);
    return savedCompanies;
  }

  /**
   * Bulk process: create company profiles from filtered bulk data, and then for each
   * created Company, find the related Stock record by ticker and update it to link the Company.
   */
  async createBulkCompanyProfilesAndLinkStocks(): Promise<Company[]> {
    // 1. Create Company profiles in bulk.
    const savedCompanies = await this.createCompanyProfiles();

    // 2. For each saved company, find and update the related Stock record.
    for (const company of savedCompanies) {
      const stock = await this.stockRepository.findOne({
        where: { ticker: company.ticker },
      });
      if (stock) {
        stock.company = company;
        stock.companyId = company.id;
        stock.lastUpdated = new Date();
        await this.stockRepository.save(stock);
        this.logger.log(`Linked company ${company.ticker} to stock record.`);
      } else {
        this.logger.warn(`No stock record found for ticker ${company.ticker}`);
      }
    }

    return savedCompanies;
  }
}
