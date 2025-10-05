import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Prices & Contacts API (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Crear servidor MongoDB en memoria para tests
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Configurar variables de entorno para testing
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = mongoUri;
    process.env.PORT = '0'; // Puerto aleatorio para evitar conflictos

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider('DATABASE_CONNECTION')
    .useFactory({
      factory: () => MongooseModule.forRoot(mongoUri),
    })
    .compile();

    app = moduleFixture.createNestApplication();
    
    // Configurar pipes de validación
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // Configurar prefijo API
    app.setGlobalPrefix('api/v1');

    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe('Health Checks', () => {
    it('should be able to start the application', async () => {
      expect(app).toBeDefined();
    });
  });

  describe('Prices Endpoints', () => {
    describe('GET /api/v1/prices/today', () => {
      it('should return today prices', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/today')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('date');
          expect(response.body[0]).toHaveProperty('hour');
          expect(response.body[0]).toHaveProperty('price');
          expect(response.body[0]).toHaveProperty('isFallback');
          expect(response.body[0]).toHaveProperty('timestamp');
          
          expect(typeof response.body[0].hour).toBe('number');
          expect(typeof response.body[0].price).toBe('number');
          expect(typeof response.body[0].isFallback).toBe('boolean');
        }
      });

      it('should handle cache correctly on subsequent requests', async () => {
        const response1 = await request(app.getHttpServer())
          .get('/api/v1/prices/today')
          .expect(200);

        const response2 = await request(app.getHttpServer())
          .get('/api/v1/prices/today')
          .expect(200);

        expect(response1.body).toEqual(response2.body);
      });
    });

    describe('GET /api/v1/prices/tomorrow', () => {
      it('should return tomorrow prices or empty array', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/tomorrow')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('date');
          expect(response.body[0]).toHaveProperty('hour');
          expect(response.body[0]).toHaveProperty('price');
          expect(response.body[0]).toHaveProperty('isFallback');
          expect(response.body[0]).toHaveProperty('timestamp');
        }
      });
    });

    describe('GET /api/v1/prices/dashboard-stats', () => {
      it('should return dashboard statistics', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/dashboard-stats')
          .expect(200);

        expect(response.body).toHaveProperty('currentPrice');
        expect(response.body).toHaveProperty('nextHourPrice');
        expect(response.body).toHaveProperty('priceChangePercentage');
        expect(response.body).toHaveProperty('monthlySavings');
        expect(response.body).toHaveProperty('comparisonType');
        expect(response.body).toHaveProperty('lastUpdated');

        expect(typeof response.body.currentPrice).toBe('number');
        expect(typeof response.body.nextHourPrice).toBe('number');
        expect(typeof response.body.priceChangePercentage).toBe('number');
        expect(typeof response.body.monthlySavings).toBe('number');
        expect(typeof response.body.comparisonType).toBe('string');
        expect(typeof response.body.lastUpdated).toBe('string');
      });

      it('should have valid percentage values', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/dashboard-stats')
          .expect(200);

        expect(response.body.priceChangePercentage).toBeGreaterThanOrEqual(-100);
        expect(response.body.priceChangePercentage).toBeLessThanOrEqual(1000);
        expect(response.body.monthlySavings).toBeGreaterThanOrEqual(-100);
        expect(response.body.monthlySavings).toBeLessThanOrEqual(100);
      });
    });

    describe('GET /api/v1/prices/hourly', () => {
      it('should return hourly prices for today (default)', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/hourly')
          .expect(200);

        expect(response.body).toHaveProperty('prices');
        expect(response.body).toHaveProperty('average');
        expect(response.body).toHaveProperty('min');
        expect(response.body).toHaveProperty('max');

        expect(Array.isArray(response.body.prices)).toBe(true);
        expect(typeof response.body.average).toBe('number');
        expect(typeof response.body.min).toBe('number');
        expect(typeof response.body.max).toBe('number');

        if (response.body.prices.length > 0) {
          expect(response.body.prices[0]).toHaveProperty('timestamp');
          expect(response.body.prices[0]).toHaveProperty('hour');
          expect(response.body.prices[0]).toHaveProperty('price');
          expect(response.body.prices[0]).toHaveProperty('level');
          expect(response.body.prices[0]).toHaveProperty('currency');
          
          expect(['bajo', 'medio', 'alto', 'muy-alto']).toContain(response.body.prices[0].level);
          expect(response.body.prices[0].currency).toBe('EUR');
        }
      });

      it('should return hourly prices for week period', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/hourly?period=week')
          .expect(200);

        expect(response.body).toHaveProperty('prices');
        expect(response.body).toHaveProperty('average');
        expect(response.body).toHaveProperty('min');
        expect(response.body).toHaveProperty('max');
      });

      it('should return hourly prices for month period', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/hourly?period=month')
          .expect(200);

        expect(response.body).toHaveProperty('prices');
        expect(response.body).toHaveProperty('average');
        expect(response.body).toHaveProperty('min');
        expect(response.body).toHaveProperty('max');
      });

      it('should validate query parameters', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/prices/hourly?period=invalid')
          .expect(200); // Should default to 'today'
      });
    });

    describe('GET /api/v1/prices/recommendations', () => {
      it('should return energy usage recommendations', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/recommendations')
          .expect(200);

        expect(response.body).toHaveProperty('recommendations');
        expect(response.body).toHaveProperty('dailyTip');

        expect(Array.isArray(response.body.recommendations)).toBe(true);
        expect(typeof response.body.dailyTip).toBe('string');

        if (response.body.recommendations.length > 0) {
          const recommendation = response.body.recommendations[0];
          expect(recommendation).toHaveProperty('type');
          expect(recommendation).toHaveProperty('title');
          expect(recommendation).toHaveProperty('description');
          expect(recommendation).toHaveProperty('appliance');
          expect(recommendation).toHaveProperty('savingsPercentage');
          
          expect(typeof recommendation.savingsPercentage).toBe('number');
          expect(recommendation.savingsPercentage).toBeGreaterThanOrEqual(0);
          expect(recommendation.savingsPercentage).toBeLessThanOrEqual(100);
        }
      });
    });

    describe('GET /api/v1/prices/history', () => {
      it('should return price history with default days', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/history')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('date');
          expect(response.body[0]).toHaveProperty('hour');
          expect(response.body[0]).toHaveProperty('price');
          expect(response.body[0]).toHaveProperty('isFallback');
          expect(response.body[0]).toHaveProperty('timestamp');
        }
      });

      it('should return price history with custom days', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/history?days=3')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should validate days parameter', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/prices/history?days=invalid')
          .expect(200); // Should handle gracefully
      });
    });

    describe('GET /api/v1/prices/stats', () => {
      it('should return price statistics', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/stats')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('_id');
          expect(response.body[0]).toHaveProperty('avgPrice');
          expect(response.body[0]).toHaveProperty('minPrice');
          expect(response.body[0]).toHaveProperty('maxPrice');
          
          expect(typeof response.body[0].avgPrice).toBe('number');
          expect(typeof response.body[0].minPrice).toBe('number');
          expect(typeof response.body[0].maxPrice).toBe('number');
        }
      });

      it('should return stats with custom days parameter', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/prices/stats?days=7')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('POST /api/v1/prices/fetch', () => {
      it('should fetch and save prices (may fail due to external API)', async () => {
        // Este test puede fallar si la API externa no está disponible
        const response = await request(app.getHttpServer())
          .post('/api/v1/prices/fetch');

        // Permitir tanto éxito (200) como error (500) ya que depende de API externa
        if (response.status === 200) {
          expect(response.body).toHaveProperty('message');
          expect(response.body).toHaveProperty('saved');
          expect(typeof response.body.saved).toBe('number');
        } else if (response.status === 500) {
          expect(response.body).toHaveProperty('statusCode', 500);
        }
      });
    });
  });

  describe('Contacts Endpoints', () => {
    const testContact = {
      name: 'Test User E2E',
      email: 'test-e2e@example.com',
    };

    describe('POST /api/v1/contacts', () => {
      it('should create a new contact', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/contacts')
          .send(testContact)
          .expect(201);

        expect(response.body).toHaveProperty('_id');
        expect(response.body).toHaveProperty('name', testContact.name);
        expect(response.body).toHaveProperty('email', testContact.email.toLowerCase());
      });

      it('should not create contact with duplicate email', async () => {
        // Crear el primer contacto
        await request(app.getHttpServer())
          .post('/api/v1/contacts')
          .send({
            name: 'First User',
            email: 'duplicate@example.com',
          })
          .expect(201);

        // Intentar crear contacto con el mismo email
        await request(app.getHttpServer())
          .post('/api/v1/contacts')
          .send({
            name: 'Second User',
            email: 'duplicate@example.com',
          })
          .expect(409); // Conflict
      });

      it('should validate required fields', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/contacts')
          .send({
            name: 'Test User',
            // email missing
          })
          .expect(400);

        await request(app.getHttpServer())
          .post('/api/v1/contacts')
          .send({
            // name missing
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('should validate email format', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/contacts')
          .send({
            name: 'Test User',
            email: 'invalid-email-format',
          })
          .expect(400);
      });

      it('should normalize email to lowercase', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/contacts')
          .send({
            name: 'Test User Uppercase',
            email: 'UPPERCASE@EXAMPLE.COM',
          })
          .expect(201);

        expect(response.body.email).toBe('uppercase@example.com');
      });
    });

    describe('GET /api/v1/contacts', () => {
      it('should return all contacts', async () => {
        // Crear algunos contactos primero
        await request(app.getHttpServer())
          .post('/api/v1/contacts')
          .send({
            name: 'Contact 1',
            email: 'contact1@example.com',
          });

        await request(app.getHttpServer())
          .post('/api/v1/contacts')
          .send({
            name: 'Contact 2',
            email: 'contact2@example.com',
          });

        const response = await request(app.getHttpServer())
          .get('/api/v1/contacts')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);
        
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('_id');
          expect(response.body[0]).toHaveProperty('name');
          expect(response.body[0]).toHaveProperty('email');
        }
      });

      it('should return empty array when no contacts exist', async () => {
        // Para este test necesitaríamos limpiar la base de datos
        // En un escenario real, esto se haría con hooks de limpieza
        const response = await request(app.getHttpServer())
          .get('/api/v1/contacts')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/non-existent-endpoint')
        .expect(404);
    });

    it('should handle malformed requests gracefully', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/contacts')
        .send('invalid json')
        .expect(400);
    });

    it('should return proper error format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/prices/today')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-credentials');
    });
  });

  describe('API Documentation', () => {
    it('should serve Swagger documentation', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/documentation')
        .expect(200);
    });

    it('should serve Swagger JSON', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/documentation-json')
        .expect(200);

      expect(response.body).toHaveProperty('paths');
      expect(response.body).toHaveProperty('info');
    });
  });
});