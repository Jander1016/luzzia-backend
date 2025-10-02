import { ApiProperty } from '@nestjs/swagger';

export class PriceUpdateDto {
  @ApiProperty({
    description: 'Event type',
    example: 'price_update'
  })
  type: string;

  @ApiProperty({
    description: 'Price update data'
  })
  data: {
    currentPrice: number;
    timestamp: string;
    level: string;
  };
}