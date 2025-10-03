import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Price } from '../entities/price.entity';
import { CreatePriceDto } from '../dto/create-price.dto';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

@Injectable()
export class PriceRepository {
  constructor(
    @InjectModel(Price.name) private readonly priceModel: Model<Price>,
  ) {}

  async create(createPriceDto: CreatePriceDto): Promise<Price> {
    const price = new this.priceModel({
      ...createPriceDto,
      timestamp: new Date(),
    });
    return price.save();
  }

  async findOrUpdate(
    filter: any,
    update: Partial<CreatePriceDto>,
  ): Promise<Price> {
    return this.priceModel.findOneAndUpdate(
      filter,
      { ...update, timestamp: new Date() },
      { upsert: true, new: true },
    ).exec();
  }

  async findTodayPrices(): Promise<Price[]> {
    // Obtener fecha actual en UTC para coincidir con cómo se guardan los datos
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    
    const query = {
      date: {
        $gte: today,
        $lt: tomorrow
      }
    };
    
    // Buscar por fecha del precio, no por timestamp de guardado
    const result = await this.priceModel
      .find(query)
      .sort({ hour: 1 })
      .exec();
      
    return result;
  }

  async findTomorrowPrices(): Promise<Price[]> {
    // Obtener fecha de mañana en UTC para coincidir con cómo se guardan los datos
    const now = new Date();
    // CORREGIDO: Usar Date.UTC para crear fechas UTC correctas
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setUTCDate(dayAfterTomorrow.getUTCDate() + 1); // +1 día en UTC
    
    return this.priceModel
      .find({
        date: {
          $gte: tomorrow,
          $lt: dayAfterTomorrow
        }
      })
      .sort({ hour: 1 })
      .exec();
  }

  async findPriceHistory(days: number = 7): Promise<Price[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return this.priceModel
      .find({ date: { $gte: startDate } })
      .sort({ date: -1, hour: 1 })
      .exec();
  }

  async findPriceHistoryPaginated(
    days: number = 7,
    pagination: PaginationDto,
  ): Promise<{ data: Price[]; total: number }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const filter = { date: { $gte: startDate } };
    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await Promise.all([
      this.priceModel
        .find(filter)
        .sort({ date: -1, hour: 1 })
        .skip(skip)
        .limit(pagination.limit)
        .exec(),
      this.priceModel.countDocuments(filter),
    ]);

    return { data, total };
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Price[]> {
    return this.priceModel
      .find({
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ date: 1, hour: 1 })
      .exec();
  }

  async getPriceStats(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.priceModel.aggregate([
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
  }

  async findCurrentHourPrice(): Promise<Price | null> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentHour = now.getHours();

    return this.priceModel
      .findOne({
        date: today,
        hour: currentHour,
      })
      .exec();
  }

  async findMinMaxPricesForDate(date: Date): Promise<{ min: Price; max: Price } | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [minResult, maxResult] = await Promise.all([
      this.priceModel
        .findOne({
          date: { $gte: startOfDay, $lt: endOfDay }, // Cambiar timestamp por date
        })
        .sort({ price: 1 })
        .exec(),
      this.priceModel
        .findOne({
          date: { $gte: startOfDay, $lt: endOfDay }, // Cambiar timestamp por date
        })
        .sort({ price: -1 })
        .exec(),
    ]);

    if (!minResult || !maxResult) {
      return null;
    }

    return { min: minResult, max: maxResult };
  }
}