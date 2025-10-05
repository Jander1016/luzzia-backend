import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ description: 'Nombre del contacto' })
  @IsNotEmpty()
  @MinLength(4)
  name: string;

  @ApiProperty({ description: 'Email del contacto' })
  @IsNotEmpty()
  @IsEmail()
  @MinLength(6)
  @MaxLength(180)
  email: string;
}