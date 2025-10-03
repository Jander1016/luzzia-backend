import { ApiProperty } from '@nestjs/swagger';

export class ContactResponseDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;
}
