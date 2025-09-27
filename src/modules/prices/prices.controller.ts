import { Controller, Get, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PricesService } from './prices.service';
import { PriceResponseDto } from './dto/response-price.dto';
import { HistoryQueryDto } from './dto/history-query-price.dto';

@ApiTags('Prices')
@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

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
  async getHistory(@Query() query: HistoryQueryDto): Promise<PriceResponseDto[]> {
    return this.pricesService.getPriceHistory(query.days);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de precios' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200 })
  async getStats(@Query('days') days: number = 30): Promise<any> {
    return this.pricesService.getPriceStats(days);
  }

  @Post('fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forzar actualización de precios' })
  @ApiResponse({ status: 200, description: 'Precios actualizados correctamente' })
  async fetchPrices(): Promise<{ message: string; saved: number }> {
    const prices = await this.pricesService.fetchFromExternalApi();
    const savedCount = await this.pricesService.savePrices(prices);
    
    return { 
      message: 'Prices updated successfully', 
      saved: savedCount 
    };
  }
}