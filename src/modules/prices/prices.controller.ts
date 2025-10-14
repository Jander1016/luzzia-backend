import {
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PricesService } from './prices.service';
import { PriceResponseDto } from './dto/response-price.dto';
import { HistoryQueryDto } from './dto/history-query-price.dto';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
// import { HourlyPricesResponseDto } from './dto/hourly-prices.dto';
import { RecommendationsResponseDto } from './dto/recommendations.dto';
import { PricesCron } from '../../shared/cron/prices.cron';
import { DailyAverageDto } from './dto/daily-averages.dto';
import { DailyAveragesQueryDto } from './dto/daily-averages-query.dto';

@ApiTags('Prices')
@Controller('prices')
export class PricesController {
  @Get('monthly-averages')
  @ApiOperation({ summary: 'Obtener precios promedio por mes del año actual' })
  @ApiResponse({ status: 200, description: 'Lista de promedios mensuales' })
  async getMonthlyAverages(): Promise<{ month: number; avgPrice: number }[]> {
    return this.pricesService.getMonthlyAverages();
  }

  @Get('weekly-averages')
  @ApiOperation({ summary: 'Obtener precios promedio por semana del año actual' })
  @ApiResponse({ status: 200, description: 'Lista de promedios semanales' })
  async getWeeklyAverages(): Promise<{ week: number; avgPrice: number }[]> {
    return this.pricesService.getWeeklyAverages();
  }
  constructor(
    private readonly pricesService: PricesService,
    private readonly pricesCron: PricesCron,
  ) {}

  @Get('today')
  @ApiOperation({ summary: 'Obtener precios del día actual' })
  @ApiResponse({ status: 200, type: [PriceResponseDto] })
  async getTodayPrices(): Promise<PriceResponseDto[]> {
    return this.pricesService.getTodayPrices();
  }

  @Get('history')
  @ApiOperation({ summary: 'Obtener histórico de precios' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, type: [PriceResponseDto] })
  async getHistory(
    @Query() query: HistoryQueryDto,
  ): Promise<PriceResponseDto[]> {
    return this.pricesService.getPriceHistory(query.days);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de precios' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200 })
  async getStats(@Query('days') days: number = 30): Promise<any> {
    return this.pricesService.getPriceStats(days);
  }

  @Get('tomorrow')
  @ApiOperation({ summary: 'Obtener precios del día siguiente' })
  @ApiResponse({ status: 200, type: [PriceResponseDto] })
  async getTomorrowPrices(): Promise<PriceResponseDto[]> {
    return this.pricesService.getTomorrowPrices();
  }

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Obtener estadísticas para el dashboard' })
  @ApiResponse({ status: 200, type: DashboardStatsDto })
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.pricesService.getDashboardStats();
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Obtener recomendaciones de uso energético' })
  @ApiResponse({ status: 200, type: RecommendationsResponseDto })
  async getRecommendations(): Promise<RecommendationsResponseDto> {
    return this.pricesService.getRecommendations();
  }

  @Post('fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forzar actualización de precios' })
  @ApiResponse({
    status: 200,
    description: 'Precios actualizados correctamente',
  })
  async fetchPrices(): Promise<{ message: string; saved: number }> {
    const prices = await this.pricesService.fetchFromExternalApi();
    const savedCount = await this.pricesService.savePrices(prices);

    return {
      message: 'Prices updated successfully',
      saved: savedCount,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Verificar estado del sistema de precios' })
  @ApiResponse({ status: 200, description: 'Estado del sistema' })
  async getSystemHealth(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayPrices = await this.pricesService.getTodayPrices();
    const yesterdayPrices = await this.pricesService.getPriceHistory(2);
    const yesterdayCount = yesterdayPrices.filter(
      (p) => p.date.toDateString() === yesterday.toDateString(),
    ).length;

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      timezone: process.env.TZ || 'UTC',
      cronSchedule: process.env.CRON_SCHEDULE || '15 20 * * *',
      data: {
        today: {
          date: today.toISOString().split('T')[0],
          count: todayPrices.length,
          hasData: todayPrices.length > 0,
          latestTimestamp:
            todayPrices.length > 0 ? todayPrices[0].timestamp : null,
        },
        yesterday: {
          date: yesterday.toISOString().split('T')[0],
          count: yesterdayCount,
          hasData: yesterdayCount > 0,
        },
      },
    };
  }

  @Get('cron/status')
  @ApiOperation({ summary: 'Obtener estado del CRON de precios' })
  @ApiResponse({ status: 200, description: 'Estado del CRON' })
  async getCronStatus(): Promise<any> {
    return this.pricesCron.getCronStatus();
  }

  @Post('cron/trigger')
  @ApiOperation({ summary: 'Disparar manualmente la actualización de precios' })
  @ApiResponse({ status: 200, description: 'Actualización completada' })
  @HttpCode(HttpStatus.OK)
  async triggerManualUpdate(): Promise<{ message: string; timestamp: string }> {
    await this.pricesCron.forceDailyUpdate();
    return {
      message: 'Manual update triggered successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('daily-averages')
  @ApiOperation({ summary: 'Obtener precios promedio diario del mes actual o indicado' })
  @ApiResponse({ status: 200, type: [DailyAverageDto] })
  async getDailyAverages(
    @Query() query: DailyAveragesQueryDto,
  ): Promise<DailyAverageDto[]> {
    const now = new Date();
    const month = query.month ?? now.getMonth() + 1;
    const year = query.year ?? now.getFullYear();
    return this.pricesService.getDailyAverages(month, year);
  }
}
