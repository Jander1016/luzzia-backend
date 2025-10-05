import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { Price, PriceSchema } from '../prices/entities/price.entity';
import { AppLogger } from '../../shared/common/app-logger.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Price.name, schema: PriceSchema }]),
    HttpModule,
  ],
  controllers: [HealthController],
  providers: [HealthService, AppLogger],
  exports: [HealthService],
})
export class HealthModule {}