import request from 'supertest';
import { createApp } from '../../app.js';

describe('GET /api/v1/health', () => {
  it('returns API health', async () => {
    const response = await request(createApp()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });
});
