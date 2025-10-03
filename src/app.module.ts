import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './shared/config/configuration';
import { ScheduleModule  } from '@nestjs/schedule';
import { PricesModule } from './modules/prices/prices.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { MongooseModule } from '@nestjs/mongoose';
import { PricesCron } from './shared/cron/prices.cron';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true, load: [configuration], envFilePath: '.env'}),
    MongooseModule.forRoot(process.env.DB_URI),
    ScheduleModule.forRoot(),
    PricesModule,
    ContactsModule,
  ],
  providers: [PricesCron],
})
export class AppModule { }
