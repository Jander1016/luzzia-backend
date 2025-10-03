import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './shared/config/configuration';
// import { ScheduleModule  } from '@nestjs/schedule'; // Temporalmente desactivado
import { PricesModule } from './modules/prices/prices.module';
import { MongooseModule } from '@nestjs/mongoose';
// import { PricesCron } from './shared/cron/prices.cron'; // Temporalmente desactivado
import { ContactsModule } from './modules/contacts/contacts.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './shared/health/health.module';

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
    // ScheduleModule.forRoot(), // Temporalmente desactivado para debugging
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000, // 1 segundo
      limit: 10,   // 10 requests por segundo (aumentado de 3 a 10)
    }, {
      name: 'medium',
      ttl: 10000, // 10 segundos
      limit: 50,   // 50 requests por 10 segundos (aumentado de 20 a 50)
    }, {
      name: 'long',
      ttl: 60000, // 1 minuto
      limit: 200,  // 200 requests por minuto (aumentado de 100 a 200)
    }]),
    PricesModule,
    ContactsModule,
    HealthModule,
  ],
  providers: [
    // PricesCron, // Temporalmente desactivado para debugging
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
