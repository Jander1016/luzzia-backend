import { ApiProperty } from '@nestjs/swagger';

export class HourlyPriceDto {
  @ApiProperty({
    description: 'Timestamp in ISO format',
    example: '2025-10-01T00:00:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Hour in 24h format',
    example: '00',
  })
  hour: string;

  @ApiProperty({
    description: 'Price in €/kWh',
    example: 0.08,
  })
  price: number;

  @ApiProperty({
    description: 'Price level category',
    enum: ['bajo', 'medio', 'alto', 'muy-alto'],
    example: 'bajo',
  })
  level: 'bajo' | 'medio' | 'alto' | 'muy-alto';

  @ApiProperty({
    description: 'Currency',
    example: 'EUR',
  })
  currency: string;
}

export class HourlyPricesResponseDto {
  @ApiProperty({
    description: 'Array of hourly prices',
    type: [HourlyPriceDto],
  })
  prices: HourlyPriceDto[];

  @ApiProperty({
    description: 'Average price for the period',
    example: 0.12,
  })
  average: number;

  @ApiProperty({
    description: 'Minimum price for the period',
    example: 0.05,
  })
  min: number;

  @ApiProperty({
    description: 'Maximum price for the period',
    example: 0.25,
  })
  max: number;
}