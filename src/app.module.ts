import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './shared/config/configuration';
import { ScheduleModule  } from '@nestjs/schedule';
import { PricesModule } from './modules/prices/prices.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true, load: [configuration], envFilePath: '.env'}),
    MongooseModule.forRoot(process.env.DB_URI),
    ScheduleModule.forRoot(),
    PricesModule,
  ]
})
export class AppModule { }
