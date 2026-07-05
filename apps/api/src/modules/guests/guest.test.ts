import { GuestStatus } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const customerEmail = 'guest-customer@example.com';
const secondCustomerEmail = 'guest-second-customer@example.com';
const vendorEmail = 'guest-vendor@example.com';

const customerPayload = {
  email: customerEmail,
  password: 'Customer@2026',
  firstName: 'Guest',
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
  firstName: 'Guest',
  lastName: 'Vendor',
  businessName: 'Guest Test Vendor',
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

const createGuestRequest = (
  accessToken: string,
  eventId: string,
  overrides: Record<string, unknown> = {},
) => {
  return request(app)
    .post(`/api/v1/guests/events/${eventId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      firstName: 'Nimal',
      lastName: 'Perera',
      email: 'nimal.perera@example.com',
      phone: '+94771234567',
      groupName: 'Bride Family',
      partySize: 2,
      mealPreference: 'Vegetarian',
      dietaryRequirements: 'No peanuts',
      notes: 'Seat near the main stage',
      ...overrides,
    });
};

const clearTestData = async () => {
  await prisma.notification.deleteMany({
    where: {
      recipient: {
        email: {
          in: testEmails,
        },
      },
    },
  });

  await prisma.payment.deleteMany({
    where: {
      OR: [
        {
          submittedBy: {
            email: {
              in: testEmails,
            },
          },
        },
        {
          booking: {
            event: {
              owner: {
                email: {
                  in: testEmails,
                },
              },
            },
          },
        },
      ],
    },
  });

  await prisma.review.deleteMany({
    where: {
      OR: [
        {
          customer: {
            email: {
              in: testEmails,
            },
          },
        },
        {
          vendor: {
            user: {
              email: {
                in: testEmails,
              },
            },
          },
        },
      ],
    },
  });

  await prisma.booking.deleteMany({
    where: {
      OR: [
        {
          event: {
            owner: {
              email: {
                in: testEmails,
              },
            },
          },
        },
        {
          vendor: {
            user: {
              email: {
                in: testEmails,
              },
            },
          },
        },
      ],
    },
  });

  await prisma.quotation.deleteMany({
    where: {
      quotationRequest: {
        OR: [
          {
            event: {
              owner: {
                email: {
                  in: testEmails,
                },
              },
            },
          },
          {
            vendor: {
              user: {
                email: {
                  in: testEmails,
                },
              },
            },
          },
        ],
      },
    },
  });

  await prisma.quotationRequest.deleteMany({
    where: {
      OR: [
        {
          event: {
            owner: {
              email: {
                in: testEmails,
              },
            },
          },
        },
        {
          vendor: {
            user: {
              email: {
                in: testEmails,
              },
            },
          },
        },
      ],
    },
  });

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

describe('Guest management and RSVP tracking API', () => {
  describe('Guest route access control', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).get(
        '/api/v1/guests/events/clx0000000000000000000000/summary',
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .get('/api/v1/guests/events/clx0000000000000000000000/summary')
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
        .get(`/api/v1/guests/events/${eventResponse.body.data.id}/summary`)
        .set('Authorization', `Bearer ${secondRegistration.body.data.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EVENT_NOT_FOUND');
    });

    it('hides another customer guest', async () => {
      const firstRegistration = await registerCustomer(customerPayload);
      const secondRegistration = await registerCustomer(secondCustomerPayload);

      const firstAccessToken = firstRegistration.body.data.accessToken as string;

      const secondAccessToken = secondRegistration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(firstAccessToken);

      const guestResponse = await createGuestRequest(firstAccessToken, eventResponse.body.data.id);

      const response = await request(app)
        .get(`/api/v1/guests/events/${eventResponse.body.data.id}/${guestResponse.body.data.id}`)
        .set('Authorization', `Bearer ${secondAccessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GUEST_NOT_FOUND');
    });
  });

  describe('Creating guests', () => {
    it('creates a guest for an owned event', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createGuestRequest(accessToken, eventResponse.body.data.id);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Guest created successfully');

      expect(response.body.data).toMatchObject({
        eventId: eventResponse.body.data.id,
        firstName: 'Nimal',
        lastName: 'Perera',
        email: 'nimal.perera@example.com',
        phone: '+94771234567',
        groupName: 'Bride Family',
        status: GuestStatus.NOT_INVITED,
        partySize: 2,
        mealPreference: 'Vegetarian',
        dietaryRequirements: 'No peanuts',
        notes: 'Seat near the main stage',
        invitedAt: null,
        respondedAt: null,
      });

      expect(response.body.data.id).toEqual(expect.any(String));
      expect(response.body.data.createdAt).toEqual(expect.any(String));
      expect(response.body.data.updatedAt).toEqual(expect.any(String));
    });

    it('uses default status and party size', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Kamal',
        lastName: 'Silva',
        email: 'kamal.silva@example.com',
        phone: undefined,
        groupName: undefined,
        partySize: undefined,
        mealPreference: undefined,
        dietaryRequirements: undefined,
        notes: undefined,
      });

      expect(response.status).toBe(201);

      expect(response.body.data).toMatchObject({
        firstName: 'Kamal',
        lastName: 'Silva',
        email: 'kamal.silva@example.com',
        phone: null,
        groupName: null,
        status: GuestStatus.NOT_INVITED,
        partySize: 1,
        mealPreference: null,
        dietaryRequirements: null,
        notes: null,
        invitedAt: null,
        respondedAt: null,
      });
    });

    it('allows guests without email or phone', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const firstResponse = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Child',
        lastName: 'Guest One',
        email: undefined,
        phone: undefined,
      });

      const secondResponse = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Child',
        lastName: 'Guest Two',
        email: undefined,
        phone: undefined,
      });

      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(201);

      expect(firstResponse.body.data.email).toBeNull();
      expect(firstResponse.body.data.phone).toBeNull();

      expect(secondResponse.body.data.email).toBeNull();
      expect(secondResponse.body.data.phone).toBeNull();
    });

    it('normalizes guest email casing and whitespace', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        email: '  NIMAL.PERERA@EXAMPLE.COM  ',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.email).toBe('nimal.perera@example.com');
    });

    it('sets invitedAt when created as invited', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        status: GuestStatus.INVITED,
      });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe(GuestStatus.INVITED);
      expect(response.body.data.invitedAt).toEqual(expect.any(String));
      expect(response.body.data.respondedAt).toBeNull();
    });

    it('sets invitedAt and respondedAt when created with a response', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        status: GuestStatus.CONFIRMED,
      });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe(GuestStatus.CONFIRMED);
      expect(response.body.data.invitedAt).toEqual(expect.any(String));
      expect(response.body.data.respondedAt).toEqual(expect.any(String));
    });

    it('rejects a duplicate non-null email within the same event', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Another',
        lastName: 'Guest',
        email: 'NIMAL.PERERA@EXAMPLE.COM',
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GUEST_EMAIL_ALREADY_EXISTS');
    });

    it('allows the same email in different events', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const firstEvent = await createEventRequest(accessToken);

      const secondEvent = await createEventRequest(accessToken, {
        name: 'Second Wedding',
        eventDate: '2030-09-20T09:00:00.000Z',
      });

      const firstGuest = await createGuestRequest(accessToken, firstEvent.body.data.id);

      const secondGuest = await createGuestRequest(accessToken, secondEvent.body.data.id);

      expect(firstGuest.status).toBe(201);
      expect(secondGuest.status).toBe(201);
    });

    it('allows duplicate guest names', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const firstResponse = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        email: 'first.nimal@example.com',
      });

      const secondResponse = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        email: 'second.nimal@example.com',
      });

      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(201);

      expect(firstResponse.body.data.firstName).toBe('Nimal');
      expect(secondResponse.body.data.firstName).toBe('Nimal');
    });

    it('rejects an invalid guest request body', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: '',
        lastName: '',
        email: 'not-an-email',
        status: 'ATTENDING',
        partySize: 0,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Listing and filtering guests', () => {
    it('lists guests with pagination', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createGuestRequest(accessToken, eventId, {
        firstName: 'First',
        lastName: 'Guest',
        email: 'first.guest@example.com',
      });

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Second',
        lastName: 'Guest',
        email: 'second.guest@example.com',
      });

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Third',
        lastName: 'Guest',
        email: 'third.guest@example.com',
      });

      const response = await request(app)
        .get(`/api/v1/guests/events/${eventId}?page=2&limit=2&sort=oldest`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].firstName).toBe('Third');

      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('filters guests by RSVP status', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Confirmed',
        lastName: 'Guest',
        email: 'confirmed@example.com',
        status: GuestStatus.CONFIRMED,
      });

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Declined',
        lastName: 'Guest',
        email: 'declined@example.com',
        status: GuestStatus.DECLINED,
      });

      const response = await request(app)
        .get(`/api/v1/guests/events/${eventId}?status=${GuestStatus.CONFIRMED}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe(GuestStatus.CONFIRMED);
    });

    it('filters guests by group name case-insensitively', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createGuestRequest(accessToken, eventId, {
        email: 'bride.family@example.com',
        groupName: 'Bride Family',
      });

      await createGuestRequest(accessToken, eventId, {
        email: 'friends@example.com',
        groupName: 'University Friends',
      });

      const response = await request(app)
        .get(`/api/v1/guests/events/${eventId}?groupName=bride%20family`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].groupName).toBe('Bride Family');
    });

    it('searches guest names, email, phone, and group name', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Kasun',
        lastName: 'Fernando',
        email: 'kasun.unique@example.com',
        phone: '+94770001122',
        groupName: 'Office Friends',
      });

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Amali',
        lastName: 'Silva',
        email: 'amali@example.com',
        phone: '+94773334455',
        groupName: 'Family',
      });

      const response = await request(app)
        .get(`/api/v1/guests/events/${eventId}?search=office`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].firstName).toBe('Kasun');
    });

    it('sorts guests by name', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Zara',
        lastName: 'Fernando',
        email: 'zara@example.com',
      });

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Amali',
        lastName: 'Silva',
        email: 'amali@example.com',
      });

      const response = await request(app)
        .get(`/api/v1/guests/events/${eventId}?sort=name_asc`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      expect(response.body.data.map((guest: { firstName: string }) => guest.firstName)).toEqual([
        'Amali',
        'Zara',
      ]);
    });

    it('sorts guests by party size', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Small',
        lastName: 'Party',
        email: 'small.party@example.com',
        partySize: 1,
      });

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Large',
        lastName: 'Party',
        email: 'large.party@example.com',
        partySize: 6,
      });

      const response = await request(app)
        .get(`/api/v1/guests/events/${eventId}?sort=party_size_highest`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      expect(response.body.data.map((guest: { partySize: number }) => guest.partySize)).toEqual([
        6, 1,
      ]);
    });

    it('rejects invalid guest query parameters', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await request(app)
        .get(
          `/api/v1/guests/events/${eventResponse.body.data.id}?page=0&limit=100&status=ATTENDING&sort=invalid`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Getting and updating guests', () => {
    it('gets an owned guest by ID', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .get(`/api/v1/guests/events/${eventResponse.body.data.id}/${guestResponse.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(guestResponse.body.data.id);
      expect(response.body.data.firstName).toBe('Nimal');
    });

    it('updates guest details', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .patch(`/api/v1/guests/events/${eventResponse.body.data.id}/${guestResponse.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Guest',
          email: 'UPDATED.GUEST@EXAMPLE.COM',
          phone: '+94779999999',
          groupName: 'VIP Guests',
          partySize: 4,
          mealPreference: 'Vegan',
          dietaryRequirements: 'Gluten free',
          notes: 'Provide reserved seating',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Guest updated successfully');

      expect(response.body.data).toMatchObject({
        firstName: 'Updated',
        lastName: 'Guest',
        email: 'updated.guest@example.com',
        phone: '+94779999999',
        groupName: 'VIP Guests',
        partySize: 4,
        mealPreference: 'Vegan',
        dietaryRequirements: 'Gluten free',
        notes: 'Provide reserved seating',
      });
    });

    it('clears optional guest fields using null', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .patch(`/api/v1/guests/events/${eventResponse.body.data.id}/${guestResponse.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: null,
          phone: null,
          groupName: null,
          mealPreference: null,
          dietaryRequirements: null,
          notes: null,
        });

      expect(response.status).toBe(200);

      expect(response.body.data).toMatchObject({
        email: null,
        phone: null,
        groupName: null,
        mealPreference: null,
        dietaryRequirements: null,
        notes: null,
      });
    });

    it('rejects updating to another guest email', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const firstGuest = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        email: 'first@example.com',
      });

      await createGuestRequest(accessToken, eventResponse.body.data.id, {
        email: 'second@example.com',
      });

      const response = await request(app)
        .patch(`/api/v1/guests/events/${eventResponse.body.data.id}/${firstGuest.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'SECOND@EXAMPLE.COM',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GUEST_EMAIL_ALREADY_EXISTS');
    });

    it('rejects an empty guest update', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .patch(`/api/v1/guests/events/${eventResponse.body.data.id}/${guestResponse.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Updating guest RSVP status', () => {
    it('marks a guest as invited and sets invitedAt', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .patch(
          `/api/v1/guests/events/${eventResponse.body.data.id}/${guestResponse.body.data.id}/rsvp`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: GuestStatus.INVITED,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Guest RSVP status updated successfully');

      expect(response.body.data.status).toBe(GuestStatus.INVITED);
      expect(response.body.data.invitedAt).toEqual(expect.any(String));
      expect(response.body.data.respondedAt).toBeNull();
    });

    it('marks an invited guest as confirmed and sets respondedAt', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        status: GuestStatus.INVITED,
      });

      const originalInvitedAt = guestResponse.body.data.invitedAt;

      const response = await request(app)
        .patch(
          `/api/v1/guests/events/${eventResponse.body.data.id}/${guestResponse.body.data.id}/rsvp`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: GuestStatus.CONFIRMED,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(GuestStatus.CONFIRMED);

      expect(response.body.data.invitedAt).toBe(originalInvitedAt);
      expect(response.body.data.respondedAt).toEqual(expect.any(String));
    });

    it('creates invitation and response timestamps when directly responding', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .patch(
          `/api/v1/guests/events/${eventResponse.body.data.id}/${guestResponse.body.data.id}/rsvp`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: GuestStatus.MAYBE,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(GuestStatus.MAYBE);
      expect(response.body.data.invitedAt).toEqual(expect.any(String));
      expect(response.body.data.respondedAt).toEqual(expect.any(String));
    });

    it('clears invitation and response timestamps when reset to not invited', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        status: GuestStatus.CONFIRMED,
      });

      const response = await request(app)
        .patch(
          `/api/v1/guests/events/${eventResponse.body.data.id}/${guestResponse.body.data.id}/rsvp`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: GuestStatus.NOT_INVITED,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(GuestStatus.NOT_INVITED);

      expect(response.body.data.invitedAt).toBeNull();
      expect(response.body.data.respondedAt).toBeNull();
    });

    it('clears respondedAt when a response is changed back to invited', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        status: GuestStatus.DECLINED,
      });

      const originalInvitedAt = guestResponse.body.data.invitedAt;

      const response = await request(app)
        .patch(
          `/api/v1/guests/events/${eventResponse.body.data.id}/${guestResponse.body.data.id}/rsvp`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: GuestStatus.INVITED,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(GuestStatus.INVITED);
      expect(response.body.data.invitedAt).toBe(originalInvitedAt);
      expect(response.body.data.respondedAt).toBeNull();
    });

    it('rejects an unchanged RSVP status', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        status: GuestStatus.INVITED,
      });

      const response = await request(app)
        .patch(
          `/api/v1/guests/events/${eventResponse.body.data.id}/${guestResponse.body.data.id}/rsvp`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: GuestStatus.INVITED,
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GUEST_STATUS_UNCHANGED');
    });
  });

  describe('Deleting guests', () => {
    it('deletes an owned guest', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await request(app)
        .delete(`/api/v1/guests/events/${eventResponse.body.data.id}/${guestResponse.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(204);

      const storedGuest = await prisma.guest.findUnique({
        where: {
          id: guestResponse.body.data.id,
        },
      });

      expect(storedGuest).toBeNull();
    });

    it('deletes guests automatically when their event is deleted', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const deleteResponse = await request(app)
        .delete(`/api/v1/events/${eventResponse.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(deleteResponse.status).toBe(204);

      const storedGuest = await prisma.guest.findUnique({
        where: {
          id: guestResponse.body.data.id,
        },
      });

      expect(storedGuest).toBeNull();
    });
  });

  describe('Guest summary', () => {
    it('returns zero totals when an event has no guests', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const response = await request(app)
        .get(`/api/v1/guests/events/${eventResponse.body.data.id}/summary`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.event).toMatchObject({
        id: eventResponse.body.data.id,
        name: 'Maya and Arjun Wedding',
        eventDate: '2030-08-20T09:00:00.000Z',
        status: eventResponse.body.data.status,
        plannedGuestCount: 250,
      });

      expect(response.body.data.summary).toEqual({
        totalGuests: 0,
        totalExpectedAttendees: 0,
        notInvited: 0,
        invited: 0,
        confirmed: 0,
        declined: 0,
        maybe: 0,
        confirmedAttendees: 0,
        invitedGuests: 0,
        respondedGuests: 0,
        responseRate: 0,
      });
    });

    it('calculates guest and attendance totals', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Not',
        lastName: 'Invited',
        email: 'not.invited@example.com',
        status: GuestStatus.NOT_INVITED,
        partySize: 2,
      });

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Invited',
        lastName: 'Guest',
        email: 'invited@example.com',
        status: GuestStatus.INVITED,
        partySize: 3,
      });

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Confirmed',
        lastName: 'Guest',
        email: 'confirmed@example.com',
        status: GuestStatus.CONFIRMED,
        partySize: 4,
      });

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Declined',
        lastName: 'Guest',
        email: 'declined@example.com',
        status: GuestStatus.DECLINED,
        partySize: 5,
      });

      await createGuestRequest(accessToken, eventId, {
        firstName: 'Maybe',
        lastName: 'Guest',
        email: 'maybe@example.com',
        status: GuestStatus.MAYBE,
        partySize: 2,
      });

      const response = await request(app)
        .get(`/api/v1/guests/events/${eventId}/summary`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      expect(response.body.data.summary).toEqual({
        totalGuests: 5,
        totalExpectedAttendees: 11,
        notInvited: 1,
        invited: 1,
        confirmed: 1,
        declined: 1,
        maybe: 1,
        confirmedAttendees: 4,
        invitedGuests: 4,
        respondedGuests: 3,
        responseRate: 75,
      });
    });

    it('calculates a decimal response rate', async () => {
      const registration = await registerCustomer(customerPayload);

      const accessToken = registration.body.data.accessToken as string;

      const eventResponse = await createEventRequest(accessToken);

      const eventId = eventResponse.body.data.id as string;

      await createGuestRequest(accessToken, eventId, {
        email: 'confirmed@example.com',
        status: GuestStatus.CONFIRMED,
      });

      await createGuestRequest(accessToken, eventId, {
        email: 'invited-one@example.com',
        status: GuestStatus.INVITED,
      });

      await createGuestRequest(accessToken, eventId, {
        email: 'invited-two@example.com',
        status: GuestStatus.INVITED,
      });

      const response = await request(app)
        .get(`/api/v1/guests/events/${eventId}/summary`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.summary.invitedGuests).toBe(3);
      expect(response.body.data.summary.respondedGuests).toBe(1);
      expect(response.body.data.summary.responseRate).toBe(33.33);
    });
  });
});
