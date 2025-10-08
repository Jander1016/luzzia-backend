import { ApiProperty } from '@nestjs/swagger';

export class PriceResponseDto {
  @ApiProperty({
    description: 'Fecha del precio',
    example: '2025-10-05T00:00:00.000Z',
  })
  date: Date;

  @ApiProperty()
  hour: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  isFallback: boolean;

  @ApiProperty()
  timestamp: Date;
}
