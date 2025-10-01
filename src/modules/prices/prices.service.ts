import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Price } from './entities/price.entity';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, now } from 'mongoose';
import { CreatePriceDto } from './dto/create-price.dto';
import { catchError, firstValueFrom } from 'rxjs';
import { PriceResponseDto } from './dto/response-price.dto';
import { convertDate } from 'src/shared/common/utils';
import { DashboardStatsDto } from './dto/dashboard-stats';

@Injectable()
export class PricesService {

  private readonly logger = new Logger(PricesService.name);

  constructor(
    @InjectModel(Price.name) private priceModel: Model<Price>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) { }

  private transformREEData(reeData: any): CreatePriceDto[] {
    if (!reeData?.PVPC) {
      throw new Error('Inválido formato de datos de API REE');
    }

    return reeData.PVPC.map((item: any) => {
      let date = new Date(item.Dia);
      const hour = parseInt(item.Hora.split('-')[0], 10);
      const price = parseFloat(item.PCB) / 1000; // Convertir a €/kWh

      console.log({
        date: item.Dia,
        hour: item.Hora,
        price: item.PCB,
      })

      if (date.toString() === 'Invalid Date') {
        date = new Date(convertDate(item.Dia));
      }

      if (isNaN(hour) || isNaN(price)) {
        this.logger.warn(`Formato de datos inválido: ${JSON.stringify(item)}`);
        return null;
      }

      return { date, hour, price };
    }).filter(Boolean);

  }


  async fetchFromExternalApi(): Promise<CreatePriceDto[]> {
    const apiUrl = this.configService.get<string>('reeApiUrl');

    this.logger.log(`Fetching de precios desde API externa: ${apiUrl}`);

    const { data } = await firstValueFrom(
      this.httpService.get(apiUrl).pipe(
        catchError((error) => {
          this.logger.error('Error fetching desde API REE', error.stack);
          throw new Error(`API REE error: ${error.message}`);
        }),
      ),
    );

    return this.transformREEData(data);
  }

  async savePrices(prices: CreatePriceDto[]): Promise<number> {
    let savedCount = 0;

    for (const priceData of prices) {
      try {
        await this.priceModel.findOneAndUpdate(
          { date: priceData.date, hour: priceData.hour },
          { ...priceData, timestamp: new Date() },
          { upsert: true, new: true },
        );
        savedCount++;
      } catch (error) {
        this.logger.error(`Error guardando el precio para ${priceData.date} hora ${priceData.hour}`, error);
      }
    }

    this.logger.log(`Se guardaron ${savedCount} precios nuevos.`);
    return savedCount;
  }
  
  async getTodayPrices(): Promise<PriceResponseDto[]> {
    try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        console.log('🔍 Buscando precios para:', {
            startOfDay: startOfDay.toISOString(),
            endOfDay: endOfDay.toISOString(),
            hoy: today.toISOString()
        });

        const prices = await this.priceModel
            .find({
                timestamp: {
                    $gte: startOfDay,
                    $lt: endOfDay
                }
            })
            .sort({ hour: 1 })
            .exec();

        console.log('📊 Precios encontrados:', prices.length);

        if (prices.length === 0) {
            console.warn('⚠️ No se encontraron precios para hoy. Verificar:');
            console.warn('1. Si hay datos en la base de datos');
            console.warn('2. El timezone de la aplicación');
            console.warn('3. El formato de las fechas en MongoDB');
        }

        return prices.map(price => ({
            date: price.date,
            hour: price.hour,
            price: price.price,
            isFallback: false,
            timestamp: price.timestamp
        }));

    } catch (error) {
        console.error('❌ Error en getTodayPrices:', error);
        throw error;
    }
}

  async getPriceHistory(days: number = 7): Promise<PriceResponseDto[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

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

  async getDashboardStats(): Promise<DashboardStatsDto> {

    const prices = await this.getTodayPrices();

    if (prices.length === 0) {
      throw new Error('No hay datos de precios disponibles para hoy.');
    }
    
    const currentPrice = prices[0].price;
    const nextHourPrice = prices[1]?.price || 0;
    const priceChangePercentage = ((nextHourPrice - currentPrice) / currentPrice) * 100;
    const monthlySavings = 10; // Estos datos, tiene que venir de algún cálculo o configuración
    const comparisonType = 'tarifa fija'; // Este dato también debería venir de alguna configuración
    const lastUpdated = new Date().toISOString();

    return {
      currentPrice,
      nextHourPrice,
      priceChangePercentage,
      monthlySavings,
      comparisonType,
      lastUpdated
    };

  }
}