import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './shared/config/configuration';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { PricesModule } from './modules/prices/prices.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CorsConfigService } from './shared/config/cors.config';
import { SwaggerConfigService } from './shared/config/swagger.config';
import { AppBootstrapService } from './shared/config/app-bootstrap.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.DB_URI),
    ScheduleModule.forRoot(),
    CacheModule.register({
      isGlobal: true,
      ttl: 1000 * 60 * 60 * 12, // 12 horas TTL (datos se actualizan 1-2 veces/día)
      max: 100, // máximo 100 entradas en caché
    }),
    PricesModule,
    ContactsModule,
  ],
  providers: [CorsConfigService, SwaggerConfigService, AppBootstrapService],
})
export class AppModule {}
