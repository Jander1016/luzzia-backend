import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PricesService } from './prices.service';
import { Price } from './entities/price.entity';
import { PriceRepository } from './repositories/price.repository';
import { of } from 'rxjs';

describe('PricesService', () => {
  let service: PricesService;
  let priceModel: any;
  let httpService: HttpService;
  let configService: ConfigService;
  let priceRepository: PriceRepository;
  let cacheManager: Cache;

  const mockPriceData = [
    {
      _id: 'test-id-1',
      date: new Date('2025-10-06T00:00:00.000Z'),
      hour: 0,
      price: 0.09,
      timestamp: new Date('2025-10-05T18:56:29.131Z'),
      fallback: false,
    },
    {
      _id: 'test-id-2',
      date: new Date('2025-10-06T00:00:00.000Z'),
      hour: 1,
      price: 0.089,
      timestamp: new Date('2025-10-05T18:56:29.131Z'),
      fallback: false,
    },
    {
      _id: 'test-id-3',
      date: new Date('2025-10-06T00:00:00.000Z'),
      hour: 2,
      price: 0.15,
      timestamp: new Date('2025-10-05T18:56:29.131Z'),
      fallback: false,
    },
  ] as any[];

  const mockREEApiResponse = {
    PVPC: [
      { Dia: '06/10/2025', Hora: '00-01', PCB: '90,00' },
      { Dia: '06/10/2025', Hora: '01-02', PCB: '89,00' },
      { Dia: '06/10/2025', Hora: '02-03', PCB: '150,00' },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricesService,
        {
          provide: getModelToken(Price.name),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            sort: jest.fn(),
            exec: jest.fn(),
            limit: jest.fn(),
            aggregate: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: PriceRepository,
          useValue: {
            findTodayPrices: jest.fn(),
            findTomorrowPrices: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PricesService>(PricesService);
    priceModel = module.get(getModelToken(Price.name));
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    priceRepository = module.get<PriceRepository>(PriceRepository);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTodayPrices', () => {
    it('should return cached prices if available', async () => {
      const cachedData = [
        {
          date: new Date('2025-10-06T00:00:00.000Z'),
          hour: 0,
          price: 0.09,
          isFallback: false,
          timestamp: new Date('2025-10-05T18:56:29.131Z'),
        },
      ];

      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedData);

      const result = await service.getTodayPrices();

      expect(cacheManager.get).toHaveBeenCalledWith('today_prices');
      expect(result).toEqual(cachedData);
    });

    it('should fetch from database and cache result when no cache available', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPriceData),
      };
      
      jest.spyOn(priceModel, 'find').mockReturnValue(mockQuery);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.getTodayPrices();

      expect(priceModel.find).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(
        'today_prices',
        expect.any(Array),
        1000 * 60 * 60 * 6
      );
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('hour');
      expect(result[0]).toHaveProperty('price');
    });

    it('should handle empty results from database', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      
      jest.spyOn(priceModel, 'find').mockReturnValue(mockQuery);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.getTodayPrices();

      expect(result).toEqual([]);
    });
  });

  describe('getTomorrowPrices', () => {
    it('should return cached tomorrow prices if available', async () => {
      const cachedData = [
        {
          date: new Date('2025-10-07T00:00:00.000Z'),
          hour: 0,
          price: 0.08,
          isFallback: false,
          timestamp: new Date('2025-10-06T20:30:00.000Z'),
        },
      ];

      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedData);

      const result = await service.getTomorrowPrices();

      expect(cacheManager.get).toHaveBeenCalledWith('tomorrow_prices');
      expect(result).toEqual(cachedData);
    });

    it('should fetch from repository when no cache available', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(priceRepository, 'findTomorrowPrices').mockResolvedValue(mockPriceData);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.getTomorrowPrices();

      expect(priceRepository.findTomorrowPrices).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(
        'tomorrow_prices',
        expect.any(Array),
        1000 * 60 * 60 * 12
      );
      expect(result).toHaveLength(3);
    });

    it('should handle when no tomorrow prices are available', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(priceRepository, 'findTomorrowPrices').mockResolvedValue([]);

      const result = await service.getTomorrowPrices();

      expect(result).toEqual([]);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('getDashboardStats', () => {
    it('should return cached dashboard stats if available', async () => {
      const cachedStats = {
        currentPrice: 0.09,
        nextHourPrice: 0.089,
        priceChangePercentage: -1.11,
        monthlySavings: 20.69,
        comparisonType: 'tarifa fija',
        lastUpdated: '2025-10-06T00:00:00.000Z',
      };

      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedStats);

      const result = await service.getDashboardStats();

      expect(cacheManager.get).toHaveBeenCalledWith('dashboard_stats');
      expect(result).toEqual(cachedStats);
    });

    it('should calculate stats from today prices when no cache available', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      
      // Mock getTodayPrices to return test data
      jest.spyOn(service, 'getTodayPrices').mockResolvedValue([
        {
          date: new Date('2025-10-06T00:00:00.000Z'),
          hour: 0,
          price: 0.1,
          isFallback: false,
          timestamp: new Date(),
        },
        {
          date: new Date('2025-10-06T00:00:00.000Z'),
          hour: 1,
          price: 0.09,
          isFallback: false,
          timestamp: new Date(),
        },
      ]);

      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.getDashboardStats();

      expect(service.getTodayPrices).toHaveBeenCalled();
      expect(result).toHaveProperty('currentPrice');
      expect(result).toHaveProperty('nextHourPrice');
      expect(result).toHaveProperty('priceChangePercentage');
      expect(result).toHaveProperty('monthlySavings');
      expect(result).toHaveProperty('comparisonType');
      expect(result).toHaveProperty('lastUpdated');
      expect(cacheManager.set).toHaveBeenCalledWith(
        'dashboard_stats',
        expect.any(Object),
        1000 * 60 * 60 * 1
      );
    });
  });

  describe('getHourlyPrices', () => {
    it('should return hourly prices for today period', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPriceData),
      };
      
      jest.spyOn(priceModel, 'find').mockReturnValue(mockQuery);

      const result = await service.getHourlyPrices('today');

      expect(result).toHaveProperty('prices');
      expect(result).toHaveProperty('average');
      expect(result).toHaveProperty('min');
      expect(result).toHaveProperty('max');
      expect(result.prices).toHaveLength(3);
      expect(result.prices[0]).toHaveProperty('timestamp');
      expect(result.prices[0]).toHaveProperty('hour');
      expect(result.prices[0]).toHaveProperty('price');
      expect(result.prices[0]).toHaveProperty('level');
      expect(result.prices[0]).toHaveProperty('currency');
    });

    it('should return empty result when no prices found', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      
      jest.spyOn(priceModel, 'find').mockReturnValue(mockQuery);

      const result = await service.getHourlyPrices('today');

      expect(result).toEqual({
        prices: [],
        average: 0,
        min: 0,
        max: 0,
      });
    });

    it('should handle week period correctly', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPriceData),
      };
      
      jest.spyOn(priceModel, 'find').mockReturnValue(mockQuery);

      const result = await service.getHourlyPrices('week');

      expect(priceModel.find).toHaveBeenCalledWith({
        date: expect.objectContaining({
          $gte: expect.any(Date),
          $lt: expect.any(Date),
        }),
      });
      expect(result.prices).toHaveLength(3);
    });
  });

  describe('getRecommendations', () => {
    it('should return recommendations based on today prices', async () => {
      const mockTodayPrices = [
        {
          date: new Date('2025-10-06T00:00:00.000Z'),
          hour: 1,
          price: 0.05, // cheapest
          isFallback: false,
          timestamp: new Date(),
        },
        {
          date: new Date('2025-10-06T00:00:00.000Z'),
          hour: 20,
          price: 0.3, // most expensive
          isFallback: false,
          timestamp: new Date(),
        },
        {
          date: new Date('2025-10-06T00:00:00.000Z'),
          hour: 12,
          price: 0.15, // average
          isFallback: false,
          timestamp: new Date(),
        },
      ];

      jest.spyOn(service, 'getTodayPrices').mockResolvedValue(mockTodayPrices);

      const result = await service.getRecommendations();

      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('dailyTip');
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(typeof result.dailyTip).toBe('string');
    });

    it('should handle empty prices gracefully', async () => {
      jest.spyOn(service, 'getTodayPrices').mockResolvedValue([]);

      const result = await service.getRecommendations();

      expect(result).toEqual({
        recommendations: [],
        dailyTip: 'No hay datos de precios disponibles para generar recomendaciones.',
      });
    });
  });

  describe('fetchFromExternalApi', () => {
    it('should fetch and transform data from external API', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'apis.ree.url' || key === 'reeApiUrl') {
          return 'https://api.esios.ree.es/test';
        }
        return null;
      });

      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ data: mockREEApiResponse } as any)
      );

      const result = await service.fetchFromExternalApi();

      expect(httpService.get).toHaveBeenCalledWith('https://api.esios.ree.es/test');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('hour');
      expect(result[0]).toHaveProperty('price');
    });

    it('should throw error if API URL not configured', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(null);

      await expect(service.fetchFromExternalApi()).rejects.toThrow(
        'REE API URL not configured'
      );
    });
  });

  describe('savePrices', () => {
    it('should save prices and clear cache', async () => {
      const mockPrices = [
        {
          date: new Date('2025-10-06T00:00:00.000Z'),
          hour: 0,
          price: 0.09,
        },
      ];

      jest.spyOn(priceModel, 'findOneAndUpdate').mockResolvedValue({});
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      const result = await service.savePrices(mockPrices);

      expect(priceModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(cacheManager.del).toHaveBeenCalledWith('today_prices');
      expect(cacheManager.del).toHaveBeenCalledWith('tomorrow_prices');
      expect(cacheManager.del).toHaveBeenCalledWith('dashboard_stats');
      expect(result).toBe(1);
    });

    it('should handle save errors gracefully', async () => {
      const mockPrices = [
        {
          date: new Date('2025-10-06T00:00:00.000Z'),
          hour: 0,
          price: 0.09,
        },
      ];

      jest.spyOn(priceModel, 'findOneAndUpdate').mockRejectedValue(new Error('DB Error'));

      const result = await service.savePrices(mockPrices);

      expect(result).toBe(0);
    });
  });

  describe('getPriceHistory', () => {
    it('should return price history for specified days', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPriceData),
      };
      
      jest.spyOn(priceModel, 'find').mockReturnValue(mockQuery);

      const result = await service.getPriceHistory(7);

      expect(priceModel.find).toHaveBeenCalledWith({
        date: expect.objectContaining({
          $gte: expect.any(Date),
        }),
      });
      expect(result).toHaveLength(3);
    });
  });

  describe('getPriceStats', () => {
    it('should return aggregated price statistics', async () => {
      const mockAggregateResult = [
        {
          _id: '2025-10-06',
          avgPrice: 0.15,
          minPrice: 0.08,
          maxPrice: 0.3,
        },
      ];

      jest.spyOn(priceModel, 'aggregate').mockResolvedValue(mockAggregateResult);

      const result = await service.getPriceStats(7);

      expect(priceModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual(mockAggregateResult);
    });
  });
});
