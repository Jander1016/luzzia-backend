import { IsDate, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePriceDto {
  @ApiProperty({ description: 'Fecha del precio' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty({ description: 'Hora (0-23)' })
  @IsNumber()
  hour: number;

  @ApiProperty({ description: 'Precio en €/kWh' })
  @IsNumber()
  price: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isFallback?: boolean;
}
