import * as request from 'supertest';

describe('API Integration Tests (Real Server)', () => {
  const baseUrl = 'http://localhost:4000';

  beforeAll(() => {
    // Estos tests requieren que el servidor esté ejecutándose en localhost:4000
    console.log('Testing against running server at:', baseUrl);
  });

  describe('Health Check', () => {
    it('should respond to API calls', async () => {
      const response = await request(baseUrl)
        .get('/api/v1/prices/dashboard-stats')
        .expect(200);

      expect(response.body).toHaveProperty('currentPrice');
      expect(response.body).toHaveProperty('nextHourPrice');
      expect(response.body).toHaveProperty('lastUpdated');
    });
  });

  describe('Prices Endpoints', () => {
    it('should return today prices', async () => {
      const response = await request(baseUrl)
        .get('/api/v1/prices/today')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('date');
        expect(response.body[0]).toHaveProperty('hour');
        expect(response.body[0]).toHaveProperty('price');
        expect(response.body[0]).toHaveProperty('timestamp');

        // Verificar que la fecha es de hoy (6 de octubre, 2025)
        const priceDate = new Date(response.body[0].date);
        expect(priceDate.getDate()).toBe(6);
        expect(priceDate.getMonth()).toBe(9); // Octubre es mes 9 (0-indexed)
        expect(priceDate.getFullYear()).toBe(2025);
      }
    });

    it('should return dashboard statistics with correct format', async () => {
      const response = await request(baseUrl)
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
    });

    it('should return hourly prices with proper structure', async () => {
      const response = await request(baseUrl)
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
        const price = response.body.prices[0];
        expect(price).toHaveProperty('timestamp');
        expect(price).toHaveProperty('hour');
        expect(price).toHaveProperty('price');
        expect(price).toHaveProperty('level');
        expect(price).toHaveProperty('currency', 'EUR');

        expect(['bajo', 'medio', 'alto', 'muy-alto']).toContain(price.level);
      }
    });

    it('should return recommendations', async () => {
      const response = await request(baseUrl)
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

    it('should return price history', async () => {
      const response = await request(baseUrl)
        .get('/api/v1/prices/history')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('date');
        expect(response.body[0]).toHaveProperty('hour');
        expect(response.body[0]).toHaveProperty('price');
        expect(response.body[0]).toHaveProperty('timestamp');
      }
    });

    it('should return price statistics', async () => {
      const response = await request(baseUrl)
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

    it('should handle period parameter in hourly endpoint', async () => {
      // Test different periods
      const periods = ['today', 'week', 'month'];

      for (const period of periods) {
        const response = await request(baseUrl)
          .get(`/api/v1/prices/hourly?period=${period}`)
          .expect(200);

        expect(response.body).toHaveProperty('prices');
        expect(response.body).toHaveProperty('average');
        expect(response.body).toHaveProperty('min');
        expect(response.body).toHaveProperty('max');
      }
    });

    it('should handle days parameter in history endpoint', async () => {
      const response = await request(baseUrl)
        .get('/api/v1/prices/history?days=3')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Contacts Endpoints', () => {
    const testContact = {
      name: 'E2E Test User',
      email: 'e2e-test@example.com',
    };

    it('should return all contacts', async () => {
      const response = await request(baseUrl)
        .get('/api/v1/contacts')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('_id');
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('email');
      }
    });

    it('should create a new contact', async () => {
      const uniqueEmail = `e2e-test-${Date.now()}@example.com`;
      const contactData = {
        name: 'E2E Test User',
        email: uniqueEmail,
      };

      const response = await request(baseUrl)
        .post('/api/v1/contacts')
        .send(contactData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('name', contactData.name);
      expect(response.body).toHaveProperty('email', uniqueEmail.toLowerCase());
    });

    it('should not create contact with duplicate email', async () => {
      const duplicateEmail = 'jandergb.30@gmail.com'; // Email que ya existe en la BD

      const response = await request(baseUrl)
        .post('/api/v1/contacts')
        .send({
          name: 'Duplicate Test',
          email: duplicateEmail,
        })
        .expect(409); // Conflict

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate required fields', async () => {
      // Test missing email
      await request(baseUrl)
        .post('/api/v1/contacts')
        .send({
          name: 'Test User',
          // email missing
        })
        .expect(400);

      // Test missing name
      await request(baseUrl)
        .post('/api/v1/contacts')
        .send({
          // name missing
          email: 'test@example.com',
        })
        .expect(400);
    });

    it('should validate email format', async () => {
      await request(baseUrl)
        .post('/api/v1/contacts')
        .send({
          name: 'Test User',
          email: 'invalid-email-format',
        })
        .expect(400);
    });

    it('should normalize email to lowercase', async () => {
      const uniqueEmail = `E2E-UPPERCASE-${Date.now()}@EXAMPLE.COM`;

      const response = await request(baseUrl)
        .post('/api/v1/contacts')
        .send({
          name: 'Test User Uppercase',
          email: uniqueEmail,
        })
        .expect(201);

      expect(response.body.email).toBe(uniqueEmail.toLowerCase());
    });
  });

  describe('Cache Functionality', () => {
    it('should return consistent data on subsequent requests (cache test)', async () => {
      const response1 = await request(baseUrl)
        .get('/api/v1/prices/today')
        .expect(200);

      // Esperar un poco y hacer otra request
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response2 = await request(baseUrl)
        .get('/api/v1/prices/today')
        .expect(200);

      // Los datos deberían ser consistentes (mismo cache)
      expect(response1.body.length).toBe(response2.body.length);

      if (response1.body.length > 0) {
        expect(response1.body[0].price).toBe(response2.body[0].price);
        expect(response1.body[0].timestamp).toBe(response2.body[0].timestamp);
      }
    });

    it('should serve dashboard stats from cache consistently', async () => {
      const response1 = await request(baseUrl)
        .get('/api/v1/prices/dashboard-stats')
        .expect(200);

      const response2 = await request(baseUrl)
        .get('/api/v1/prices/dashboard-stats')
        .expect(200);

      expect(response1.body.currentPrice).toBe(response2.body.currentPrice);
      expect(response1.body.nextHourPrice).toBe(response2.body.nextHourPrice);
      expect(response1.body.lastUpdated).toBe(response2.body.lastUpdated);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(baseUrl).get('/api/v1/non-existent-endpoint').expect(404);
    });

    it('should handle malformed requests gracefully', async () => {
      await request(baseUrl)
        .post('/api/v1/contacts')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    it('should return proper error format', async () => {
      const response = await request(baseUrl)
        .get('/api/v1/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Data Validation', () => {
    it("should verify today's prices are from the correct date", async () => {
      const response = await request(baseUrl)
        .get('/api/v1/prices/today')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(24); // 24 horas

      // Verificar que todas las entradas son del día 6 de octubre, 2025
      response.body.forEach((price: any) => {
        const priceDate = new Date(price.date);
        expect(priceDate.getDate()).toBe(6);
        expect(priceDate.getMonth()).toBe(9); // Octubre
        expect(priceDate.getFullYear()).toBe(2025);
        expect(price.hour).toBeGreaterThanOrEqual(0);
        expect(price.hour).toBeLessThanOrEqual(23);
        expect(typeof price.price).toBe('number');
        expect(price.price).toBeGreaterThan(0);
      });
    });

    it('should verify dashboard stats have reasonable values', async () => {
      const response = await request(baseUrl)
        .get('/api/v1/prices/dashboard-stats')
        .expect(200);

      // Los precios deberían estar en un rango razonable (0.01 a 1.00 EUR/kWh)
      expect(response.body.currentPrice).toBeGreaterThan(0);
      expect(response.body.currentPrice).toBeLessThan(1);

      expect(response.body.nextHourPrice).toBeGreaterThan(0);
      expect(response.body.nextHourPrice).toBeLessThan(1);

      // Los porcentajes deberían estar en rangos razonables
      expect(response.body.priceChangePercentage).toBeGreaterThanOrEqual(-100);
      expect(response.body.priceChangePercentage).toBeLessThanOrEqual(1000);

      expect(response.body.monthlySavings).toBeGreaterThanOrEqual(-100);
      expect(response.body.monthlySavings).toBeLessThanOrEqual(100);

      expect(['tarifa fija', 'precio mercado']).toContain(
        response.body.comparisonType,
      );
    });
  });
});
