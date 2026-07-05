import { MoodBoardCategory } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const customerEmail = 'mood-board-customer@example.com';
const secondCustomerEmail = 'mood-board-second-customer@example.com';
const vendorEmail = 'mood-board-vendor@example.com';

const customerPayload = {
  email: customerEmail,
  password: 'Customer@2026',
  firstName: 'Mood',
  lastName: 'Customer',
};

const secondCustomerPayload = {
  email: secondCustomerEmail,
  password: 'Customer@2026',
  firstName: 'Second',
  lastName: 'Customer',
};

const vendorPayload = {
  email: vendorEmail,
  password: 'Vendor@2026',
  firstName: 'Mood',
  lastName: 'Vendor',
  businessName: 'Mood Board Test Vendor',
};

const testEmails = [customerEmail, secondCustomerEmail, vendorEmail];

const registerCustomer = async (payload: typeof customerPayload | typeof secondCustomerPayload) => {
  return request(app).post('/api/v1/auth/register/customer').send(payload);
};

const registerVendor = async () => {
  return request(app).post('/api/v1/auth/register/vendor').send(vendorPayload);
};

const createEventRequest = (accessToken: string, overrides: Record<string, unknown> = {}) => {
  return request(app)
    .post('/api/v1/events')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'Maya and Arjun Wedding',
      eventType: 'Wedding',
      eventDate: '2030-08-20T09:00:00.000Z',
      location: 'Colombo',
      guestCount: 250,
      plannedBudget: 1000000,
      theme: 'Classic Garden',
      requirements: 'Outdoor ceremony with photography, catering, decoration, and live music.',
      ...overrides,
    });
};

const createMoodBoardItemRequest = (
  accessToken: string,
  eventId: string,
  overrides: Record<string, unknown> = {},
) => {
  return request(app)
    .post(`/api/v1/mood-boards/events/${eventId}/items`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      title: 'Garden wedding arch',
      description: 'White flowers with soft greenery and warm lighting',
      category: MoodBoardCategory.DECORATION,
      imageUrl: 'https://example.com/images/garden-arch.jpg',
      imagePublicId: 'mood-boards/garden-arch',
      sourceUrl: 'https://example.com/inspiration/garden-arch',
      colorTags: ['White', 'Green', 'Gold'],
      ...overrides,
    });
};

const getVendorProfileId = async () => {
  const vendor = await prisma.vendorProfile.findFirst({
    where: {
      user: {
        email: vendorEmail,
      },
    },
    select: {
      id: true,
    },
  });

  if (!vendor) {
    throw new Error('Mood-board test vendor profile was not found');
  }

  return vendor.id;
};

const clearTestData = async () => {
  await prisma.event.deleteMany({
    where: {
      owner: {
        email: {
          in: testEmails,
        },
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: testEmails,
      },
    },
  });
};

beforeEach(async () => {
  await clearTestData();
});

afterAll(async () => {
  await clearTestData();
  await prisma.$disconnect();
});

