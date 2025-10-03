import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateContactDto {
  @IsNotEmpty()
  @MinLength(4)
  name: string;

  @IsNotEmpty()
  @IsEmail()
  @MinLength(6)
  @MaxLength(180)
  email: string;
}
