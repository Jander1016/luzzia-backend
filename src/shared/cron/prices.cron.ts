import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { PricesService } from '../../modules/prices/prices.service';

@Injectable()
export class PricesCron {
  private readonly logger = new Logger(PricesCron.name);
  private hasRetried = false;

  constructor(
    private readonly pricesService: PricesService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    this.setupDynamicCronJobs();
  }

  private setupDynamicCronJobs() {
    const cronSchedule = this.configService.get<string>('cronSchedule');
    const timeZone = this.configService.get<string>('timeZone');
    
    this.logger.log(`🕐 Setting up cron job with schedule: ${cronSchedule} (${timeZone})`);
    
    // Cron job principal usando la variable de entorno
    const mainCronJob = new CronJob(
      cronSchedule,
      () => this.handleDailyPriceUpdate(),
      null,
      true,
      timeZone
    );
    
    // Cron job de reintento a las 23:15
    const retryCronJob = new CronJob(
      '15 23 * * *',
      () => this.handleRetryPriceUpdate(),
      null,
      true,
      timeZone
    );
    
    // Cron job de reset diario a medianoche
    const resetCronJob = new CronJob(
      '0 0 * * *',
      () => this.resetDailyFlag(),
      null,
      true,
      timeZone
    );
    
    // Registrar los cron jobs
    this.schedulerRegistry.addCronJob('mainPriceUpdate', mainCronJob);
    this.schedulerRegistry.addCronJob('retryPriceUpdate', retryCronJob);
    this.schedulerRegistry.addCronJob('resetDailyFlag', resetCronJob);
  }

  // Método principal de actualización de precios
  async handleDailyPriceUpdate() {
    const cronSchedule = this.configService.get<string>('cronSchedule');
    this.logger.log(`📊 Starting daily price update with schedule: ${cronSchedule}`);
    await this.updatePrices();
  }

  // Reintento a las 23:15 solo si no hay datos del día actual
  async handleRetryPriceUpdate() {
    // Verificar si ya tenemos datos del día actual
    const todayPrices = await this.pricesService.getTodayPrices();
    
    if (todayPrices && todayPrices.length > 0) {
      this.logger.log('✅ Today prices already exist, skipping retry');
      return;
    }

    this.logger.log('⚠️ No data found for today, starting retry at 23:15');
    await this.updatePrices();
  }

  private async updatePrices(): Promise<void> {
    try {
      const prices = await this.pricesService.fetchFromExternalApi();
      const savedCount = await this.pricesService.savePrices(prices);
      
      this.logger.log(`✅ Successfully saved ${savedCount} prices`);
      
    } catch (error) {
      this.logger.error(`❌ Price update failed: ${error.message}`);
      
      // Si falla, usar datos anteriores como fallback
      if (this.hasRetried) {
        await this.usePreviousDayData();
      }
    }
  }

  private async usePreviousDayData(): Promise<void> {
    this.logger.warn('🔄 Using previous day data as fallback');
    
    try {
      const lastPrices = await this.pricesService.getPriceHistory(2); 
      
      if (lastPrices.length > 0) {
        const pricesByDate = this.groupByDate(lastPrices);
        const latestDate = Object.keys(pricesByDate).sort().reverse()[0];
        const latestPrices = pricesByDate[latestDate];

        const today = new Date();
        const fallbackPrices = latestPrices.map(price => ({
          date: today,
          hour: price.hour,
          price: price.price,
          isFallback: true,
        }));

        await this.pricesService.savePrices(fallbackPrices);
        this.logger.log(`Fallback: Used data from ${latestDate} for today`);
      } else {
        this.logger.error('No historical data available for fallback');
      }
    } catch (fallbackError) {
      this.logger.error('Fallback strategy also failed', fallbackError.stack);
    }
  }

  private groupByDate(prices: any[]): { [key: string]: any[] } {
    return prices.reduce((acc, price) => {
      const dateKey = price.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(price);
      return acc;
    }, {});
  }

  // Reset diario a medianoche
  resetDailyFlag() {
    this.hasRetried = false;
    this.logger.log('🔄 New day started - flags reset');
  }
}