import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { Price } from '../../modules/prices/entities/price.entity';
import { CreatePriceDto } from '../../modules/prices/dto/create-price.dto';
import { PriceResponseDto } from '../../modules/prices/dto/response-price.dto';
import { DashboardStatsDto } from '../../modules/prices/dto/dashboard-stats.dto';
import { ExternalApiService } from '../providers/external-api.service';
import { AppLogger } from '../common/app-logger.service';
import { ResilienceService } from '../common/resilience.service';

@Injectable()
export class EnhancedPricesService {
  constructor(
    @InjectModel(Price.name) private priceModel: Model<Price>,
    private readonly configService: ConfigService,
    private readonly externalApiService: ExternalApiService,
    private readonly logger: AppLogger,
    private readonly resilienceService: ResilienceService,
  ) {}

  async fetchFromExternalApi(): Promise<CreatePriceDto[]> {
    const startTime = Date.now();

    try {
      this.logger.logBusinessEvent('price_fetch_started');

      const prices = await this.resilienceService.executeWithRetry(
        () => this.externalApiService.fetchPriceData(),
        {
          maxRetries: this.configService.get<number>('maxRetries', 3),
          retryCondition: (error) => this.isRetryableApiError(error),
        },
      );

      const duration = Date.now() - startTime;
      this.logger.logPerformance('external_api_fetch', duration, {
        pricesCount: prices.length,
      });
      this.logger.logBusinessEvent('price_fetch_completed', {
        count: prices.length,
      });

      return prices;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logError(error, {
        module: 'PricesService',
        method: 'fetchFromExternalApi',
        duration,
      });
      throw error;
    }
  }

  async savePrices(prices: CreatePriceDto[]): Promise<number> {
    const startTime = Date.now();
    let savedCount = 0;

    this.logger.logDataSync('save_started', prices.length, 'external_api');

    if (prices.length > 0) {
      const uniqueDates = [
        ...new Set(prices.map((p) => p.date.toISOString().split('T')[0])),
      ];
      this.logger.logBusinessEvent('saving_prices_for_dates', {
        dates: uniqueDates,
      });
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
        this.logger.logError(error, {
          module: 'PricesService',
          method: 'savePrices',
          metadata: { date: priceData.date, hour: priceData.hour },
        });
      }
    }

    const duration = Date.now() - startTime;
    this.logger.logDataSync('save_completed', savedCount, 'database', {
      duration,
    });
    this.logger.logPerformance('save_prices', duration, {
      totalCount: prices.length,
      savedCount,
    });

    return savedCount;
  }

  async getTodayPrices(): Promise<PriceResponseDto[]> {
    const startTime = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayString = today.toISOString().split('T')[0];
    this.logger.logBusinessEvent('fetching_today_prices', {
      date: todayString,
    });

    try {
      const prices = await this.priceModel
        .find({
          date: {
            $gte: today,
            $lt: tomorrow,
          },
        })
        .sort({ hour: 1 })
        .exec();

      const duration = Date.now() - startTime;
      this.logger.logPerformance('get_today_prices', duration, {
        count: prices.length,
      });

      if (prices.length === 0) {
        this.logger.logBusinessEvent('no_prices_found_for_today', {
          date: todayString,
        });
      }

      return prices.map((price) => ({
        date: price.date,
        hour: price.hour,
        price: price.price,
        isFallback: false,
        timestamp: price.timestamp,
      }));
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logError(error, {
        module: 'PricesService',
        method: 'getTodayPrices',
        duration,
      });
      throw error;
    }
  }

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const startTime = Date.now();

    try {
      this.logger.logBusinessEvent('dashboard_stats_requested');

      let todayPrices = await this.getTodayPrices();

      // Si no hay datos para hoy, usar datos más recientes como fallback
      if (todayPrices.length === 0) {
        this.logger.logBusinessEvent('using_fallback_data_for_dashboard');

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

        this.logger.logBusinessEvent('fallback_data_used', {
          dataDate: latestPrices[0].date,
          recordCount: latestPrices.length,
        });
      }

      const currentHour = new Date().getHours();
      const currentPriceData =
        todayPrices.find((p) => p.hour === currentHour) || todayPrices[0];
      const nextHourPriceData =
        todayPrices.find((p) => p.hour === currentHour + 1) || todayPrices[1];

      const currentPrice = currentPriceData.price;
      const nextHourPrice = nextHourPriceData?.price || 0;
      const priceChangePercentage =
        nextHourPrice > 0
          ? ((nextHourPrice - currentPrice) / currentPrice) * 100
          : 0;

      const fixedTariff = 0.2;
      const avgPrice =
        todayPrices.reduce((sum, p) => sum + p.price, 0) / todayPrices.length;
      const monthlySavings = ((fixedTariff - avgPrice) / fixedTariff) * 100;

      const result = {
        currentPrice,
        nextHourPrice,
        priceChangePercentage: Math.round(priceChangePercentage * 100) / 100,
        monthlySavings: Math.round(monthlySavings * 100) / 100,
        comparisonType: 'tarifa fija',
        lastUpdated: new Date().toISOString(),
      };

      const duration = Date.now() - startTime;
      this.logger.logPerformance('get_dashboard_stats', duration);
      this.logger.logBusinessEvent('dashboard_stats_completed', {
        currentPrice,
        priceChangePercentage: result.priceChangePercentage,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logError(error, {
        module: 'PricesService',
        method: 'getDashboardStats',
        duration,
      });
      throw error;
    }
  }

  private isRetryableApiError(error: any): boolean {
    // Errores específicos de APIs de electricidad que vale la pena reintentar
    const retryableErrors = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'EAI_AGAIN',
      'ERR_NETWORK',
    ];

    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const retryableMessages = ['timeout', 'network', 'connection'];

    return (
      retryableErrors.some((code) => error.code === code) ||
      retryableStatusCodes.includes(error.response?.status) ||
      retryableMessages.some((msg) =>
        error.message?.toLowerCase().includes(msg),
      )
    );
  }
}
