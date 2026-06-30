import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const customerEmail = 'event-customer@example.com';
const secondCustomerEmail = 'event-second-customer@example.com';
const vendorEmail = 'event-vendor@example.com';

const customerPayload = {
  email: customerEmail,
  password: 'Customer@2026',
  firstName: 'Maya',
  lastName: 'Fernando',
  phone: {
    country: 'LK',
    number: '0771234567',
  },
};

const secondCustomerPayload = {
  email: secondCustomerEmail,
  password: 'Customer@2026',
  firstName: 'Nila',
  lastName: 'Perera',
  phone: {
    country: 'LK',
    number: '0777654321',
  },
};

const vendorPayload = {
  email: vendorEmail,
  password: 'Vendor@2026',
  firstName: 'Test',
  lastName: 'Vendor',
  businessName: 'Event Test Vendor',
};

const clearTestUsers = async () => {
  const testEmails = [customerEmail, secondCustomerEmail, vendorEmail];

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

const registerCustomer = async (payload: typeof customerPayload | typeof secondCustomerPayload) => {
  return request(app).post('/api/v1/auth/register/customer').send(payload);
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
      plannedBudget: 2500000,
      theme: 'Classic Garden',
      requirements: 'Outdoor ceremony with photography, catering, decoration, and live music.',
      ...overrides,
    });
};

beforeEach(async () => {
  await clearTestUsers();
});

afterAll(async () => {
  await clearTestUsers();
  await prisma.$disconnect();
});

