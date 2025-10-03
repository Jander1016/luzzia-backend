import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { PricesController } from './prices.controller';
import { PricesService } from './prices.service';

describe('PricesController', () => {
  let controller: PricesController;
  let mockPricesService: any;

  const mockTodayPrices = [
    {
      date: new Date('2025-10-01'),
      hour: 0,
      price: 0.12,
      isFallback: false,
      timestamp: new Date(),
    },
    {
      date: new Date('2025-10-01'),
      hour: 1,
      price: 0.15,
      isFallback: false,
      timestamp: new Date(),
    },
  ];

  const mockDashboardStats = {
    currentPrice: 0.12,
    nextHourPrice: 0.15,
    priceChangePercentage: 25.0,
    monthlySavings: 15.5,
    comparisonType: 'tarifa fija',
    lastUpdated: '2025-10-01T12:00:00Z',
  };

  const mockHourlyPrices = {
    prices: [
      {
        timestamp: '2025-10-01T00:00:00Z',
        hour: '00',
        price: 0.12,
        level: 'medio' as const,
        currency: 'EUR',
      },
    ],
    average: 0.12,
    min: 0.1,
    max: 0.15,
  };

  const mockRecommendations = {
    recommendations: [
      {
        type: 'ideal' as const,
        title: 'Momento ideal',
        description: 'Pon la lavadora ahora',
        timeRange: 'Próximas 2 horas',
        percentage: '40%',
        appliance: 'lavadora',
        savingsPercentage: 25,
      },
    ],
    dailyTip: 'Los precios más baratos serán entre las 14:00 y 16:00',
  };

  beforeEach(async () => {
    mockPricesService = {
      getTodayPrices: jest.fn(),
      getPriceHistory: jest.fn(),
      getPriceStats: jest.fn(),
      getDashboardStats: jest.fn(),
      getHourlyPrices: jest.fn(),
      getRecommendations: jest.fn(),
      fetchFromExternalApi: jest.fn(),
      savePrices: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [PricesController],
      providers: [
        {
          provide: PricesService,
          useValue: mockPricesService,
        },
      ],
    }).compile();

    controller = module.get<PricesController>(PricesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTodayPrices', () => {
    it('should return today prices', async () => {
      mockPricesService.getTodayPrices.mockResolvedValue(mockTodayPrices);

      const result = await controller.getTodayPrices();

      expect(result).toEqual(mockTodayPrices);
      expect(mockPricesService.getTodayPrices).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockPricesService.getTodayPrices.mockRejectedValue(
        new Error('Service error'),
      );

      await expect(controller.getTodayPrices()).rejects.toThrow(
        'Service error',
      );
    });
  });

  describe('getHistory', () => {
    it('should return price history with default days', async () => {
      const mockHistory = [...mockTodayPrices];
      mockPricesService.getPriceHistory.mockResolvedValue(mockHistory);

      const result = await controller.getHistory({});

      expect(result).toEqual(mockHistory);
      expect(mockPricesService.getPriceHistory).toHaveBeenCalledWith(undefined);
    });

    it('should return price history with specified days', async () => {
      const mockHistory = [...mockTodayPrices];
      mockPricesService.getPriceHistory.mockResolvedValue(mockHistory);

      const result = await controller.getHistory({ days: 10 });

      expect(result).toEqual(mockHistory);
      expect(mockPricesService.getPriceHistory).toHaveBeenCalledWith(10);
    });
  });

  describe('getStats', () => {
    it('should return price stats with default days', async () => {
      const mockStats = { avg: 0.12, min: 0.1, max: 0.15 };
      mockPricesService.getPriceStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(undefined);

      expect(result).toEqual(mockStats);
      expect(mockPricesService.getPriceStats).toHaveBeenCalledWith(30);
    });

    it('should return price stats with specified days', async () => {
      const mockStats = { avg: 0.12, min: 0.1, max: 0.15 };
      mockPricesService.getPriceStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(7);

      expect(result).toEqual(mockStats);
      expect(mockPricesService.getPriceStats).toHaveBeenCalledWith(7);
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      mockPricesService.getDashboardStats.mockResolvedValue(mockDashboardStats);

      const result = await controller.getDashboardStats();

      expect(result).toEqual(mockDashboardStats);
      expect(mockPricesService.getDashboardStats).toHaveBeenCalled();
    });
  });

  describe('getHourlyPrices', () => {
    it('should return hourly prices with default period', async () => {
      mockPricesService.getHourlyPrices.mockResolvedValue(mockHourlyPrices);

      const result = await controller.getHourlyPrices('today');

      expect(result).toEqual(mockHourlyPrices);
      expect(mockPricesService.getHourlyPrices).toHaveBeenCalledWith('today');
    });

    it('should return hourly prices for week period', async () => {
      mockPricesService.getHourlyPrices.mockResolvedValue(mockHourlyPrices);

      const result = await controller.getHourlyPrices('week');

      expect(result).toEqual(mockHourlyPrices);
      expect(mockPricesService.getHourlyPrices).toHaveBeenCalledWith('week');
    });

    it('should return hourly prices for month period', async () => {
      mockPricesService.getHourlyPrices.mockResolvedValue(mockHourlyPrices);

      const result = await controller.getHourlyPrices('month');

      expect(result).toEqual(mockHourlyPrices);
      expect(mockPricesService.getHourlyPrices).toHaveBeenCalledWith('month');
    });
  });

  describe('getRecommendations', () => {
    it('should return price recommendations', async () => {
      mockPricesService.getRecommendations.mockResolvedValue(
        mockRecommendations,
      );

      const result = await controller.getRecommendations();

      expect(result).toEqual(mockRecommendations);
      expect(mockPricesService.getRecommendations).toHaveBeenCalled();
    });
  });

  describe('fetchPrices', () => {
    it('should fetch and save prices successfully', async () => {
      const mockPrices = [{ date: new Date(), hour: 0, price: 0.12 }];
      mockPricesService.fetchFromExternalApi.mockResolvedValue(mockPrices);
      mockPricesService.savePrices.mockResolvedValue(1);

      const result = await controller.fetchPrices();

      expect(result).toEqual({
        message: 'Prices updated successfully',
        saved: 1,
      });
      expect(mockPricesService.fetchFromExternalApi).toHaveBeenCalled();
      expect(mockPricesService.savePrices).toHaveBeenCalledWith(mockPrices);
    });

    it('should handle fetch errors', async () => {
      mockPricesService.fetchFromExternalApi.mockRejectedValue(
        new Error('Fetch error'),
      );

      await expect(controller.fetchPrices()).rejects.toThrow('Fetch error');
    });
  });
});
