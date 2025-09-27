import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact } from './entities/contact.entity';
import { normalizedEmail } from 'src/shared/common/utils';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);
  
  constructor(
    @InjectModel('Contact') private contactModel: Model<Contact>,

  ) {}

  async create(createContactDto: CreateContactDto): Promise<Contact> {
    try{

      const createdContact = new this.contactModel({
      ...createContactDto,
      email: normalizedEmail(createContactDto.email),
      });
      return await createdContact.save();
    }catch (error) {
      if (error.code === 11000) {
        this.logger.warn(`El correo electrónico ya está registrado. ${createContactDto.email}`);
        throw new ConflictException('El correo electrónico ya está registrado.');
      }
      this.logger.error('Error al crear el contacto', error);
      throw error;
    }
  }

  findAll() {
    return this.contactModel.find().sort({ createdAt: -1 }).exec();
  }

  // findOne(id: string) {
  //   return this.contactModel.findById(id).exec();
  // }

  
}
