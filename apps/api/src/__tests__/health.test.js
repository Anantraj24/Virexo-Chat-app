import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Backend Core API Integration Tests', () => {
  it('GET /health should return 200 and healthy JSON status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.service).toContain('Virexo API');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /ready should return status based on database connection state', async () => {
    const res = await request(app).get('/ready');
    // Without active Mongo connection in test environment, readiness returns 503
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.database).toBe('connected');
    } else {
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    }
  });

  it('GET /undefined-route should trigger 404 handler with standard error envelope', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(res.body.error.message).toContain('Cannot GET');
  });

  it('should generate X-Request-ID header if not provided', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(typeof res.headers['x-request-id']).toBe('string');
  });

  it('should preserve incoming X-Request-ID header', async () => {
    const customId = 'custom-test-request-id-12345';
    const res = await request(app).get('/health').set('X-Request-ID', customId);
    expect(res.headers['x-request-id']).toBe(customId);
  });
});
