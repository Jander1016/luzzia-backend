import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema()
export class Contact extends Document {
  @ApiProperty({ description: 'Nombre del contacto' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Email del contacto' })
  @Prop({ required: true })
  email: string;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);