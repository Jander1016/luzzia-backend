import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Price } from './entities/price.entity';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { CreatePriceDto } from './dto/create-price.dto';
import { catchError, firstValueFrom } from 'rxjs';
import { PriceResponseDto } from './dto/response-price.dto';

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
  ) { }

  private transformREEData(reeData: any): CreatePriceDto[] {
    if (!reeData?.PVPC) {
      throw new Error('Inválido formato de datos de API REE');
    }

    const convertDate = (dateStr: string): string => {
      const [dd, mm, yyyy] = dateStr.split('/');
      return `${yyyy}-${mm}-${dd}`; // "2025-09-27"
    };


    return reeData.PVPC.map((item: any) => {
      let date = new Date(item.Dia);
      const hour = parseInt(item.Hora.split('-')[0], 10);
      const price = parseFloat(item.PCB) / 1000; // Convertir a €/kWh

      if (date.toString() === 'Invalid Date') {
        date = new Date(convertDate(item.Dia));
      } else {
        date = item.dia;
      }

      if (isNaN(hour) || isNaN(price)) {
        this.logger.warn(`Invalid data format: ${JSON.stringify(item)}`);
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
          this.logger.error('Error fetching from REE API', error.stack);
          throw new Error(`REE API error: ${error.message}`);
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
        this.logger.error(`Error saving price for ${priceData.date} hour ${priceData.hour}`, error);
      }
    }

    this.logger.log(`Saved ${savedCount} prices`);
    return savedCount;
  }

  async getTodayPrices(): Promise<PriceResponseDto[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const prices = await this.priceModel
      .find({ date: { $gte: today } })
      .sort({ hour: 1 })
      .exec();

    return prices.map(price => ({
      date: price.date,
      hour: price.hour,
      price: price.price,
      isFallback: false,
      timestamp: price.timestamp
    }));
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
}