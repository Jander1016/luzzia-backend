import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @ApiProperty({
    description: 'Número de página (1-based)',
    example: 1,
    minimum: 1,
    required: false,
    default: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Número de elementos por página',
    example: 10,
    minimum: 1,
    maximum: 100,
    required: false,
    default: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array de datos'
  })
  data: T[];

  @ApiProperty({
    description: 'Información de paginación'
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}