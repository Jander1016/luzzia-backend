import { ApiProperty } from '@nestjs/swagger';

export class RecommendationDto {
  @ApiProperty({
    description: 'Type of recommendation',
    enum: ['ideal', 'avoid', 'schedule'],
    example: 'ideal'
  })
  type: 'ideal' | 'avoid' | 'schedule';

  @ApiProperty({
    description: 'Recommendation title',
    example: 'Momento ideal'
  })
  title: string;

  @ApiProperty({
    description: 'Recommendation description',
    example: 'Pon la lavadora ahora'
  })
  description: string;

  @ApiProperty({
    description: 'Time range for the recommendation',
    example: 'Próximas 2 horas'
  })
  timeRange: string;

  @ApiProperty({
    description: 'Percentage indicator',
    example: '40%',
    required: false
  })
  percentage?: string;

  @ApiProperty({
    description: 'Appliance for the recommendation',
    example: 'lavadora'
  })
  appliance: string;

  @ApiProperty({
    description: 'Savings percentage',
    example: 25,
    required: false
  })
  savingsPercentage?: number;
}

export class RecommendationsResponseDto {
  @ApiProperty({
    description: 'Array of recommendations',
    type: [RecommendationDto]
  })
  recommendations: RecommendationDto[];

  @ApiProperty({
    description: 'Daily tip for energy saving',
    example: 'Los precios más baratos serán entre las 14:00 y 16:00'
  })
  dailyTip: string;
}