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
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return this.priceModel
      .find({
        timestamp: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
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
          timestamp: { $gte: startOfDay, $lt: endOfDay },
        })
        .sort({ price: 1 })
        .exec(),
      this.priceModel
        .findOne({
          timestamp: { $gte: startOfDay, $lt: endOfDay },
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