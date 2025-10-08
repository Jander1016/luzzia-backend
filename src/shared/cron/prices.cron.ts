import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { PricesService } from '../../modules/prices/prices.service';

@Injectable()
export class PricesCron {
  private readonly logger = new Logger(PricesCron.name);
  private hasRetried = false;
  private lastExecution: Date | null = null;
  private lastSuccessfulExecution: Date | null = null;
  private cronStatus: 'active' | 'error' | 'inactive' = 'inactive';

  constructor(
    private readonly pricesService: PricesService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    this.setupDynamicCronJobs();
  }

  private setupDynamicCronJobs() {
    const cronSchedule =
      this.configService.get<string>('cron.mainSchedule') ||
      this.configService.get<string>('cronSchedule') ||
      '15 20 * * *';
    const timeZone =
      this.configService.get<string>('cron.timezone') ||
      this.configService.get<string>('timeZone') ||
      'Europe/Madrid';

    this.logger.log(
      `🕐 Setting up cron job with schedule: ${cronSchedule} (${timeZone})`,
    );
    this.logger.log(`🌍 Current server time: ${new Date().toISOString()}`);
    this.logger.log(
      `🌍 Madrid time: ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`,
    );

    try {
      // Cron job principal usando la variable de entorno
      const mainCronJob = new CronJob(
        cronSchedule,
        () => this.handleDailyPriceUpdate(),
        null,
        true,
        timeZone,
      );

      // Cron job de reintento a las 23:15
      const retryCronJob = new CronJob(
        '15 23 * * *',
        () => this.handleRetryPriceUpdate(),
        null,
        true,
        timeZone,
      );

      // Cron job de reset diario a medianoche
      const resetCronJob = new CronJob(
        '0 0 * * *',
        () => this.resetDailyFlag(),
        null,
        true,
        timeZone,
      );

      // Cron job de verificación cada 6 horas (backup automático)
      const backupCronJob = new CronJob(
        '0 */6 * * *', // Cada 6 horas
        () => this.handleBackupCheck(),
        null,
        true,
        timeZone,
      );

      // Registrar los cron jobs
      this.schedulerRegistry.addCronJob('mainPriceUpdate', mainCronJob);
      this.schedulerRegistry.addCronJob('retryPriceUpdate', retryCronJob);
      this.schedulerRegistry.addCronJob('resetDailyFlag', resetCronJob);
      this.schedulerRegistry.addCronJob('backupCheck', backupCronJob);

      this.cronStatus = 'active';
      this.logger.log(`✅ CRON jobs registered successfully`);
      this.logger.log(
        `📅 Next main execution: ${mainCronJob.nextDate()?.toString()}`,
      );
      this.logger.log(
        `📅 Next retry execution: ${retryCronJob.nextDate()?.toString()}`,
      );
      this.logger.log(
        `📅 Next reset execution: ${resetCronJob.nextDate()?.toString()}`,
      );
      this.logger.log(
        `📅 Next backup check: ${backupCronJob.nextDate()?.toString()}`,
      );
    } catch (error) {
      this.cronStatus = 'error';
      this.logger.error(
        `❌ Failed to setup CRON jobs: ${error.message}`,
        error.stack,
      );
    }
  }

  // Método principal de actualización de precios
  async handleDailyPriceUpdate() {
    this.lastExecution = new Date();
    const cronSchedule =
      this.configService.get<string>('cron.mainSchedule') ||
      this.configService.get<string>('cronSchedule') ||
      '15 20 * * *';
    this.logger.log(
      `📊 Starting daily price update with schedule: ${cronSchedule}`,
    );
    this.logger.log(`🕐 Execution time: ${this.lastExecution.toISOString()}`);
    this.logger.log(
      `🌍 Madrid time: ${this.lastExecution.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`,
    );

    try {
      await this.updatePrices();
      this.lastSuccessfulExecution = new Date();
      this.cronStatus = 'active';
      this.logger.log(
        `✅ CRON execution completed successfully at ${this.lastSuccessfulExecution.toISOString()}`,
      );
    } catch (error) {
      this.cronStatus = 'error';
      this.logger.error(
        `❌ CRON execution failed: ${error.message}`,
        error.stack,
      );
    }
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

  // Verificación de backup cada 6 horas
  async handleBackupCheck() {
    this.logger.log('🔍 Starting backup check');

    try {
      // Verificar si tenemos datos de hoy
      const todayPrices = await this.pricesService.getTodayPrices();

      // Si no tenemos datos de hoy y ya pasaron las 21:00, intentar obtenerlos
      const now = new Date();
      const madridTime = new Date(
        now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }),
      );
      const currentHour = madridTime.getHours();

      if ((!todayPrices || todayPrices.length === 0) && currentHour >= 21) {
        this.logger.warn(
          '⚠️ Missing today data after 21:00, triggering backup fetch',
        );
        await this.updatePrices();
      } else if (todayPrices && todayPrices.length > 0) {
        this.logger.log(
          `✅ Backup check: ${todayPrices.length} prices found for today`,
        );
      } else {
        this.logger.log(
          `ℹ️ Backup check: No data yet, but it's only ${currentHour}:00 Madrid time`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Backup check failed: ${error.message}`,
        error.stack,
      );
    }
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
        today.setHours(0, 0, 0, 0); // Asegurar que sea el inicio del día
        const fallbackPrices = latestPrices.map((price) => ({
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
      const dateKey = price.date.toISOString().split('T')[0]; // Convertir Date a string para agrupar
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

  // Método público para obtener el estado del CRON
  getCronStatus() {
    const mainCron = this.schedulerRegistry.getCronJob('mainPriceUpdate');
    const retryCron = this.schedulerRegistry.getCronJob('retryPriceUpdate');
    const resetCron = this.schedulerRegistry.getCronJob('resetDailyFlag');
    const backupCron = this.schedulerRegistry.getCronJob('backupCheck');

    return {
      status: this.cronStatus,
      lastExecution: this.lastExecution,
      lastSuccessfulExecution: this.lastSuccessfulExecution,
      hasRetried: this.hasRetried,
      cronJobs: {
        mainPriceUpdate: {
          nextExecution: mainCron.nextDate()?.toString(),
          lastDate: mainCron.lastDate()?.toString(),
        },
        retryPriceUpdate: {
          nextExecution: retryCron.nextDate()?.toString(),
          lastDate: retryCron.lastDate()?.toString(),
        },
        resetDailyFlag: {
          nextExecution: resetCron.nextDate()?.toString(),
          lastDate: resetCron.lastDate()?.toString(),
        },
        backupCheck: {
          nextExecution: backupCron.nextDate()?.toString(),
          lastDate: backupCron.lastDate()?.toString(),
        },
      },
      serverTime: new Date().toISOString(),
      madridTime: new Date().toLocaleString('es-ES', {
        timeZone: 'Europe/Madrid',
      }),
      configuration: {
        mainSchedule:
          this.configService.get<string>('cron.mainSchedule') || '15 20 * * *',
        timezone:
          this.configService.get<string>('cron.timezone') || 'Europe/Madrid',
      },
    };
  }

  // Método para forzar ejecución manual (para testing)
  async forceDailyUpdate() {
    this.logger.log('🔧 Manual execution triggered');
    await this.handleDailyPriceUpdate();
  }
}
