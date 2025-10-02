import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './shared/config/configuration';
import { ScheduleModule  } from '@nestjs/schedule';
import { PricesModule } from './modules/prices/prices.module';
import { MongooseModule } from '@nestjs/mongoose';
import { PricesCron } from './shared/cron/prices.cron';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { HealthModule } from './shared/health/health.module';
import { MetricsModule } from './shared/metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true, load: [configuration], envFilePath: '.env'}),
    MongooseModule.forRoot(process.env.DB_URI, {
      connectionFactory: (connection) => {
        connection.on('connected', () => {
          console.log('✅ MongoDB conectado');
        });
        connection.on('error', (err) => {
          console.log('❌ MongoDB error:', err.message);
        });
        connection.on('disconnected', () => {
          console.log('⚠️  MongoDB desconectado');
        });
        return connection;
      },
    }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        try {
          // Intentar Redis primero
          const store = await redisStore({
            socket: {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT, 10) || 6379,
              connectTimeout: 5000,
            },
            password: process.env.REDIS_PASSWORD,
            database: parseInt(process.env.REDIS_DB, 10) || 0,
          });
          console.log('✅ Redis cache habilitado');
          return {
            store: store as any,
            ttl: 300, // 5 minutos por defecto
          };
        } catch (error) {
          console.log('⚠️  Redis no disponible, usando cache en memoria');
          // Fallback a cache en memoria
          return {
            ttl: 300, // 5 minutos por defecto
          };
        }
      },
    }),
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000, // 1 segundo
      limit: 3,   // 3 requests por segundo
    }, {
      name: 'medium',
      ttl: 10000, // 10 segundos
      limit: 20,   // 20 requests por 10 segundos
    }, {
      name: 'long',
      ttl: 60000, // 1 minuto
      limit: 100,  // 100 requests por minuto
    }]),
    PricesModule,
    ContactsModule,
    HealthModule,
    MetricsModule,
  ],
  providers: [
    PricesCron,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
