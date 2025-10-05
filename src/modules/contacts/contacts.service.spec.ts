import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { Contact } from './entities/contact.entity';

describe('ContactsService', () => {
  let service: ContactsService;
  let mockContactModel: any;

  beforeEach(async () => {
    // Mock del modelo
    mockContactModel = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide: getModelToken('Contact'),
          useValue: mockContactModel,
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new contact', async () => {
      const createContactDto = {
        name: 'Test User',
        email: 'test@example.com',
      };

      const savedContact = {
        _id: '68d7eaf52d1b580bc60793cf',
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock findOne para verificar duplicados
      mockContactModel.findOne = jest.fn().mockResolvedValue(null);

      // Mock del constructor que retorna una instancia con save
      const mockInstance = {
        save: jest.fn().mockResolvedValue(savedContact),
      };
      mockContactModel.mockImplementation(() => mockInstance);

      const result = await service.create(createContactDto);

      expect(mockContactModel.findOne).toHaveBeenCalledWith({
        email: createContactDto.email.toLowerCase(),
      });
      expect(mockContactModel).toHaveBeenCalledWith({
        ...createContactDto,
        email: createContactDto.email.toLowerCase(),
      });
      expect(mockInstance.save).toHaveBeenCalled();
      expect(result).toEqual(savedContact);
    });

    it('should throw ConflictException when email already exists', async () => {
      const createContactDto = {
        name: 'Test User',
        email: 'existing@example.com',
      };

      const existingContact = {
        _id: '68d7eaf52d1b580bc60793cf',
        email: 'existing@example.com',
      };

      // Mock findOne que retorna un contacto existente
      mockContactModel.findOne = jest.fn().mockResolvedValue(existingContact);

      await expect(service.create(createContactDto)).rejects.toThrow(ConflictException);
      expect(mockContactModel.findOne).toHaveBeenCalledWith({
        email: createContactDto.email.toLowerCase(),
      });
    });

    it('should handle database duplicate key error', async () => {
      const createContactDto = {
        name: 'Test User',
        email: 'test@example.com',
      };

      // Mock findOne para no encontrar duplicados
      mockContactModel.findOne = jest.fn().mockResolvedValue(null);

      // Mock del constructor que retorna una instancia con save que falla con código 11000
      const mockInstance = {
        save: jest.fn().mockRejectedValue({ code: 11000 }),
      };
      mockContactModel.mockImplementation(() => mockInstance);

      await expect(service.create(createContactDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all contacts', async () => {
      const mockContacts = [
        {
          _id: '68d7eaf52d1b580bc60793cf',
          name: 'Test User 1',
          email: 'test1@example.com',
          createdAt: new Date(),
        },
        {
          _id: '68da50b13e685a7aed742231',
          name: 'Test User 2',
          email: 'test2@example.com',
          createdAt: new Date(),
        },
      ];

      const mockQueryChain = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockContacts),
      };

      mockContactModel.find = jest.fn().mockReturnValue(mockQueryChain);

      const result = await service.findAll();

      expect(mockContactModel.find).toHaveBeenCalled();
      expect(mockQueryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQueryChain.exec).toHaveBeenCalled();
      expect(result).toEqual(mockContacts);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no contacts exist', async () => {
      const mockQueryChain = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockContactModel.find = jest.fn().mockReturnValue(mockQueryChain);

      const result = await service.findAll();

      expect(mockContactModel.find).toHaveBeenCalled();
      expect(mockQueryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQueryChain.exec).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle database errors', async () => {
      const mockQueryChain = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };

      mockContactModel.find = jest.fn().mockReturnValue(mockQueryChain);

      await expect(service.findAll()).rejects.toThrow('Database connection failed');
    });
  });
});