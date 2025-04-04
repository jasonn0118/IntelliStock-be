/**
 * Interface for Yahoo Finance price module data
 */
export interface YahooPriceData {
  longName?: string;
  shortName?: string;
  symbol?: string;
  marketCap?: number;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
}

/**
 * Interface for Yahoo Finance asset profile module data
 */
export interface YahooAssetProfileData {
  sector?: string;
  industry?: string;
  website?: string;
  description?: string;
  longBusinessSummary?: string;
  ceo?: string;
  companyOfficers?: Array<{
    name: string;
    title: string;
    age?: number;
    yearBorn?: number;
    fiscalYear?: number;
    totalPay?: number;
  }>;
  country?: string;
  fullTimeEmployees?: number;
  phone?: string;
  address?: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
}

/**
 * Interface for Yahoo Finance quote summary response
 */
export interface YahooQuoteSummaryResponse {
  price: YahooPriceData;
  assetProfile: YahooAssetProfileData;
}
