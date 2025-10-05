import { Test, TestingModule } from '@nestjs/testing';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';

describe('PricesController', () => {
  let controller: PricesController;
  let service: PricesService;

  const mockPricesService = {
    getTodayPrices: jest.fn(),
    getTomorrowPrices: jest.fn(),
    getDashboardStats: jest.fn(),
    getHourlyPrices: jest.fn(),
    getRecommendations: jest.fn(),
    getPriceHistory: jest.fn(),
    getPriceStats: jest.fn(),
    fetchFromExternalApi: jest.fn(),
    savePrices: jest.fn(),
  };

  const mockTodayPrices = [
    {
      date: new Date('2025-10-06T00:00:00.000Z'),
      hour: 0,
      price: 0.09,
      isFallback: false,
      timestamp: new Date('2025-10-05T18:56:29.131Z'),
    },
    {
      date: new Date('2025-10-06T00:00:00.000Z'),
      hour: 1,
      price: 0.089,
      isFallback: false,
      timestamp: new Date('2025-10-05T18:56:29.131Z'),
    },
  ];

  const mockDashboardStats = {
    currentPrice: 0.09,
    nextHourPrice: 0.089,
    priceChangePercentage: -1.11,
    monthlySavings: 20.69,
    comparisonType: 'tarifa fija',
    lastUpdated: '2025-10-06T00:00:00.000Z',
  };

  const mockHourlyPrices = {
    prices: [
      {
        timestamp: '2025-10-06T00:00:00.000Z',
        hour: '00',
        price: 0.09,
        level: 'bajo' as const,
        currency: 'EUR',
      },
    ],
    average: 0.09,
    min: 0.089,
    max: 0.15,
  };

  const mockRecommendations = {
    recommendations: [
      {
        type: 'ideal',
        title: 'Momento ideal',
        description: 'Pon la lavadora ahora',
        timeRange: 'Próximas 2 horas',
        percentage: '43%',
        appliance: 'lavadora',
        savingsPercentage: 43,
      },
    ],
    dailyTip: 'Los precios más baratos serán a las 1:00 y los más caros a las 21:00.',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PricesController],
      providers: [
        {
          provide: PricesService,
          useValue: mockPricesService,
        },
      ],
    }).compile();

    controller = module.get<PricesController>(PricesController);
    service = module.get<PricesService>(PricesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTodayPrices', () => {
    it('should return today prices', async () => {
      mockPricesService.getTodayPrices.mockResolvedValue(mockTodayPrices);

      const result = await controller.getTodayPrices();

      expect(service.getTodayPrices).toHaveBeenCalled();
      expect(result).toEqual(mockTodayPrices);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('hour');
      expect(result[0]).toHaveProperty('price');
      expect(result[0]).toHaveProperty('isFallback');
      expect(result[0]).toHaveProperty('timestamp');
    });

    it('should handle empty results', async () => {
      mockPricesService.getTodayPrices.mockResolvedValue([]);

      const result = await controller.getTodayPrices();

      expect(service.getTodayPrices).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      mockPricesService.getTodayPrices.mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.getTodayPrices()).rejects.toThrow('Database connection failed');
    });
  });

  describe('getTomorrowPrices', () => {
    it('should return tomorrow prices', async () => {
      const mockTomorrowPrices = [
        {
          date: new Date('2025-10-07T00:00:00.000Z'),
          hour: 0,
          price: 0.08,
          isFallback: false,
          timestamp: new Date('2025-10-06T20:30:00.000Z'),
        },
      ];

      mockPricesService.getTomorrowPrices.mockResolvedValue(mockTomorrowPrices);

      const result = await controller.getTomorrowPrices();

      expect(service.getTomorrowPrices).toHaveBeenCalled();
      expect(result).toEqual(mockTomorrowPrices);
    });

    it('should handle when no tomorrow prices available', async () => {
      mockPricesService.getTomorrowPrices.mockResolvedValue([]);

      const result = await controller.getTomorrowPrices();

      expect(result).toEqual([]);
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      mockPricesService.getDashboardStats.mockResolvedValue(mockDashboardStats);

      const result = await controller.getDashboardStats();

      expect(service.getDashboardStats).toHaveBeenCalled();
      expect(result).toEqual(mockDashboardStats);
      expect(result).toHaveProperty('currentPrice');
      expect(result).toHaveProperty('nextHourPrice');
      expect(result).toHaveProperty('priceChangePercentage');
      expect(result).toHaveProperty('monthlySavings');
      expect(result).toHaveProperty('comparisonType');
      expect(result).toHaveProperty('lastUpdated');
    });

    it('should validate dashboard stats data types', async () => {
      mockPricesService.getDashboardStats.mockResolvedValue(mockDashboardStats);

      const result = await controller.getDashboardStats();

      expect(typeof result.currentPrice).toBe('number');
      expect(typeof result.nextHourPrice).toBe('number');
      expect(typeof result.priceChangePercentage).toBe('number');
      expect(typeof result.monthlySavings).toBe('number');
      expect(typeof result.comparisonType).toBe('string');
      expect(typeof result.lastUpdated).toBe('string');
    });
  });

  describe('getHourlyPrices', () => {
    it('should return hourly prices for today (default)', async () => {
      mockPricesService.getHourlyPrices.mockResolvedValue(mockHourlyPrices);

      const result = await controller.getHourlyPrices();

      expect(service.getHourlyPrices).toHaveBeenCalledWith('today');
      expect(result).toEqual(mockHourlyPrices);
      expect(result).toHaveProperty('prices');
      expect(result).toHaveProperty('average');
      expect(result).toHaveProperty('min');
      expect(result).toHaveProperty('max');
    });

    it('should return hourly prices for week period', async () => {
      mockPricesService.getHourlyPrices.mockResolvedValue(mockHourlyPrices);

      const result = await controller.getHourlyPrices('week');

      expect(service.getHourlyPrices).toHaveBeenCalledWith('week');
      expect(result).toEqual(mockHourlyPrices);
    });

    it('should return hourly prices for month period', async () => {
      mockPricesService.getHourlyPrices.mockResolvedValue(mockHourlyPrices);

      const result = await controller.getHourlyPrices('month');

      expect(service.getHourlyPrices).toHaveBeenCalledWith('month');
      expect(result).toEqual(mockHourlyPrices);
    });

    it('should validate hourly prices structure', async () => {
      mockPricesService.getHourlyPrices.mockResolvedValue(mockHourlyPrices);

      const result = await controller.getHourlyPrices('today');

      expect(Array.isArray(result.prices)).toBe(true);
      expect(typeof result.average).toBe('number');
      expect(typeof result.min).toBe('number');
      expect(typeof result.max).toBe('number');
      
      if (result.prices.length > 0) {
        expect(result.prices[0]).toHaveProperty('timestamp');
        expect(result.prices[0]).toHaveProperty('hour');
        expect(result.prices[0]).toHaveProperty('price');
        expect(result.prices[0]).toHaveProperty('level');
        expect(result.prices[0]).toHaveProperty('currency');
      }
    });
  });

  describe('getRecommendations', () => {
    it('should return energy usage recommendations', async () => {
      mockPricesService.getRecommendations.mockResolvedValue(mockRecommendations);

      const result = await controller.getRecommendations();

      expect(service.getRecommendations).toHaveBeenCalled();
      expect(result).toEqual(mockRecommendations);
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('dailyTip');
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(typeof result.dailyTip).toBe('string');
    });

    it('should validate recommendation structure', async () => {
      mockPricesService.getRecommendations.mockResolvedValue(mockRecommendations);

      const result = await controller.getRecommendations();

      if (result.recommendations.length > 0) {
        const recommendation = result.recommendations[0];
        expect(recommendation).toHaveProperty('type');
        expect(recommendation).toHaveProperty('title');
        expect(recommendation).toHaveProperty('description');
        expect(recommendation).toHaveProperty('appliance');
        expect(recommendation).toHaveProperty('savingsPercentage');
      }
    });
  });

  describe('getHistory', () => {
    it('should return price history with default days', async () => {
      const mockHistory = [
        {
          date: new Date('2025-10-05T00:00:00.000Z'),
          hour: 0,
          price: 0.1,
          isFallback: false,
          timestamp: new Date(),
        },
      ];

      mockPricesService.getPriceHistory.mockResolvedValue(mockHistory);

      const result = await controller.getHistory({});

      expect(service.getPriceHistory).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockHistory);
    });

    it('should return price history with custom days', async () => {
      const mockHistory = [
        {
          date: new Date('2025-10-01T00:00:00.000Z'),
          hour: 0,
          price: 0.12,
          isFallback: false,
          timestamp: new Date(),
        },
      ];

      mockPricesService.getPriceHistory.mockResolvedValue(mockHistory);

      const result = await controller.getHistory({ days: 10 });

      expect(service.getPriceHistory).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getStats', () => {
    it('should return price statistics with default days', async () => {
      const mockStats = [
        {
          _id: '2025-10-06',
          avgPrice: 0.15,
          minPrice: 0.08,
          maxPrice: 0.3,
        },
      ];

      mockPricesService.getPriceStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(service.getPriceStats).toHaveBeenCalledWith(30);
      expect(result).toEqual(mockStats);
    });

    it('should return price statistics with custom days', async () => {
      const mockStats = [
        {
          _id: '2025-10-06',
          avgPrice: 0.15,
          minPrice: 0.08,
          maxPrice: 0.3,
        },
      ];

      mockPricesService.getPriceStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(7);

      expect(service.getPriceStats).toHaveBeenCalledWith(7);
      expect(result).toEqual(mockStats);
    });
  });

  describe('fetchPrices', () => {
    it('should fetch and save prices successfully', async () => {
      const mockFetchedPrices = [
        {
          date: new Date('2025-10-06T00:00:00.000Z'),
          hour: 0,
          price: 0.09,
        },
      ];

      mockPricesService.fetchFromExternalApi.mockResolvedValue(mockFetchedPrices);
      mockPricesService.savePrices.mockResolvedValue(24);

      const result = await controller.fetchPrices();

      expect(service.fetchFromExternalApi).toHaveBeenCalled();
      expect(service.savePrices).toHaveBeenCalledWith(mockFetchedPrices);
      expect(result).toEqual({
        message: 'Prices updated successfully',
        saved: 24,
      });
    });

    it('should handle fetch errors', async () => {
      mockPricesService.fetchFromExternalApi.mockRejectedValue(new Error('API Error'));

      await expect(controller.fetchPrices()).rejects.toThrow('API Error');
    });

    it('should handle save errors', async () => {
      const mockFetchedPrices = [
        {
          date: new Date('2025-10-06T00:00:00.000Z'),
          hour: 0,
          price: 0.09,
        },
      ];

      mockPricesService.fetchFromExternalApi.mockResolvedValue(mockFetchedPrices);
      mockPricesService.savePrices.mockRejectedValue(new Error('Database Error'));

      await expect(controller.fetchPrices()).rejects.toThrow('Database Error');
    });

    it('should validate response structure', async () => {
      const mockFetchedPrices = [
        {
          date: new Date('2025-10-06T00:00:00.000Z'),
          hour: 0,
          price: 0.09,
        },
      ];

      mockPricesService.fetchFromExternalApi.mockResolvedValue(mockFetchedPrices);
      mockPricesService.savePrices.mockResolvedValue(1);

      const result = await controller.fetchPrices();

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('saved');
      expect(typeof result.message).toBe('string');
      expect(typeof result.saved).toBe('number');
    });
  });
});