describe('Event mood-board and inspiration management API', () => {
  describe('Mood-board route access control', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).get(
        '/api/v1/mood-boards/events/clx0000000000000000000000/summary',
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .get('/api/v1/mood-boards/events/clx0000000000000000000000/summary')
        .set('Authorization', `Bearer ${vendorRegistration.body.data.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('hides another customer event', async () => {
      const firstRegistration = await registerCustomer(customerPayload);
      const secondRegistration = await registerCustomer(secondCustomerPayload);

      const eventResponse = await createEventRequest(firstRegistration.body.data.accessToken);

      const response = await request(app)
        .get(`/api/v1/mood-boards/events/${eventResponse.body.data.id}/summary`)
        .set('Authorization', `Bearer ${secondRegistration.body.data.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_NOT_FOUND');
    });

    it('hides another customer mood-board item', async () => {
      const firstRegistration = await registerCustomer(customerPayload);
      const secondRegistration = await registerCustomer(secondCustomerPayload);

      const firstAccessToken = firstRegistration.body.data.accessToken as string;

      const secondAccessToken = secondRegistration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(firstAccessToken);

      const itemResponse = await createMoodBoardItemRequest(
        firstAccessToken,
        eventResponse.body.data.id,
      );

      const response = await request(app)
        .get(
          `/api/v1/mood-boards/events/${eventResponse.body.data.id}/items/${itemResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${secondAccessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MOOD_BOARD_ITEM_NOT_FOUND');
    });
  });

  describe('Creating mood-board items', () => {
    it('creates an image and source mood-board item', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createMoodBoardItemRequest(accessToken, eventResponse.body.data.id);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mood-board item created successfully');

      expect(response.body.data).toMatchObject({
        eventId: eventResponse.body.data.id,
        vendorId: null,
        title: 'Garden wedding arch',
        description: 'White flowers with soft greenery and warm lighting',
        category: MoodBoardCategory.DECORATION,
        imageUrl: 'https://example.com/images/garden-arch.jpg',
        imagePublicId: 'mood-boards/garden-arch',
        sourceUrl: 'https://example.com/inspiration/garden-arch',
        colorTags: ['White', 'Green', 'Gold'],
        vendor: null,
      });

      expect(response.body.data.id).toEqual(expect.any(String));
      expect(response.body.data.createdAt).toEqual(expect.any(String));
      expect(response.body.data.updatedAt).toEqual(expect.any(String));
    });

    it('creates an image-only mood-board item', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createMoodBoardItemRequest(accessToken, eventResponse.body.data.id, {
        title: 'Bridal bouquet',
        category: MoodBoardCategory.FLOWERS,
        sourceUrl: undefined,
      });

      expect(response.status).toBe(201);

      expect(response.body.data).toMatchObject({
        title: 'Bridal bouquet',
        category: MoodBoardCategory.FLOWERS,
        imageUrl: 'https://example.com/images/garden-arch.jpg',
        sourceUrl: null,
      });
    });

    it('creates a source-only mood-board item', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createMoodBoardItemRequest(accessToken, eventResponse.body.data.id, {
        title: 'Wedding cake article',
        category: MoodBoardCategory.CAKE,
        imageUrl: undefined,
        imagePublicId: undefined,
        sourceUrl: 'https://example.com/articles/wedding-cakes',
      });

      expect(response.status).toBe(201);

      expect(response.body.data).toMatchObject({
        title: 'Wedding cake article',
        category: MoodBoardCategory.CAKE,
        imageUrl: null,
        imagePublicId: null,
        sourceUrl: 'https://example.com/articles/wedding-cakes',
      });
    });

    it('uses default values for optional fields', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createMoodBoardItemRequest(accessToken, eventResponse.body.data.id, {
        title: 'Minimal inspiration',
        description: undefined,
        category: undefined,
        imageUrl: undefined,
        imagePublicId: undefined,
        sourceUrl: 'https://example.com/minimal-inspiration',
        colorTags: undefined,
      });

      expect(response.status).toBe(201);

      expect(response.body.data).toMatchObject({
        title: 'Minimal inspiration',
        description: null,
        category: MoodBoardCategory.OTHER,
        imageUrl: null,
        imagePublicId: null,
        sourceUrl: 'https://example.com/minimal-inspiration',
        colorTags: [],
        vendorId: null,
        vendor: null,
      });
    });

    it('links an existing vendor to a mood-board item', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      await registerVendor();

      const accessToken = customerRegistration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const vendorId = await getVendorProfileId();

      const response = await createMoodBoardItemRequest(accessToken, eventResponse.body.data.id, {
        title: 'Vendor photography style',
        category: MoodBoardCategory.PHOTOGRAPHY,
        vendorId,
      });

      expect(response.status).toBe(201);

      expect(response.body.data.vendorId).toBe(vendorId);

      expect(response.body.data.vendor).toMatchObject({
        id: vendorId,
        businessName: 'Mood Board Test Vendor',
      });
    });

    it('rejects a non-existent linked vendor', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createMoodBoardItemRequest(accessToken, eventResponse.body.data.id, {
        vendorId: 'clx0000000000000000000000',
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VENDOR_NOT_FOUND');
    });

    it('normalizes and removes duplicate color tags', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createMoodBoardItemRequest(accessToken, eventResponse.body.data.id, {
        colorTags: ['  White  ', 'Green', 'White', '  Gold'],
      });

      expect(response.status).toBe(201);
      expect(response.body.data.colorTags).toEqual(['White', 'Green', 'Gold']);
    });

    it('allows duplicate mood-board items', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const firstResponse = await createMoodBoardItemRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const secondResponse = await createMoodBoardItemRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(201);
      expect(firstResponse.body.data.id).not.toBe(secondResponse.body.data.id);
    });

    it('rejects an item without an image or source URL', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createMoodBoardItemRequest(accessToken, eventResponse.body.data.id, {
        imageUrl: undefined,
        imagePublicId: undefined,
        sourceUrl: undefined,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an image public ID without an image URL', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createMoodBoardItemRequest(accessToken, eventResponse.body.data.id, {
        imageUrl: undefined,
        imagePublicId: 'mood-boards/orphan-image',
        sourceUrl: 'https://example.com/source',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid mood-board item fields', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createMoodBoardItemRequest(accessToken, eventResponse.body.data.id, {
        title: '',
        category: 'LIGHTING',
        imageUrl: 'not-a-url',
        sourceUrl: 'also-not-a-url',
        colorTags: [''],
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Listing and filtering mood-board items', () => {
    it('lists items with pagination', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);
      const eventId = eventResponse.body.data.id as string;

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'First inspiration',
      });

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Second inspiration',
      });

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Third inspiration',
      });

      const response = await request(app)
        .get(`/api/v1/mood-boards/events/${eventId}/items?page=2&limit=2&sort=oldest`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Third inspiration');

      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('filters items by category', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);
      const eventId = eventResponse.body.data.id as string;

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Flower inspiration',
        category: MoodBoardCategory.FLOWERS,
      });

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Cake inspiration',
        category: MoodBoardCategory.CAKE,
      });

      const response = await request(app)
        .get(`/api/v1/mood-boards/events/${eventId}/items?category=${MoodBoardCategory.FLOWERS}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe(MoodBoardCategory.FLOWERS);
    });

    it('filters items by linked vendor', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      await registerVendor();

      const accessToken = customerRegistration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);
      const eventId = eventResponse.body.data.id as string;

      const vendorId = await getVendorProfileId();

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Linked vendor item',
        vendorId,
      });

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Unlinked item',
      });

      const response = await request(app)
        .get(`/api/v1/mood-boards/events/${eventId}/items?vendorId=${vendorId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].vendorId).toBe(vendorId);
    });

    it('filters items by image presence', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);
      const eventId = eventResponse.body.data.id as string;

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Image item',
      });

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Source-only item',
        imageUrl: undefined,
        imagePublicId: undefined,
        sourceUrl: 'https://example.com/source-only',
      });

      const response = await request(app)
        .get(`/api/v1/mood-boards/events/${eventId}/items?hasImage=false`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Source-only item');
    });

    it('filters items by source presence', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);
      const eventId = eventResponse.body.data.id as string;

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Image-only item',
        sourceUrl: undefined,
      });

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Item with source',
      });

      const response = await request(app)
        .get(`/api/v1/mood-boards/events/${eventId}/items?hasSource=true`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Item with source');
    });

    it('searches title, description, source URL, and vendor name', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      await registerVendor();

      const accessToken = customerRegistration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);
      const eventId = eventResponse.body.data.id as string;

      const vendorId = await getVendorProfileId();

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Romantic photography',
        description: 'Golden hour portrait inspiration',
        vendorId,
      });

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Minimal cake',
        description: 'Simple white cake',
        sourceUrl: 'https://example.com/cake-board',
      });

      const descriptionSearch = await request(app)
        .get(`/api/v1/mood-boards/events/${eventId}/items?search=golden`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(descriptionSearch.status).toBe(200);
      expect(descriptionSearch.body.data).toHaveLength(1);
      expect(descriptionSearch.body.data[0].title).toBe('Romantic photography');

      const vendorSearch = await request(app)
        .get(`/api/v1/mood-boards/events/${eventId}/items?search=test%20vendor`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(vendorSearch.status).toBe(200);
      expect(vendorSearch.body.data).toHaveLength(1);
      expect(vendorSearch.body.data[0].vendorId).toBe(vendorId);
    });

    it('sorts items by title', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);
      const eventId = eventResponse.body.data.id as string;

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Zebra theme',
      });

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Autumn theme',
      });

      const response = await request(app)
        .get(`/api/v1/mood-boards/events/${eventId}/items?sort=title_asc`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      expect(response.body.data.map((item: { title: string }) => item.title)).toEqual([
        'Autumn theme',
        'Zebra theme',
      ]);
    });

    it('sorts items by category', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);
      const eventId = eventResponse.body.data.id as string;

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Venue item',
        category: MoodBoardCategory.VENUE,
      });

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Cake item',
        category: MoodBoardCategory.CAKE,
      });

      const response = await request(app)
        .get(`/api/v1/mood-boards/events/${eventId}/items?sort=category_asc`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      expect(
        response.body.data.map((item: { category: MoodBoardCategory }) => item.category),
      ).toEqual([MoodBoardCategory.CAKE, MoodBoardCategory.VENUE]);
    });

    it('rejects invalid list query parameters', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await request(app)
        .get(
          `/api/v1/mood-boards/events/${eventResponse.body.data.id}/items?page=0&limit=101&category=LIGHTING&hasImage=yes&sort=invalid`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Getting and updating mood-board items', () => {
    it('gets an owned mood-board item by ID', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const itemResponse = await createMoodBoardItemRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const response = await request(app)
        .get(
          `/api/v1/mood-boards/events/${eventResponse.body.data.id}/items/${itemResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(itemResponse.body.data.id);
      expect(response.body.data.title).toBe('Garden wedding arch');
    });

    it('updates mood-board item details', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const itemResponse = await createMoodBoardItemRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const response = await request(app)
        .patch(
          `/api/v1/mood-boards/events/${eventResponse.body.data.id}/items/${itemResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Updated floral arch',
          description: 'Updated description',
          category: MoodBoardCategory.FLOWERS,
          sourceUrl: 'https://example.com/updated-source',
          colorTags: ['Pink', 'White'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mood-board item updated successfully');

      expect(response.body.data).toMatchObject({
        title: 'Updated floral arch',
        description: 'Updated description',
        category: MoodBoardCategory.FLOWERS,
        sourceUrl: 'https://example.com/updated-source',
        colorTags: ['Pink', 'White'],
      });
    });

    it('clears optional fields using null', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const itemResponse = await createMoodBoardItemRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const response = await request(app)
        .patch(
          `/api/v1/mood-boards/events/${eventResponse.body.data.id}/items/${itemResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: null,
          sourceUrl: null,
          vendorId: null,
        });

      expect(response.status).toBe(200);

      expect(response.body.data).toMatchObject({
        description: null,
        sourceUrl: null,
        vendorId: null,
        vendor: null,
      });

      expect(response.body.data.imageUrl).toBe('https://example.com/images/garden-arch.jpg');
    });

    it('removes image public ID when image is removed', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const itemResponse = await createMoodBoardItemRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const response = await request(app)
        .patch(
          `/api/v1/mood-boards/events/${eventResponse.body.data.id}/items/${itemResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          imageUrl: null,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.imageUrl).toBeNull();
      expect(response.body.data.imagePublicId).toBeNull();
      expect(response.body.data.sourceUrl).not.toBeNull();
    });

    it('clears old image public ID when image URL is replaced without a new public ID', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const itemResponse = await createMoodBoardItemRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const response = await request(app)
        .patch(
          `/api/v1/mood-boards/events/${eventResponse.body.data.id}/items/${itemResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          imageUrl: 'https://example.com/images/new-image.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.imageUrl).toBe('https://example.com/images/new-image.jpg');
      expect(response.body.data.imagePublicId).toBeNull();
    });

    it('updates image URL and image public ID together', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const itemResponse = await createMoodBoardItemRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const response = await request(app)
        .patch(
          `/api/v1/mood-boards/events/${eventResponse.body.data.id}/items/${itemResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          imageUrl: 'https://example.com/images/replacement.jpg',
          imagePublicId: 'mood-boards/replacement',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.imageUrl).toBe('https://example.com/images/replacement.jpg');
      expect(response.body.data.imagePublicId).toBe('mood-boards/replacement');
    });

    it('rejects removing both the image and source URL', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const itemResponse = await createMoodBoardItemRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const response = await request(app)
        .patch(
          `/api/v1/mood-boards/events/${eventResponse.body.data.id}/items/${itemResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          imageUrl: null,
          sourceUrl: null,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MOOD_BOARD_IMAGE_OR_SOURCE_REQUIRED');
    });

    it('rejects an empty mood-board item update', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const itemResponse = await createMoodBoardItemRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const response = await request(app)
        .patch(
          `/api/v1/mood-boards/events/${eventResponse.body.data.id}/items/${itemResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Deleting mood-board items', () => {
    it('deletes an owned mood-board item', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const itemResponse = await createMoodBoardItemRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const response = await request(app)
        .delete(
          `/api/v1/mood-boards/events/${eventResponse.body.data.id}/items/${itemResponse.body.data.id}`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(204);

      const storedItem = await prisma.moodBoardItem.findUnique({
        where: {
          id: itemResponse.body.data.id,
        },
      });

      expect(storedItem).toBeNull();
    });

    it('deletes mood-board items automatically when their event is deleted', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const itemResponse = await createMoodBoardItemRequest(
        accessToken,
        eventResponse.body.data.id,
      );

      const deleteResponse = await request(app)
        .delete(`/api/v1/events/${eventResponse.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(deleteResponse.status).toBe(204);

      const storedItem = await prisma.moodBoardItem.findUnique({
        where: {
          id: itemResponse.body.data.id,
        },
      });

      expect(storedItem).toBeNull();
    });

    it('keeps the item and clears vendorId when the linked vendor is deleted', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      await registerVendor();

      const accessToken = customerRegistration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const vendorId = await getVendorProfileId();

      const itemResponse = await createMoodBoardItemRequest(
        accessToken,
        eventResponse.body.data.id,
        {
          vendorId,
        },
      );

      await prisma.vendorProfile.delete({
        where: {
          id: vendorId,
        },
      });

      const storedItem = await prisma.moodBoardItem.findUnique({
        where: {
          id: itemResponse.body.data.id,
        },
      });

      expect(storedItem).not.toBeNull();
      expect(storedItem?.vendorId).toBeNull();
    });
  });

  describe('Mood-board summary', () => {
    it('returns zero totals when an event has no mood-board items', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await request(app)
        .get(`/api/v1/mood-boards/events/${eventResponse.body.data.id}/summary`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.event).toMatchObject({
        id: eventResponse.body.data.id,
        name: 'Maya and Arjun Wedding',
        eventDate: '2030-08-20T09:00:00.000Z',
        status: eventResponse.body.data.status,
      });

      expect(response.body.data.summary.totalItems).toBe(0);
      expect(response.body.data.summary.itemsWithImages).toBe(0);
      expect(response.body.data.summary.itemsWithSources).toBe(0);
      expect(response.body.data.summary.linkedVendorItems).toBe(0);

      for (const category of Object.values(MoodBoardCategory)) {
        expect(response.body.data.summary.categoryCounts[category]).toBe(0);
      }
    });

    it('calculates mood-board totals and category counts', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      await registerVendor();

      const accessToken = customerRegistration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);
      const eventId = eventResponse.body.data.id as string;

      const vendorId = await getVendorProfileId();

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Decoration one',
        category: MoodBoardCategory.DECORATION,
        vendorId,
      });

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Decoration two',
        category: MoodBoardCategory.DECORATION,
        sourceUrl: undefined,
      });

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Cake source',
        category: MoodBoardCategory.CAKE,
        imageUrl: undefined,
        imagePublicId: undefined,
        sourceUrl: 'https://example.com/cake-source',
      });

      await createMoodBoardItemRequest(accessToken, eventId, {
        title: 'Venue inspiration',
        category: MoodBoardCategory.VENUE,
        vendorId,
      });

      const response = await request(app)
        .get(`/api/v1/mood-boards/events/${eventId}/summary`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      expect(response.body.data.summary).toMatchObject({
        totalItems: 4,
        itemsWithImages: 3,
        itemsWithSources: 3,
        linkedVendorItems: 2,
      });

      expect(response.body.data.summary.categoryCounts[MoodBoardCategory.DECORATION]).toBe(2);

      expect(response.body.data.summary.categoryCounts[MoodBoardCategory.CAKE]).toBe(1);

      expect(response.body.data.summary.categoryCounts[MoodBoardCategory.VENUE]).toBe(1);

      expect(response.body.data.summary.categoryCounts[MoodBoardCategory.FLOWERS]).toBe(0);
    });
  });
});
