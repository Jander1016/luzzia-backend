import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Price } from '../prices/entities/price.entity';
import { AppLogger } from '../../shared/common/app-logger.service';
import { HealthStatus, ServiceHealth } from './health.controller';

@Injectable()
export class HealthService {
  constructor(
    @InjectModel(Price.name) private priceModel: Model<Price>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly logger: AppLogger,
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    const [dbHealth, apiHealth, cronHealth] = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkExternalApiHealth(),
      this.checkCronJobsHealth(),
    ]);

    const services = {
      database: dbHealth.status === 'fulfilled' ? dbHealth.value : this.getFailedHealth('Database check failed'),
      externalApi: apiHealth.status === 'fulfilled' ? apiHealth.value : this.getFailedHealth('API check failed'),
      cronJobs: cronHealth.status === 'fulfilled' ? cronHealth.value : this.getFailedHealth('Cron check failed'),
    };

    const overallStatus = this.calculateOverallStatus(services);
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services,
    };

    const duration = Date.now() - startTime;
    this.logger.logPerformance('health_check', duration, { status: overallStatus });

    return healthStatus;
  }

  async getReadinessStatus(): Promise<{ ready: boolean; message?: string }> {
    try {
      // Verificar que la base de datos esté disponible
      await this.priceModel.findOne().limit(1).exec();
      
      // Verificar que tengamos datos recientes (últimas 48 horas)
      const recentData = await this.priceModel
        .findOne({
          timestamp: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
        })
        .exec();

      if (!recentData) {
        return {
          ready: false,
          message: 'No recent data available (last 48 hours)'
        };
      }

      return { ready: true };
    } catch (error) {
      return {
        ready: false,
        message: `Database not ready: ${error.message}`
      };
    }
  }

  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      await this.priceModel.findOne().limit(1).exec();
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 1000 ? 'up' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        message: responseTime > 1000 ? 'Slow response' : undefined,
      };
    } catch (error) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        message: error.message,
      };
    }
  }

  private async checkExternalApiHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const apiUrl = this.configService.get<string>('apis.ree.url');
      if (!apiUrl) {
        return {
          status: 'down',
          lastCheck: new Date().toISOString(),
          message: 'API URL not configured',
        };
      }

      // Hacer un request simple para verificar conectividad
      const response = await this.httpService.axiosRef.get(apiUrl, {
        timeout: 5000,
        headers: { 'User-Agent': 'Luzzia-Health-Check' }
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: response.status === 200 ? 'up' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        message: response.status !== 200 ? `HTTP ${response.status}` : undefined,
      };
    } catch (error) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        message: error.message,
      };
    }
  }

  private async checkCronJobsHealth(): Promise<ServiceHealth> {
    try {
      // Verificar que tengamos datos del último día
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const recentPrices = await this.priceModel
        .findOne({ date: { $gte: yesterday } })
        .sort({ timestamp: -1 })
        .exec();

      const now = new Date();
      const lastUpdate = recentPrices?.timestamp || new Date(0);
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceUpdate > 30) { // Más de 30 horas sin datos
        return {
          status: 'down',
          lastCheck: new Date().toISOString(),
          message: `No updates for ${Math.round(hoursSinceUpdate)} hours`,
        };
      }

      return {
        status: hoursSinceUpdate > 25 ? 'degraded' : 'up',
        lastCheck: new Date().toISOString(),
        message: hoursSinceUpdate > 25 ? `${Math.round(hoursSinceUpdate)}h since last update` : undefined,
      };
    } catch (error) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        message: error.message,
      };
    }
  }

  private getFailedHealth(message: string): ServiceHealth {
    return {
      status: 'down',
      lastCheck: new Date().toISOString(),
      message,
    };
  }

  private calculateOverallStatus(services: HealthStatus['services']): HealthStatus['status'] {
    const statuses = Object.values(services).map(service => service.status);
    
    if (statuses.includes('down')) {
      return 'unhealthy';
    }
    
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}