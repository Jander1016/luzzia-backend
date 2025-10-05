import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Price } from './entities/price.entity';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { CreatePriceDto } from './dto/create-price.dto';
import { catchError, firstValueFrom } from 'rxjs';
import { PriceResponseDto } from './dto/response-price.dto';
import { PriceRepository } from './repositories/price.repository';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { HourlyPricesResponseDto, HourlyPriceDto } from './dto/hourly-prices.dto';
import { RecommendationsResponseDto, RecommendationDto } from './dto/recommendations.dto';

interface PvpcEntry {
  date: string;   // fecha en formato YYYY-MM-DD
  hour: string;
  price: string;
}

export interface REEApiResponse {
  PVPC: PvpcEntry[];
}

@Injectable()
export class PricesService {

  private readonly logger = new Logger(PricesService.name);

  constructor(
    @InjectModel(Price.name) private priceModel: Model<Price>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly priceRepository: PriceRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  private transformREEData(reeData: any): CreatePriceDto[] {
    if (!reeData?.PVPC) {
      throw new Error('Inválido formato de datos de API REE');
    }

    const convertDate = (dateStr: string): Date => {
      const [dd, mm, yyyy] = dateStr.split('/');
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`); // Crear objeto Date
    };

    const transformedData = reeData.PVPC.map((item: any) => {
      let date = convertDate(item.Dia);
      const hour = parseInt(item.Hora.split('-')[0], 10);
      const price = parseFloat(item.PCB) / 1000; // Convertir a €/kWh
      if (!date || isNaN(hour) || isNaN(price)) {
        this.logger.warn(`Formato de datos inválido: ${JSON.stringify(item)}`);
        return null;
      }

      return { date, hour, price };
    }).filter(Boolean);
    
    return transformedData;
  }


  async fetchFromExternalApi(): Promise<CreatePriceDto[]> {
    const apiUrl = this.configService.get<string>('reeApiUrl');

    this.logger.log(`Fetching de precios desde API externa: ${apiUrl}`);

    const { data } = await firstValueFrom(
      this.httpService.get(apiUrl).pipe(
        catchError((error) => {
          this.logger.error('Error fetching from REE API', error.stack);
          throw new Error(`REE API error: ${error.message}`);
        }),
      ),
    );

    return this.transformREEData(data);
  }

  async savePrices(prices: CreatePriceDto[]): Promise<number> {
    let savedCount = 0;

    this.logger.log(`💾 Intentando guardar ${prices.length} precios`);
    
    if (prices.length > 0) {
      this.logger.log(`📅 Fechas de los datos recibidos: ${[...new Set(prices.map(p => p.date))].join(', ')}`);
    }

    for (const priceData of prices) {
      try {
        await this.priceModel.findOneAndUpdate(
          { date: priceData.date, hour: priceData.hour },
          { ...priceData, timestamp: new Date() },
          { upsert: true, new: true },
        );
        savedCount++;
      } catch (error) {
        this.logger.error(`Error saving price for ${priceData.date} hour ${priceData.hour}`, error);
      }
    }

    // Invalidar caché cuando se guardan nuevos datos
    if (savedCount > 0) {
      await this.clearAllPriceCache();
    }

    this.logger.log(`✅ Guardados ${savedCount} precios`);
    return savedCount;
  }

  async getTodayPrices(): Promise<PriceResponseDto[]> {
    const cacheKey = 'today_prices';
    
    // Intentar obtener del caché primero
    const cachedPrices = await this.cacheManager.get<PriceResponseDto[]>(cacheKey);
    if (cachedPrices) {
      this.logger.log(`📦 Returning today prices from cache (${cachedPrices.length} items)`);
      return cachedPrices;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Asegurar que sea el inicio del día
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    this.logger.log(`🔍 Buscando precios para la fecha: ${today.toISOString().split('T')[0]}`);

    const prices = await this.priceModel
      .find({ 
        date: { 
          $gte: today, 
          $lt: tomorrow 
        } 
      })
      .sort({ hour: 1 })
      .exec();

    this.logger.log(`📊 Encontrados ${prices.length} precios para hoy (${today.toISOString().split('T')[0]})`);
    
    const result = prices.map(price => ({
      date: price.date,
      hour: price.hour,
      price: price.price,
      isFallback: false,
      timestamp: price.timestamp
    }));

    // Guardar en caché por 6 horas (se actualiza 1-2 veces al día)
    await this.cacheManager.set(cacheKey, result, 1000 * 60 * 60 * 6);
    this.logger.log(`💾 Cached today prices (${result.length} items)`);

    return result;
  }

  async getPriceHistory(days: number = 7): Promise<PriceResponseDto[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0); // Asegurar que sea el inicio del día

    const prices = await this.priceModel
      .find({ date: { $gte: startDate } })
      .sort({ date: -1, hour: 1 })
      .exec();

    return prices.map(price => ({
      date: price.date,
      hour: price.hour,
      price: price.price,
      isFallback: false,
      timestamp: price.timestamp
    }));
  }

  async getPriceStats(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0); // Asegurar que sea el inicio del día

    const stats = await this.priceModel.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    return stats;
  }

  async getTomorrowPrices(): Promise<PriceResponseDto[]> {
    const cacheKey = 'tomorrow_prices';
    
    // Intentar obtener del caché primero
    const cachedPrices = await this.cacheManager.get<PriceResponseDto[]>(cacheKey);
    if (cachedPrices) {
      this.logger.log(`📦 Returning tomorrow prices from cache (${cachedPrices.length} items)`);
      return cachedPrices;
    }

    try {
      const prices = await this.priceRepository.findTomorrowPrices();
      
      if (prices.length === 0) {
        this.logger.warn('No se encontraron precios para mañana.');
        this.logger.log('Los precios de mañana normalmente se publican sobre las 20:30h');
      }

      const result = prices.map((price) => ({
        date: price.date,
        hour: price.hour,
        price: price.price,
        isFallback: false,
        timestamp: price.timestamp,
      }));

      // Guardar en caché por 12 horas (datos de mañana se actualizan 1 vez al día)
      if (result.length > 0) {
        await this.cacheManager.set(cacheKey, result, 1000 * 60 * 60 * 12);
        this.logger.log(`💾 Cached tomorrow prices (${result.length} items)`);
      }

      return result;
    } catch (error) {
      this.logger.error('Error en getTomorrowPrices:', error);
      throw error;
    }
  }

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const cacheKey = 'dashboard_stats';
    
    // Intentar obtener del caché primero
    const cachedStats = await this.cacheManager.get<DashboardStatsDto>(cacheKey);
    if (cachedStats) {
      this.logger.log(`📦 Returning dashboard stats from cache`);
      return cachedStats;
    }

    // Intentar obtener precios de hoy
    let todayPrices = await this.getTodayPrices();
    
    // Si no hay datos de hoy, intentar obtener datos del último día disponible
    if (todayPrices.length === 0) {
      this.logger.warn('No data found for today, searching for latest available data');
      
      const latestPrices = await this.priceModel
        .find({})
        .sort({ date: -1, hour: 1 })
        .limit(24) // Obtener las últimas 24 horas
        .exec();
      
      if (latestPrices.length === 0) {
        throw new Error('No hay datos de precios disponibles.');
      }
      
      todayPrices = latestPrices.map(price => ({
        date: price.date,
        hour: price.hour,
        price: price.price,
        isFallback: true,
        timestamp: price.timestamp
      }));
      
      this.logger.log(`Using fallback data from ${latestPrices[0].date} (${latestPrices.length} records)`);
    }

    const currentHour = new Date().getHours();
    const currentPriceData = todayPrices.find((p) => p.hour === currentHour) || todayPrices[0];
    const nextHourPriceData = todayPrices.find((p) => p.hour === currentHour + 1) || todayPrices[1];
    
    const currentPrice = currentPriceData.price;
    const nextHourPrice = nextHourPriceData?.price || 0;
    const priceChangePercentage = nextHourPrice > 0 
      ? ((nextHourPrice - currentPrice) / currentPrice) * 100 
      : 0;

    // Calcular ahorro mensual comparado con tarifa fija promedio (0.20 €/kWh)
    const fixedTariff = 0.2;
    const avgPrice = todayPrices.reduce((sum, p) => sum + p.price, 0) / todayPrices.length;
    const monthlySavings = ((fixedTariff - avgPrice) / fixedTariff) * 100;
    
    const comparisonType = 'tarifa fija';
    const lastUpdated = new Date().toISOString();

    const stats = {
      currentPrice,
      nextHourPrice,
      priceChangePercentage: Math.round(priceChangePercentage * 100) / 100,
      monthlySavings: Math.round(monthlySavings * 100) / 100,
      comparisonType,
      lastUpdated,
    };

    // Guardar en caché por 1 hora (se actualizan con frecuencia por la hora actual)
    await this.cacheManager.set(cacheKey, stats, 1000 * 60 * 60 * 1);
    this.logger.log(`💾 Cached dashboard stats`);

    return stats;
  }

  private getPriceLevel(
    price: number,
    min: number,
    max: number,
  ): 'bajo' | 'medio' | 'alto' | 'muy-alto' {
    const range = max - min;
    const quartile = range / 4;

    if (price <= min + quartile) return 'bajo';
    if (price <= min + 2 * quartile) return 'medio';
    if (price <= min + 3 * quartile) return 'alto';
    return 'muy-alto';
  }

  async getHourlyPrices(
    period: 'today' | 'week' | 'month' = 'today',
  ): Promise<HourlyPricesResponseDto> {
    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
    }

    // No convertir a string, usar objetos Date directamente
    const prices = await this.priceModel
      .find({
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ date: 1, hour: 1 })
      .exec();

    if (prices.length === 0) {
      return {
        prices: [],
        average: 0,
        min: 0,
        max: 0,
      };
    }

    const priceValues = prices.map((p) => p.price);
    const min = Math.min(...priceValues);
    const max = Math.max(...priceValues);
    const average = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;

    const hourlyPrices: HourlyPriceDto[] = prices.map((price) => {
      const date = new Date(price.date);
      date.setHours(price.hour, 0, 0, 0);

      return {
        timestamp: date.toISOString(),
        hour: price.hour.toString().padStart(2, '0'),
        price: Math.round(price.price * 1000) / 1000,
        level: this.getPriceLevel(price.price, min, max),
        currency: 'EUR',
      };
    });

    return {
      prices: hourlyPrices,
      average: Math.round(average * 1000) / 1000,
      min: Math.round(min * 1000) / 1000,
      max: Math.round(max * 1000) / 1000,
    };
  }

  async getRecommendations(): Promise<RecommendationsResponseDto> {
    const todayPrices = await this.getTodayPrices();

    if (todayPrices.length === 0) {
      return {
        recommendations: [],
        dailyTip: 'No hay datos de precios disponibles para generar recomendaciones.',
      };
    }

    const currentHour = new Date().getHours();
    const priceValues = todayPrices.map((p) => p.price);
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const avgPrice = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;

    // Encontrar la hora más barata del día
    const cheapestHour = todayPrices.find((p) => p.price === minPrice);
    // Encontrar la hora más cara del día
    const expensiveHour = todayPrices.find((p) => p.price === maxPrice);

    const recommendations: RecommendationDto[] = [];

    // Recomendación ideal (si estamos en una hora barata)
    const currentPrice = todayPrices.find((p) => p.hour === currentHour)?.price || avgPrice;
    
    if (currentPrice <= avgPrice * 0.8) {
      recommendations.push({
        type: 'ideal',
        title: 'Momento ideal',
        description: 'Pon la lavadora ahora',
        timeRange: 'Próximas 2 horas',
        percentage: `${Math.round(((avgPrice - currentPrice) / avgPrice) * 100)}%`,
        appliance: 'lavadora',
        savingsPercentage: Math.round(((avgPrice - currentPrice) / avgPrice) * 100),
      });
    }

    // Recomendación de evitar (si estamos en una hora cara)
    if (currentPrice >= avgPrice * 1.2) {
      recommendations.push({
        type: 'avoid',
        title: 'Evitar ahora',
        description: 'Espera para usar electrodomésticos de alto consumo',
        timeRange: `Hasta las ${(currentHour + 2) % 24}:00`,
        percentage: `${Math.round(((currentPrice - avgPrice) / avgPrice) * 100)}%`,
        appliance: 'lavavajillas',
      });
    }

    // Recomendación de programar
    if (cheapestHour && cheapestHour.hour > currentHour) {
      recommendations.push({
        type: 'schedule',
        title: 'Programar para más tarde',
        description: `Programa el lavavajillas para las ${cheapestHour.hour}:00`,
        timeRange: `A las ${cheapestHour.hour}:00`,
        appliance: 'lavavajillas',
        savingsPercentage: Math.round(((avgPrice - cheapestHour.price) / avgPrice) * 100),
      });
    }

    // Consejo del día
    const cheapestTime = cheapestHour ? `${cheapestHour.hour}:00` : 'madrugada';
    const expensiveTime = expensiveHour ? `${expensiveHour.hour}:00` : 'tarde';
    const dailyTip = `Los precios más baratos serán a las ${cheapestTime} y los más caros a las ${expensiveTime}. Ahorra hasta un ${Math.round(((maxPrice - minPrice) / maxPrice) * 100)}% eligiendo bien el momento.`;

    return {
      recommendations,
      dailyTip,
    };
  }

  /**
   * Invalidar todo el caché relacionado con precios
   */
  private async clearAllPriceCache(): Promise<void> {
    try {
      const cacheKeys = ['today_prices', 'tomorrow_prices', 'dashboard_stats'];
      
      for (const key of cacheKeys) {
        await this.cacheManager.del(key);
      }
      
      this.logger.log(`🗑️ Cache cleared for keys: ${cacheKeys.join(', ')}`);
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }
}