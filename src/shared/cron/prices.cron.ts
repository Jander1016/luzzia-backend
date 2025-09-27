import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PricesService } from '../../modules/prices/prices.service';

@Injectable()
export class PricesCron {
  private readonly logger = new Logger(PricesCron.name);
  private hasRetried = false;

  constructor(private readonly pricesService: PricesService) {}

  // Intento principal a las 20:15
  @Cron('15 20 * * *', { timeZone: 'Europe/Madrid' })
  async handleDailyPriceUpdate() {
    this.logger.log('Starting daily price update at 20:15');
    await this.updatePrices();
  }

  // Único reintento a las 23:15
  @Cron('15 23 * * *', { timeZone: 'Europe/Madrid' })
  async handleRetryPriceUpdate() {
    if (this.hasRetried) {
      this.logger.log('Retry already attempted today, skipping');
      return;
    }

    this.logger.log('Starting retry price update at 23:15');
    this.hasRetried = true;
    await this.updatePrices();
  }

  private async updatePrices(): Promise<void> {
    try {
      const prices = await this.pricesService.fetchFromExternalApi();
      const savedCount = await this.pricesService.savePrices(prices);
      
      this.logger.log(`Successfully saved ${savedCount} prices`);
      
    } catch (error) {
      this.logger.error(`Price update failed: ${error.message}`);
      
      // Si es el reintento de las 23:15 y falla, usar datos anteriores
      if (this.hasRetried) {
        await this.usePreviousDayData();
      }
    }
  }

  private async usePreviousDayData(): Promise<void> {
    this.logger.warn('Using previous day data as fallback');
    
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

  // Reset diario del flag de reintento
  @Cron('0 0 * * *', { timeZone: 'Europe/Madrid' }) // Medianoche
  resetRetryFlag() {
    this.hasRetried = false;
    this.logger.log('Retry flag reset for new day');
  }
}