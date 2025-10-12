import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Precio actual en €/kWh',
    example: 0.2,
  })
  @IsNumber()
  currentPrice: number;

  @ApiProperty({
    description: 'Precio más bajo del día en €/kWh',
    example: 0.08,
  })
  @IsNumber()
  minPrice: number;

  @ApiProperty({
    description: 'Hora exacta del precio más bajo (0-23)',
    example: 3,
  })
  @IsNumber()
  minPriceHour: number;

  @ApiProperty({
    description: 'Precio más alto del día en €/kWh',
    example: 0.25,
  })
  @IsNumber()
  maxPrice: number;

  @ApiProperty({
    description: 'Hora exacta del precio más alto (0-23)',
    example: 19,
  })
  @IsNumber()
  maxPriceHour: number;

  @ApiProperty({
    description: 'Última actualización en formato ISO',
    example: '2024-06-01T12:00:00Z',
  })
  lastUpdated: string;
}
