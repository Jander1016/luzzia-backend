import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class Price extends Document {
  @ApiProperty({ description: 'Fecha del precio (YYYY-MM-DD)' })
  @Prop({ required: true, index: true, type: Date })
  date: Date;

  @ApiProperty({ description: 'Hora del día (0-23) de cambio de Precio' })
  @Prop({ required: true, min: 0, max: 23 })
  hour: number;

  @ApiProperty({ description: 'Precio en €/kWh' })
  @Prop({ required: true })
  price: number;

  @ApiProperty({ description: 'Si el dato viene de un fallback' })
  @Prop({ default: false })
  fallback: boolean;

  @ApiProperty({ description: 'Timestamp de cuando se guardó' })
  @Prop({ default: Date.now })
  timestamp: Date;
}

export const PriceSchema = SchemaFactory.createForClass(Price);

PriceSchema.index({ date: 1, hour: 1 }, { unique: true });
