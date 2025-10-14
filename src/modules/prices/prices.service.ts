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
// import {
//   HourlyPricesResponseDto,
//   HourlyPriceDto,
// } from './dto/hourly-prices.dto';
import {
  RecommendationsResponseDto,
  RecommendationDto,
} from './dto/recommendations.dto';
import { DailyAverageDto } from './dto/daily-averages.dto';

interface PvpcEntry {
  date: string; // fecha en formato YYYY-MM-DD
  hour: string;
  price: string;
}

export interface REEApiResponse {
  PVPC: PvpcEntry[];
}

@Injectable()
export class PricesService {
  async getMonthlyAverages(): Promise<{ month: number; avgPrice: number }[]> {
    const currentYear = new Date().getFullYear();
    const stats = await this.priceModel.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
            $lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          avgPrice: { $avg: '$price' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    return stats.map(s => ({ month: s._id, avgPrice: s.avgPrice }));
  }

  async getWeeklyAverages(): Promise<{ week: number; avgPrice: number }[]> {
    const currentYear = new Date().getFullYear();
    const stats = await this.priceModel.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
            $lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`)
          }
        }
      },
      {
        $group: {
          _id: { $isoWeek: '$date' },
          avgPrice: { $avg: '$price' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    return stats.map(s => ({ week: s._id, avgPrice: s.avgPrice }));
  }
  private readonly logger = new Logger(PricesService.name);

  constructor(
    @InjectModel(Price.name) private priceModel: Model<Price>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly priceRepository: PriceRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private transformREEData(reeData: any): CreatePriceDto[] {
    if (!reeData?.PVPC) {
      throw new Error('Inválido formato de datos de API REE');
    }

    const convertDate = (dateStr: string): Date => {
      const [dd, mm, yyyy] = dateStr.split('/');
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`); // Crear objeto Date
    };

    const transformedData = reeData.PVPC.map((item: any) => {
      const date = convertDate(item.Dia);
      const hour = parseInt(item.Hora.split('-')[0], 10);

      const num = parseFloat(item.PCB.replace(',', '.'));
      const price = parseFloat((num / 1000).toFixed(5)); // Convertir a €/kWh

      if (!date || isNaN(hour) || isNaN(price)) {
        this.logger.warn(`Formato de datos inválido: ${JSON.stringify(item)}`);
        return null;
      }

      return { date, hour, price };
    }).filter(Boolean);

