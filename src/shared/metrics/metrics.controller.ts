import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { register, collectDefaultMetrics } from 'prom-client';

// Inicializar métricas por defecto
collectDefaultMetrics({ register });

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', register.contentType)
  @ApiOperation({ summary: 'Obtener métricas de Prometheus' })
  @ApiResponse({ status: 200, description: 'Métricas en formato Prometheus' })
  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}