describe('Customer event management API', () => {
  describe('POST /api/v1/events', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).post('/api/v1/events').send({
        name: 'Maya and Arjun Wedding',
        eventType: 'Wedding',
        eventDate: '2030-08-20T09:00:00.000Z',
        location: 'Colombo',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const registrationResponse = await request(app)
        .post('/api/v1/auth/register/vendor')
        .send(vendorPayload);

      const response = await createEventRequest(registrationResponse.body.data.accessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('creates a draft event for a customer', async () => {
      const registrationResponse = await registerCustomer(customerPayload);

      const response = await createEventRequest(registrationResponse.body.data.accessToken);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        name: 'Maya and Arjun Wedding',
        eventType: 'Wedding',
        location: 'Colombo',
        guestCount: 250,
        plannedBudget: '2500000.00',
        theme: 'Classic Garden',
        status: 'DRAFT',
      });

      expect(response.body.data.id).toEqual(expect.any(String));
      expect(response.body.data.eventDate).toBe('2030-08-20T09:00:00.000Z');
      expect(response.body.data.createdAt).toEqual(expect.any(String));
      expect(response.body.data.updatedAt).toEqual(expect.any(String));
    });

    it('rejects an event date in the past', async () => {
      const registrationResponse = await registerCustomer(customerPayload);

      const response = await createEventRequest(registrationResponse.body.data.accessToken, {
        eventDate: '2020-01-01T09:00:00.000Z',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/events', () => {
    it('returns only events owned by the authenticated customer', async () => {
      const firstRegistration = await registerCustomer(customerPayload);

      const secondRegistration = await registerCustomer(secondCustomerPayload);

      await createEventRequest(firstRegistration.body.data.accessToken);

      await createEventRequest(secondRegistration.body.data.accessToken, {
        name: 'Second Customer Birthday',
        eventType: 'Birthday',
      });

      const response = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${firstRegistration.body.data.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Maya and Arjun Wedding');

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('filters events by status', async () => {
      const registrationResponse = await registerCustomer(customerPayload);

      const accessToken = registrationResponse.body.data.accessToken;

      const createdEvent = await createEventRequest(accessToken);

      await request(app)
        .patch(`/api/v1/events/${createdEvent.body.data.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'PLANNING',
        });

      const response = await request(app)
        .get('/api/v1/events?status=PLANNING')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('PLANNING');
    });

    it('rejects invalid list query parameters', async () => {
      const registrationResponse = await registerCustomer(customerPayload);

      const response = await request(app)
        .get('/api/v1/events?page=0&limit=100&sort=invalid')
        .set('Authorization', `Bearer ${registrationResponse.body.data.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/events/:eventId', () => {
    it('returns an owned event', async () => {
      const registrationResponse = await registerCustomer(customerPayload);

      const accessToken = registrationResponse.body.data.accessToken;

      const createdEvent = await createEventRequest(accessToken);

      const response = await request(app)
        .get(`/api/v1/events/${createdEvent.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(createdEvent.body.data.id);
    });

    it('hides another customer event', async () => {
      const firstRegistration = await registerCustomer(customerPayload);

      const secondRegistration = await registerCustomer(secondCustomerPayload);

      const createdEvent = await createEventRequest(firstRegistration.body.data.accessToken);

      const response = await request(app)
        .get(`/api/v1/events/${createdEvent.body.data.id}`)
        .set('Authorization', `Bearer ${secondRegistration.body.data.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('EVENT_NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/events/:eventId', () => {
    it('updates an owned event', async () => {
      const registrationResponse = await registerCustomer(customerPayload);

      const accessToken = registrationResponse.body.data.accessToken;

      const createdEvent = await createEventRequest(accessToken);

      const response = await request(app)
        .patch(`/api/v1/events/${createdEvent.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          location: 'Kandy',
          guestCount: 300,
          plannedBudget: 3000000,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        location: 'Kandy',
        guestCount: 300,
        plannedBudget: '3000000.00',
      });
    });

    it('rejects an empty update body', async () => {
      const registrationResponse = await registerCustomer(customerPayload);

      const accessToken = registrationResponse.body.data.accessToken;

      const createdEvent = await createEventRequest(accessToken);

      const response = await request(app)
        .patch(`/api/v1/events/${createdEvent.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/events/:eventId/status', () => {
    it('supports valid status transitions', async () => {
      const registrationResponse = await registerCustomer(customerPayload);

      const accessToken = registrationResponse.body.data.accessToken;

      const createdEvent = await createEventRequest(accessToken);

      const planningResponse = await request(app)
        .patch(`/api/v1/events/${createdEvent.body.data.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'PLANNING',
        });

      expect(planningResponse.status).toBe(200);
      expect(planningResponse.body.data.status).toBe('PLANNING');

      const activeResponse = await request(app)
        .patch(`/api/v1/events/${createdEvent.body.data.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'ACTIVE',
        });

      expect(activeResponse.status).toBe(200);
      expect(activeResponse.body.data.status).toBe('ACTIVE');
    });

    it('rejects an invalid status transition', async () => {
      const registrationResponse = await registerCustomer(customerPayload);

      const accessToken = registrationResponse.body.data.accessToken;

      const createdEvent = await createEventRequest(accessToken);

      const response = await request(app)
        .patch(`/api/v1/events/${createdEvent.body.data.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'COMPLETED',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_EVENT_STATUS_TRANSITION');
    });

    it('rejects setting the current status again', async () => {
      const registrationResponse = await registerCustomer(customerPayload);

      const accessToken = registrationResponse.body.data.accessToken;

      const createdEvent = await createEventRequest(accessToken);

      const response = await request(app)
        .patch(`/api/v1/events/${createdEvent.body.data.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'DRAFT',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('EVENT_STATUS_UNCHANGED');
    });
  });

  describe('DELETE /api/v1/events/:eventId', () => {
    it('deletes an owned draft event', async () => {
      const registrationResponse = await registerCustomer(customerPayload);

      const accessToken = registrationResponse.body.data.accessToken;

      const createdEvent = await createEventRequest(accessToken);

      const response = await request(app)
        .delete(`/api/v1/events/${createdEvent.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(204);

      const storedEvent = await prisma.event.findUnique({
        where: {
          id: createdEvent.body.data.id,
        },
      });

      expect(storedEvent).toBeNull();
    });

    it('rejects deleting an active event', async () => {
      const registrationResponse = await registerCustomer(customerPayload);

      const accessToken = registrationResponse.body.data.accessToken;

      const createdEvent = await createEventRequest(accessToken);

      await request(app)
        .patch(`/api/v1/events/${createdEvent.body.data.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'PLANNING',
        });

      await request(app)
        .patch(`/api/v1/events/${createdEvent.body.data.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: 'ACTIVE',
        });

      const response = await request(app)
        .delete(`/api/v1/events/${createdEvent.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('EVENT_CANNOT_BE_DELETED');
    });
  });
});
