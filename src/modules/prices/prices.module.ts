import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { PricesService } from './prices.service';
import { PricesController } from './prices.controller';
import { PricesGateway } from './prices.gateway';
import { Price, PriceSchema } from './entities/price.entity';
import { PriceRepository } from './repositories/price.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Price.name, schema: PriceSchema }]),
    HttpModule,
  ],
  controllers: [PricesController],
  providers: [PricesService, PricesGateway, PriceRepository],
  exports: [PricesService, PriceRepository],
})
export class PricesModule {}