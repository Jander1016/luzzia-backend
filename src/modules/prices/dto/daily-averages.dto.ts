import { ApiProperty } from '@nestjs/swagger';

export class DailyAverageDto {
  @ApiProperty({ example: 1, description: 'Día del mes' })
  day: number;

  @ApiProperty({ example: 10, description: 'Mes (1-12)' })
  month: number;

  @ApiProperty({ example: 2025, description: 'Año (YYYY)' })
  year: number;

  @ApiProperty({ example: 0.145, description: 'Precio promedio en €/kWh' })
  avgPrice: number;
}
