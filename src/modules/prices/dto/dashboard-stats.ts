import { ApiProperty } from "@nestjs/swagger/dist/decorators"
import { IsNumber } from "class-validator"

export class DashboardStatsDto {

  @ApiProperty({
    description: 'Current price in €/kWh',
    example: 0.2
  })
  @IsNumber()
  currentPrice: number           // Precio actual €/kWh

  @ApiProperty({
    description: 'Next hour price in €/kWh',
    example: 0.25
  })
  @IsNumber()
  nextHourPrice: number          // Precio próxima hora

  @ApiProperty({
    description: '% change in price',
    example: 5
  })
  @IsNumber()
  priceChangePercentage: number  // % cambio precio

  @ApiProperty({
    description: '% monthly savings',
    example: 10
  })
  @IsNumber()
  monthlySavings: number         // % ahorro mensual

  @ApiProperty({
    description: 'Comparison type',
    example: 'tarifa fija'
  })
  comparisonType: string         // "tarifa fija"

  @ApiProperty({
    description: 'Last updated timestamp in ISO format',
    example: '2024-06-01T12:00:00Z'
  })
  lastUpdated: string            // ISO timestamp
}