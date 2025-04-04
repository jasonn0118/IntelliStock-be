import { ApiProperty } from '@nestjs/swagger';

export class CompanyProfileDto {
  @ApiProperty({ example: 'AAPL', description: 'Stock ticker symbol' })
  ticker: string;

  @ApiProperty({ example: 'Apple Inc.', description: 'Company name' })
  name: string;

  @ApiProperty({ example: 'Technology', description: 'Company sector' })
  sector: string;

  @ApiProperty({
    example: 'Consumer Electronics',
    description: 'Company industry',
  })
  industry: string;

  @ApiProperty({
    example: 'https://www.apple.com',
    description: 'Company website URL',
  })
  website: string;

  @ApiProperty({
    example:
      'Apple Inc. designs, manufactures, and markets smartphones, tablets, and computers.',
    description: 'Company description',
  })
  description: string;

  @ApiProperty({ example: 'Tim Cook', description: 'CEO name' })
  ceo: string;

  @ApiProperty({
    example: 'United States',
    description: 'Country of headquarters',
  })
  country: string;

  @ApiProperty({
    example: '154000',
    description: 'Number of full-time employees',
  })
  fullTimeEmployees: string;

  @ApiProperty({ example: '408-996-1010', description: 'Contact phone number' })
  phone: string;

  @ApiProperty({ example: '1 Apple Park Way', description: 'Street address' })
  address: string;

  @ApiProperty({ example: 'Cupertino', description: 'City' })
  city: string;

  @ApiProperty({ example: 'CA', description: 'State' })
  state: string;

  @ApiProperty({ example: '95014', description: 'ZIP code' })
  zip: string;

  @ApiProperty({
    example: 'https://img.logo.dev/ticker/aapl',
    description: 'URL to company logo',
  })
  logoUrl: string;
}
