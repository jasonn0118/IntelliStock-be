import { Injectable } from '@nestjs/common';
import { CompanyProfileDto } from '../dtos/company-profile.dto';
import { YahooQuoteSummaryResponse } from '../interfaces/yahoo-finance.interface';

@Injectable()
export class CompanyMappingService {
  /**
   * Map Yahoo Finance response to CompanyProfileDto
   * @param yahooData Yahoo Finance API response
   * @param ticker Stock ticker symbol
   * @returns CompanyProfileDto with mapped data
   */
  mapYahooResponseToProfileDto(
    yahooData: YahooQuoteSummaryResponse,
    ticker: string,
  ): CompanyProfileDto {
    const profileDto = new CompanyProfileDto();

    profileDto.ticker = ticker;
    profileDto.name = yahooData.price.longName || '';
    profileDto.sector = yahooData.assetProfile.sector || '';
    profileDto.industry = yahooData.assetProfile.industry || '';
    profileDto.website = yahooData.assetProfile.website || '';
    profileDto.description =
      yahooData.assetProfile.description ||
      yahooData.assetProfile.longBusinessSummary ||
      '';
    profileDto.ceo =
      yahooData.assetProfile.ceo ||
      yahooData.assetProfile.companyOfficers?.[0]?.name ||
      '';
    profileDto.country = yahooData.assetProfile.country || '';
    profileDto.fullTimeEmployees =
      yahooData.assetProfile.fullTimeEmployees?.toString() || '';
    profileDto.phone = yahooData.assetProfile.phone || '';
    profileDto.address =
      yahooData.assetProfile.address || yahooData.assetProfile.address1 || '';
    profileDto.city = yahooData.assetProfile.city || '';
    profileDto.state = yahooData.assetProfile.state || '';
    profileDto.zip = yahooData.assetProfile.zip || '';

    profileDto.logoUrl = '';

    return profileDto;
  }
}