    return transformedData;
  }

  async fetchFromExternalApi(): Promise<CreatePriceDto[]> {
    const apiUrl =
      this.configService.get<string>('apis.ree.url') ||
      this.configService.get<string>('reeApiUrl');

    if (!apiUrl) {
      throw new Error('REE API URL not configured');
    }

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
      this.logger.log(
        `📅 Fechas de los datos recibidos: ${[...new Set(prices.map((p) => p.date))].join(', ')}`,
      );
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
        this.logger.error(
          `Error saving price for ${priceData.date} hour ${priceData.hour}`,
          error,
        );
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
    const cachedPrices =
      await this.cacheManager.get<PriceResponseDto[]>(cacheKey);
    if (cachedPrices) {
      this.logger.log(
        `📦 Returning today prices from cache (${cachedPrices.length} items)`,
      );
      return cachedPrices;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Asegurar que sea el inicio del día

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.logger.log(
      `🔍 Buscando precios para la fecha: ${today.toISOString().split('T')[0]}`,
    );

    const prices = await this.priceModel
      .find({
        date: {
          $gte: today,
          $lt: tomorrow,
        },
      })
      .sort({ hour: 1 })
      .exec();

    this.logger.log(
      `📊 Encontrados ${prices.length} precios para hoy (${today.toISOString().split('T')[0]})`,
    );

    const result = prices.map((price) => ({
      date: price.date,
      hour: price.hour,
      price: price.price,
      isFallback: false,
      timestamp: price.timestamp,
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

    return prices.map((price) => ({
      date: price.date,
      hour: price.hour,
      price: price.price,
      isFallback: false,
      timestamp: price.timestamp,
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
    const cachedPrices =
      await this.cacheManager.get<PriceResponseDto[]>(cacheKey);
    if (cachedPrices) {
      this.logger.log(
        `📦 Returning tomorrow prices from cache (${cachedPrices.length} items)`,
      );
      return cachedPrices;
    }

    try {
      const prices = await this.priceRepository.findTomorrowPrices();

      if (prices.length === 0) {
        this.logger.warn('No se encontraron precios para mañana.');
        this.logger.log(
          'Los precios de mañana normalmente se publican sobre las 20:30h',
        );
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
        .limit(24)
        .exec();

      if (latestPrices.length === 0) {
        throw new Error('No hay datos de precios disponibles.');
      }

      todayPrices = latestPrices.map((price) => ({
        date: price.date,
        hour: price.hour,
        price: price.price,
        isFallback: true,
        timestamp: price.timestamp,
      }));

      this.logger.log(`Using fallback data from ${latestPrices[0].date} (${latestPrices.length} records)`);
    }

    const currentHour = new Date().getHours();
    const currentPriceData = todayPrices.find((p) => p.hour === currentHour) || todayPrices[0];
    const currentPrice = currentPriceData.price;

    // Calcular precio más bajo y más alto del día
    let minPrice = todayPrices[0].price;
    let minPriceHour = todayPrices[0].hour;
    let maxPrice = todayPrices[0].price;
    let maxPriceHour = todayPrices[0].hour;
    for (const p of todayPrices) {
      if (p.price < minPrice) {
        minPrice = p.price;
        minPriceHour = p.hour;
      }
      if (p.price > maxPrice) {
        maxPrice = p.price;
        maxPriceHour = p.hour;
      }
    }

    const lastUpdated = new Date().toISOString();

    const stats: DashboardStatsDto = {
      currentPrice,
      minPrice,
      minPriceHour,
      maxPrice,
      maxPriceHour,
      lastUpdated,
    };

    // Guardar en caché por 1 hora (se actualizan con frecuencia por la hora current)
    await this.cacheManager.set(cacheKey, stats, 1000 * 60 * 60 * 1);
    this.logger.log(`💾 Cached dashboard stats`);

    return stats;
  }
 
  async getRecommendations(): Promise<RecommendationsResponseDto> {
    const todayPrices = await this.getTodayPrices();

    if (todayPrices.length === 0) {
      return {
        recommendations: [],
        dailyTip:
          'No hay datos de precios disponibles para generar recomendaciones.',
      };
    }

    const currentHour = new Date().getHours();
    const priceValues = todayPrices.map((p) => p.price);
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const avgPrice =
      priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;

    // Encontrar la hora más barata del día
    const cheapestHour = todayPrices.find((p) => p.price === minPrice);
    // Encontrar la hora más cara del día
    const expensiveHour = todayPrices.find((p) => p.price === maxPrice);

    const recommendations: RecommendationDto[] = [];

    // Recomendación ideal (si estamos en una hora barata)
    const currentPrice =
      todayPrices.find((p) => p.hour === currentHour)?.price || avgPrice;

    if (currentPrice <= avgPrice * 0.8) {
      recommendations.push({
        type: 'ideal',
        title: 'Momento ideal',
        description: 'Pon la lavadora ahora',
        timeRange: 'Próximas 2 horas',
        percentage: `${Math.round(((avgPrice - currentPrice) / avgPrice) * 100)}%`,
        appliance: 'lavadora',
        savingsPercentage: Math.round(
          ((avgPrice - currentPrice) / avgPrice) * 100,
        ),
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
        savingsPercentage: Math.round(
          ((avgPrice - cheapestHour.price) / avgPrice) * 100,
        ),
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

  async getDailyAverages(month: number, year: number): Promise<DailyAverageDto[]> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const stats = await this.priceModel.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: { $dayOfMonth: '$date' }, avgPrice: { $avg: '$price' } } },
      { $sort: { _id: 1 } }
    ]);
    // Obtener cantidad de días del mes
    const daysInMonth = new Date(year, month, 0).getDate();
    // Mapear todos los días del mes
    const result: DailyAverageDto[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const stat = stats.find(s => s._id === day);
      result.push({
        day,
        month,
        year,
        avgPrice: stat ? stat.avgPrice : 0
      });
    }
    return result;
  }
}
