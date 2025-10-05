import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Current price in €/kWh',
    example: 0.2,
  })
  @IsNumber()
  currentPrice: number;

  @ApiProperty({
    description: 'Next hour price in €/kWh',
    example: 0.25,
  })
  @IsNumber()
  nextHourPrice: number;

  @ApiProperty({
    description: '% change in price',
    example: 5,
  })
  @IsNumber()
  priceChangePercentage: number;

  @ApiProperty({
    description: '% monthly savings',
    example: 10,
  })
  @IsNumber()
  monthlySavings: number;

  @ApiProperty({
    description: 'Comparison type',
    example: 'tarifa fija',
  })
  comparisonType: string;

  @ApiProperty({
    description: 'Last updated timestamp in ISO format',
    example: '2024-06-01T12:00:00Z',
  })
  lastUpdated: string;
}