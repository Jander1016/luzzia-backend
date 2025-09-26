import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/config.module';
import { ScheduleModule  } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true, load: [configuration], envFilePath: '.env'}),
    ScheduleModule.forRoot(),
  ]
})
export class AppModule { }
