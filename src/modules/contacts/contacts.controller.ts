import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import {
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ContactResponseDto } from './dto/contact-response.dto';

@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo contacto' })
  @ApiCreatedResponse({ type: ContactResponseDto })
  @ApiResponse({
    status: 409,
    description: 'El correo electrónico ya está registrado.',
  })
  async create(
    @Body() createContactDto: CreateContactDto,
  ): Promise<ContactResponseDto> {
    return this.contactsService.create(createContactDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los contactos' })
  @ApiResponse({ status: 200, type: [ContactResponseDto] })
  async findAll(): Promise<ContactResponseDto[]> {
    return this.contactsService.findAll();
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.contactsService.findOne(id);
  // }
}
