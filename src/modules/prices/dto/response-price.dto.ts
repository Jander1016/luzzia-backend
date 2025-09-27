import { ApiProperty } from '@nestjs/swagger';

export class PriceResponseDto {
  @ApiProperty()
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