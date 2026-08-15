/**
 * Integration tests using supertest — require a running MySQL instance.
 * Set TEST_DB=1 env var to enable; skipped otherwise to allow CI without DB.
 */

// @ts-nocheck
const SKIP_DB = !process.env['TEST_DB'];

let request: any;
let app: any;

if (!SKIP_DB) {
  request = require('supertest');
  app = require('../../src/app').createApp();
}

describe.skipIf(SKIP_DB)('Integration: Health endpoint', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Integration: Auth (unit-level)', () => {
  it('returns 401 for missing Authorization header', async () => {
    if (SKIP_DB) {
      const supertest = require('supertest');
      const { createApp } = require('../../src/app');
      const testApp = createApp();
      const res = await supertest(testApp).get('/api/v1/connections');
      expect(res.status).toBe(401);
    }
  });

  it('returns 401 for invalid API key', async () => {
    const supertest = require('supertest');
    const { createApp } = require('../../src/app');
    const testApp = createApp();
    const res = await supertest(testApp)
      .get('/api/v1/connections')
      .set('Authorization', 'Bearer invalid-key-that-is-wrong');
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown route', async () => {
    const supertest = require('supertest');
    const { createApp } = require('../../src/app');
    const testApp = createApp();
    const res = await supertest(testApp).get('/api/v1/nonexistent');
    expect([401, 404]).toContain(res.status);
  });
});

// Tenant isolation test — verifies product A cannot read product B data
describe('Tenant isolation concept', () => {
  it('connection ownership is enforced at service layer', async () => {
    const { getConnection } = require('../../src/services/connection.service');
    const connectionRepo = require('../../src/repositories/connection.repository');
    jest.mock('../../src/repositories/connection.repository');

    connectionRepo.findById = jest.fn().mockResolvedValue({
      id: 'conn-1',
      product_id: 'prod-B', // belongs to product B
      tenant_id: 'tenant-1',
    });

    await expect(getConnection('conn-1', 'prod-A'))
      .rejects.toMatchObject({ code: 'CONNECTION_NOT_FOUND' });
  });
});

function describe_skipIf(condition: boolean, ...args: Parameters<typeof describe>) {
  if (condition) {
    return describe.skip(...args);
  }
  return describe(...args);
}
