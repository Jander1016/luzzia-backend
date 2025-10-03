import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PricesService } from './prices.service';
import { Price } from './entities/price.entity';
import { of } from 'rxjs';

describe('PricesService', () => {
  let service: PricesService;
  let mockPriceModel: any;
  let mockHttpService: any;
  let mockConfigService: any;

  const mockPriceData = [
    {
      _id: '507f1f77bcf86cd799439011',
      date: new Date('2025-10-01'),
      hour: 0,
      price: 0.12,
      fallback: false,
      timestamp: new Date(),
    },
    {
      _id: '507f1f77bcf86cd799439012',
      date: new Date('2025-10-01'),
      hour: 1,
      price: 0.15,
      fallback: false,
      timestamp: new Date(),
    },
  ];

  beforeEach(async () => {
    mockPriceModel = {
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      aggregate: jest.fn(),
      exec: jest.fn(),
    };

    mockHttpService = {
      get: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          reeApiUrl: 'https://api.test.com',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricesService,
        {
          provide: getModelToken(Price.name),
          useValue: mockPriceModel,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PricesService>(PricesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTodayPrices', () => {
    it('should return today prices successfully', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPriceData),
      };

      mockPriceModel.find.mockReturnValue(mockQuery);

      const result = await service.getTodayPrices();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('price', 0.12);
      expect(result[0]).toHaveProperty('hour', 0);
      expect(mockPriceModel.find).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockPriceModel.find.mockReturnValue(mockQuery);

      const result = await service.getTodayPrices();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      mockPriceModel.find.mockReturnValue(mockQuery);

      await expect(service.getTodayPrices()).rejects.toThrow('Database error');
    });
  });

  describe('fetchFromExternalApi', () => {
    it('should fetch and transform REE data correctly', async () => {
      const mockREEResponse = {
        data: {
          PVPC: [
            {
              Dia: '01/10/2025',
              Hora: '00-01',
              PCB: '120.5',
            },
            {
              Dia: '01/10/2025',
              Hora: '01-02',
              PCB: '150.3',
            },
          ],
        },
      };

      mockHttpService.get.mockReturnValue(of(mockREEResponse));

      const result = await service.fetchFromExternalApi();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('price', 0.1205); // 120.5 / 1000
      expect(result[0]).toHaveProperty('hour', 0);
      expect(result[1]).toHaveProperty('price', 0.1503); // 150.3 / 1000
      expect(result[1]).toHaveProperty('hour', 1);
    });

    it('should handle API errors', async () => {
      mockHttpService.get.mockReturnValue(
        of(null).pipe(() => {
          throw new Error('API Error');
        }),
      );

      await expect(service.fetchFromExternalApi()).rejects.toThrow();
    });

    it('should handle invalid REE data format', async () => {
      const invalidResponse = {
        data: {
          // Missing PVPC property
        },
      };

      mockHttpService.get.mockReturnValue(of(invalidResponse));

      await expect(service.fetchFromExternalApi()).rejects.toThrow(
        'Inválido formato de datos de API REE',
      );
    });
  });

  describe('getDashboardStats', () => {
    it('should calculate dashboard stats correctly', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPriceData),
      };

      mockPriceModel.find.mockReturnValue(mockQuery);

      const result = await service.getDashboardStats();

      expect(result).toHaveProperty('currentPrice');
      expect(result).toHaveProperty('nextHourPrice');
      expect(result).toHaveProperty('priceChangePercentage');
      expect(result).toHaveProperty('monthlySavings');
      expect(result).toHaveProperty('comparisonType', 'tarifa fija');
      expect(result).toHaveProperty('lastUpdated');
    });

    it('should throw error when no prices available', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockPriceModel.find.mockReturnValue(mockQuery);

      await expect(service.getDashboardStats()).rejects.toThrow(
        'No hay datos de precios disponibles para hoy.',
      );
    });
  });

  describe('getHourlyPrices', () => {
    it('should return hourly prices for today', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPriceData),
      };

      mockPriceModel.find.mockReturnValue(mockQuery);

      const result = await service.getHourlyPrices('today');

      expect(result).toHaveProperty('prices');
      expect(result).toHaveProperty('average');
      expect(result).toHaveProperty('min');
      expect(result).toHaveProperty('max');
      expect(result.prices).toHaveLength(2);
    });

    it('should handle empty results for hourly prices', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      mockPriceModel.find.mockReturnValue(mockQuery);

      const result = await service.getHourlyPrices('today');

      expect(result.prices).toHaveLength(0);
      expect(result.average).toBe(0);
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
    });
  });

  describe('savePrices', () => {
    it('should save prices successfully', async () => {
      const mockPrices = [
        { date: new Date(), hour: 0, price: 0.12 },
        { date: new Date(), hour: 1, price: 0.15 },
      ];

      mockPriceModel.findOneAndUpdate.mockResolvedValue({});

      const result = await service.savePrices(mockPrices);

      expect(result).toBe(2);
      expect(mockPriceModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
    });

    it('should handle save errors gracefully', async () => {
      const mockPrices = [{ date: new Date(), hour: 0, price: 0.12 }];

      mockPriceModel.findOneAndUpdate.mockRejectedValue(
        new Error('Save error'),
      );

      const result = await service.savePrices(mockPrices);

      expect(result).toBe(0);
    });
  });
});
