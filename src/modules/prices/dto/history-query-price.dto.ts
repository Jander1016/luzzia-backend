import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class HistoryQueryDto {
  @ApiProperty({
    required: false,
    default: 7,
    description: 'Días de histórico',
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value, 10))
  days?: number = 7;
}
