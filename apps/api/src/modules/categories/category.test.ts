import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Service category API', () => {
  describe('GET /api/v1/categories', () => {
    it('returns all service categories in alphabetical order', async () => {
      const response = await request(app).get('/api/v1/categories');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(10);

      expect(response.body.data).toEqual([
        expect.objectContaining({
          name: 'Bridal and Beauty',
          slug: 'bridal-and-beauty',
        }),
        expect.objectContaining({
          name: 'Catering',
          slug: 'catering',
        }),
        expect.objectContaining({
          name: 'Decorations',
          slug: 'decorations',
        }),
        expect.objectContaining({
          name: 'Event Planning',
          slug: 'event-planning',
        }),
        expect.objectContaining({
          name: 'Invitations and Printing',
          slug: 'invitations-and-printing',
        }),
        expect.objectContaining({
          name: 'Music and DJ',
          slug: 'music-and-dj',
        }),
        expect.objectContaining({
          name: 'Photography',
          slug: 'photography',
        }),
        expect.objectContaining({
          name: 'Transport',
          slug: 'transport',
        }),
        expect.objectContaining({
          name: 'Venues',
          slug: 'venues',
        }),
        expect.objectContaining({
          name: 'Videography',
          slug: 'videography',
        }),
      ]);
    });
  });
});