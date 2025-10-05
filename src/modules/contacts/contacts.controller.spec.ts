import { Test, TestingModule } from '@nestjs/testing';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

describe('ContactsController', () => {
  let controller: ContactsController;
  let service: ContactsService;

  const mockContactsService = {
    create: jest.fn(),
    findAll: jest.fn(),
  };

  const mockContact = {
    _id: '68d7eaf52d1b580bc60793cf',
    name: 'Test User',
    email: 'test@example.com',
    __v: 0,
  };

  const mockCreateContactDto = {
    name: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [
        {
          provide: ContactsService,
          useValue: mockContactsService,
        },
      ],
    }).compile();

    controller = module.get<ContactsController>(ContactsController);
    service = module.get<ContactsService>(ContactsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new contact', async () => {
      mockContactsService.create.mockResolvedValue(mockContact);

      const result = await controller.create(mockCreateContactDto);

      expect(service.create).toHaveBeenCalledWith(mockCreateContactDto);
      expect(result).toEqual(mockContact);
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
    });

    it('should validate contact data', async () => {
      mockContactsService.create.mockResolvedValue(mockContact);

      const result = await controller.create(mockCreateContactDto);

      expect(result.name).toBe(mockCreateContactDto.name);
      expect(result.email).toBe(mockCreateContactDto.email);
    });

    it('should handle creation errors', async () => {
      mockContactsService.create.mockRejectedValue(new Error('Email already exists'));

      await expect(controller.create(mockCreateContactDto)).rejects.toThrow('Email already exists');
    });

    it('should handle invalid email format', async () => {
      const invalidContactDto = {
        name: 'Test User',
        email: 'invalid-email',
      };

      mockContactsService.create.mockRejectedValue(new Error('Invalid email format'));

      await expect(controller.create(invalidContactDto)).rejects.toThrow('Invalid email format');
    });
  });

  describe('findAll', () => {
    it('should return all contacts', async () => {
      const mockContacts = [
        mockContact,
        {
          _id: '68da50b13e685a7aed742231',
          name: 'Another User',
          email: 'another@example.com',
          __v: 0,
        },
      ];

      mockContactsService.findAll.mockResolvedValue(mockContacts);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockContacts);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no contacts exist', async () => {
      mockContactsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle database errors', async () => {
      mockContactsService.findAll.mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.findAll()).rejects.toThrow('Database connection failed');
    });

    it('should validate contact structure in response', async () => {
      const mockContacts = [mockContact];
      mockContactsService.findAll.mockResolvedValue(mockContacts);

      const result = await controller.findAll();

      if (result.length > 0) {
        expect(result[0]).toHaveProperty('_id');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('email');
        expect(typeof result[0].name).toBe('string');
        expect(typeof result[0].email).toBe('string');
      }
    });
  });
});