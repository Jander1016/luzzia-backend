import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MongooseHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Verificar el estado general del sistema' })
  @ApiResponse({ status: 200, description: 'Sistema saludable' })
  @ApiResponse({ status: 503, description: 'Sistema con problemas' })
  @HealthCheck()
  check() {
    return this.health.check([
      // Verificar conexión a MongoDB
      () => this.mongoose.pingCheck('database'),

      // Verificar uso de memoria (máximo 512MB)
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),

      // Verificar uso de memoria RSS (máximo 1GB)
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),

      // Verificar espacio en disco (mínimo 1GB libre)
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9, // 90% utilizado como máximo
        }),
    ]);
  }

  @Get('readiness')
  @ApiOperation({
    summary: 'Verificar si la aplicación está lista para recibir tráfico',
  })
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.mongoose.pingCheck('database')]);
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Verificar si la aplicación está viva' })
  @HealthCheck()
  liveness() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 1024 * 1024 * 1024), // 1GB
    ]);
  }
}
