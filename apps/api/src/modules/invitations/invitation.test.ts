import { createHash } from 'node:crypto';
import { GuestStatus } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const customerEmail = 'invitation-customer@example.com';
const secondCustomerEmail = 'invitation-second-customer@example.com';
const vendorEmail = 'invitation-vendor@example.com';

const customerPayload = {
  email: customerEmail,
  password: 'Customer@2026',
  firstName: 'Invitation',
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
  firstName: 'Invitation',
  lastName: 'Vendor',
  businessName: 'Invitation Test Vendor',
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
      name: 'Invitation Test Wedding',
      eventType: 'Wedding',
      eventDate: '2030-08-20T09:00:00.000Z',
      location: 'Colombo',
      guestCount: 200,
      plannedBudget: 1000000,
      theme: 'Garden',
      requirements: 'Wedding event used for invitation integration tests.',
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
      firstName: 'Maya',
      lastName: 'Perera',
      email: 'maya.perera@example.com',
      phone: '+94771234567',
      groupName: 'Family',
      partySize: 2,
      mealPreference: 'Vegetarian',
      dietaryRequirements: 'No peanuts',
      notes: 'Bride family',
      ...overrides,
    });
};

const createInvitationRequest = (
  accessToken: string,
  eventId: string,
  guestId: string,
  overrides: Record<string, unknown> = {},
) => {
  return request(app)
    .post(`/api/v1/invitations/events/${eventId}/guests/${guestId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      ...overrides,
    });
};

const regenerateInvitationRequest = (
  accessToken: string,
  eventId: string,
  guestId: string,
  overrides: Record<string, unknown> = {},
) => {
  return request(app)
    .post(`/api/v1/invitations/events/${eventId}/guests/${guestId}/regenerate`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      ...overrides,
    });
};

const revokeInvitationRequest = (accessToken: string, eventId: string, guestId: string) => {
  return request(app)
    .patch(`/api/v1/invitations/events/${eventId}/guests/${guestId}/revoke`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getInvitationRequest = (accessToken: string, eventId: string, guestId: string) => {
  return request(app)
    .get(`/api/v1/invitations/events/${eventId}/guests/${guestId}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getEventInvitationsRequest = (accessToken: string, eventId: string, query = '') => {
  return request(app)
    .get(`/api/v1/invitations/events/${eventId}${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getPublicInvitationRequest = (token: string) => {
  return request(app).get(`/api/v1/invitations/respond/${token}`);
};

const submitPublicRsvpRequest = (token: string, overrides: Record<string, unknown> = {}) => {
  return request(app)
    .post(`/api/v1/invitations/respond/${token}`)
    .send({
      status: GuestStatus.CONFIRMED,
      partySize: 2,
      mealPreference: 'Vegetarian',
      dietaryRequirements: 'No peanuts',
      ...overrides,
    });
};

const getCreatedToken = (response: request.Response): string => {
  const token = response.body.data?.token;

  expect(typeof token).toBe('string');
  expect(token.length).toBeGreaterThanOrEqual(32);

  return token;
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

describe('Invitation and public RSVP API', () => {
  describe('Invitation route access control', () => {
    it('rejects protected requests without authentication', async () => {
      const response = await request(app).get(
        '/api/v1/invitations/events/clx0000000000000000000000',
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .get('/api/v1/invitations/events/clx0000000000000000000000')
        .set('Authorization', `Bearer ${vendorRegistration.body.data.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('hides another customer event', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const secondRegistration = await registerCustomer(secondCustomerPayload);

      const eventResponse = await createEventRequest(customerRegistration.body.data.accessToken);

      const response = await getEventInvitationsRequest(
        secondRegistration.body.data.accessToken,
        eventResponse.body.data.id,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('hides another customer guest', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const secondRegistration = await registerCustomer(secondCustomerPayload);

      const eventResponse = await createEventRequest(customerRegistration.body.data.accessToken);

      const guestResponse = await createGuestRequest(
        customerRegistration.body.data.accessToken,
        eventResponse.body.data.id,
      );

      const response = await createInvitationRequest(
        secondRegistration.body.data.accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('keeps public invitation routes unauthenticated', async () => {
      const response = await getPublicInvitationRequest('x'.repeat(32));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Creating invitations', () => {
    it('creates an invitation for an owned guest', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitation created successfully');

      const token = getCreatedToken(response);

      expect(response.body.data.invitationUrl).toContain(token);
      expect(response.body.data.guestId).toBe(guestResponse.body.data.id);
      expect(response.body.data.revokedAt).toBeNull();
      expect(new Date(response.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('stores only the SHA-256 token hash', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      expect(response.status).toBe(201);

      const token = getCreatedToken(response);
      const tokenHash = createHash('sha256').update(token).digest('hex');

      const storedInvitation = await prisma.eventInvitation.findUnique({
        where: {
          guestId: guestResponse.body.data.id,
        },
      });

      expect(storedInvitation).not.toBeNull();
      expect(storedInvitation?.tokenHash).toBe(tokenHash);
      expect(storedInvitation?.tokenHash).not.toBe(token);
    });

    it('uses the default fourteen-day expiration', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const beforeCreation = Date.now();

      const response = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const expirationTime = new Date(response.body.data.expiresAt).getTime();

      const expectedMinimum = beforeCreation + 13.9 * 24 * 60 * 60 * 1000;
      const expectedMaximum = beforeCreation + 14.1 * 24 * 60 * 60 * 1000;

      expect(expirationTime).toBeGreaterThan(expectedMinimum);
      expect(expirationTime).toBeLessThan(expectedMaximum);
    });

    it('supports a custom expiration period', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const beforeCreation = Date.now();

      const response = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
        {
          expiresInDays: 5,
        },
      );

      expect(response.status).toBe(201);

      const expirationTime = new Date(response.body.data.expiresAt).getTime();

      const expectedMinimum = beforeCreation + 4.9 * 24 * 60 * 60 * 1000;
      const expectedMaximum = beforeCreation + 5.1 * 24 * 60 * 60 * 1000;

      expect(expirationTime).toBeGreaterThan(expectedMinimum);
      expect(expirationTime).toBeLessThan(expectedMaximum);
    });

    it('marks the guest as invited', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      expect(response.status).toBe(201);

      const guest = await prisma.guest.findUnique({
        where: {
          id: guestResponse.body.data.id,
        },
      });

      expect(guest?.status).toBe(GuestStatus.INVITED);
      expect(guest?.invitedAt).not.toBeNull();
      expect(guest?.respondedAt).toBeNull();
    });

    it('rejects creating a second invitation for the same guest', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const response = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('rejects invalid expiration values', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
        {
          expiresInDays: 31,
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Getting invitations', () => {
    it('gets invitation details for the customer', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const creationResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const response = await getInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(creationResponse.body.data.id);
      expect(response.body.data.guestId).toBe(guestResponse.body.data.id);
      expect(response.body.data).not.toHaveProperty('tokenHash');
      expect(response.body.data).not.toHaveProperty('token');
    });

    it('returns 404 when the guest has no invitation', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await getInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('allows the guest to view an active public invitation', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const creationResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const token = getCreatedToken(creationResponse);

      const response = await getPublicInvitationRequest(token);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.guest.id).toBe(guestResponse.body.data.id);
      expect(response.body.data.guest.firstName).toBe('Maya');
      expect(response.body.data.event.id).toBe(eventResponse.body.data.id);
      expect(response.body.data).not.toHaveProperty('tokenHash');
    });

    it('returns 404 for an invalid public token', async () => {
      const response = await getPublicInvitationRequest('a'.repeat(64));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Submitting public RSVP responses', () => {
    it('confirms attendance through the public link', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const invitationResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const token = getCreatedToken(invitationResponse);

      const response = await submitPublicRsvpRequest(token);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('RSVP submitted successfully');

      const guest = await prisma.guest.findUnique({
        where: {
          id: guestResponse.body.data.id,
        },
      });

      expect(guest?.status).toBe(GuestStatus.CONFIRMED);
      expect(guest?.partySize).toBe(2);
      expect(guest?.mealPreference).toBe('Vegetarian');
      expect(guest?.dietaryRequirements).toBe('No peanuts');
      expect(guest?.invitedAt).not.toBeNull();
      expect(guest?.respondedAt).not.toBeNull();
    });

    it('allows a guest to decline', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const invitationResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const token = getCreatedToken(invitationResponse);

      const response = await submitPublicRsvpRequest(token, {
        status: GuestStatus.DECLINED,
        partySize: 1,
        mealPreference: null,
        dietaryRequirements: null,
      });

      expect(response.status).toBe(200);

      const guest = await prisma.guest.findUnique({
        where: {
          id: guestResponse.body.data.id,
        },
      });

      expect(guest?.status).toBe(GuestStatus.DECLINED);
      expect(guest?.partySize).toBe(1);
      expect(guest?.respondedAt).not.toBeNull();
    });

    it('allows a maybe response', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const invitationResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const token = getCreatedToken(invitationResponse);

      const response = await submitPublicRsvpRequest(token, {
        status: GuestStatus.MAYBE,
        partySize: 3,
      });

      expect(response.status).toBe(200);

      const guest = await prisma.guest.findUnique({
        where: {
          id: guestResponse.body.data.id,
        },
      });

      expect(guest?.status).toBe(GuestStatus.MAYBE);
      expect(guest?.partySize).toBe(3);
    });

    it('allows a guest to update an earlier response', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const invitationResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const token = getCreatedToken(invitationResponse);

      await submitPublicRsvpRequest(token, {
        status: GuestStatus.MAYBE,
        partySize: 2,
      });

      const response = await submitPublicRsvpRequest(token, {
        status: GuestStatus.CONFIRMED,
        partySize: 4,
        mealPreference: 'Vegan',
        dietaryRequirements: 'Gluten free',
      });

      expect(response.status).toBe(200);

      const guest = await prisma.guest.findUnique({
        where: {
          id: guestResponse.body.data.id,
        },
      });

      expect(guest?.status).toBe(GuestStatus.CONFIRMED);
      expect(guest?.partySize).toBe(4);
      expect(guest?.mealPreference).toBe('Vegan');
      expect(guest?.dietaryRequirements).toBe('Gluten free');
    });

    it('rejects unsupported RSVP statuses', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const invitationResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const token = getCreatedToken(invitationResponse);

      const response = await submitPublicRsvpRequest(token, {
        status: GuestStatus.INVITED,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('rejects an invalid party size', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const invitationResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const token = getCreatedToken(invitationResponse);

      const response = await submitPublicRsvpRequest(token, {
        partySize: 0,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Regenerating invitations', () => {
    it('regenerates an invitation with a new token', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const firstResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const firstToken = getCreatedToken(firstResponse);

      const secondResponse = await regenerateInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
        {
          expiresInDays: 7,
        },
      );

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.success).toBe(true);
      expect(secondResponse.body.message).toBe('Invitation regenerated successfully');

      const secondToken = getCreatedToken(secondResponse);

      expect(secondToken).not.toBe(firstToken);

      const storedInvitation = await prisma.eventInvitation.findUnique({
        where: {
          guestId: guestResponse.body.data.id,
        },
      });

      expect(storedInvitation?.tokenHash).toBe(
        createHash('sha256').update(secondToken).digest('hex'),
      );
    });

    it('invalidates the previous token', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const firstResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const firstToken = getCreatedToken(firstResponse);

      const secondResponse = await regenerateInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const secondToken = getCreatedToken(secondResponse);

      const oldTokenResponse = await getPublicInvitationRequest(firstToken);
      const newTokenResponse = await getPublicInvitationRequest(secondToken);

      expect(oldTokenResponse.status).toBe(404);
      expect(newTokenResponse.status).toBe(200);
    });

    it('resets the guest to invited', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const invitationResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const token = getCreatedToken(invitationResponse);

      await submitPublicRsvpRequest(token, {
        status: GuestStatus.CONFIRMED,
      });

      const response = await regenerateInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      expect(response.status).toBe(200);

      const guest = await prisma.guest.findUnique({
        where: {
          id: guestResponse.body.data.id,
        },
      });

      expect(guest?.status).toBe(GuestStatus.INVITED);
      expect(guest?.invitedAt).not.toBeNull();
      expect(guest?.respondedAt).toBeNull();
    });

    it('returns 404 when regenerating a missing invitation', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const response = await regenerateInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Revoking and expiring invitations', () => {
    it('revokes an active invitation', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const response = await revokeInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitation revoked successfully');
      expect(response.body.data.revokedAt).not.toBeNull();
    });

    it('returns 410 when viewing a revoked public invitation', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const creationResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const token = getCreatedToken(creationResponse);

      await revokeInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const response = await getPublicInvitationRequest(token);

      expect(response.status).toBe(410);
      expect(response.body.success).toBe(false);
    });

    it('returns 410 when submitting through a revoked invitation', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const creationResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const token = getCreatedToken(creationResponse);

      await revokeInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const response = await submitPublicRsvpRequest(token);

      expect(response.status).toBe(410);
      expect(response.body.success).toBe(false);
    });

    it('does not change the existing RSVP when revoked', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const creationResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const token = getCreatedToken(creationResponse);

      await submitPublicRsvpRequest(token, {
        status: GuestStatus.CONFIRMED,
        partySize: 3,
      });

      await revokeInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const guest = await prisma.guest.findUnique({
        where: {
          id: guestResponse.body.data.id,
        },
      });

      expect(guest?.status).toBe(GuestStatus.CONFIRMED);
      expect(guest?.partySize).toBe(3);
      expect(guest?.respondedAt).not.toBeNull();
    });

    it('returns 410 for an expired invitation', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      const creationResponse = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      const token = getCreatedToken(creationResponse);

      await prisma.eventInvitation.update({
        where: {
          guestId: guestResponse.body.data.id,
        },
        data: {
          expiresAt: new Date(Date.now() - 60_000),
        },
      });

      const response = await getPublicInvitationRequest(token);

      expect(response.status).toBe(410);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Listing invitations', () => {
    it('lists invitations with pagination', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);

      const firstGuest = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Maya',
        lastName: 'Perera',
        email: 'maya.list@example.com',
      });

      const secondGuest = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Arjun',
        lastName: 'Silva',
        email: 'arjun.list@example.com',
      });

      await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        firstGuest.body.data.id,
      );

      await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        secondGuest.body.data.id,
      );

      const response = await getEventInvitationsRequest(
        accessToken,
        eventResponse.body.data.id,
        '?page=1&limit=1',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.total).toBe(2);
      expect(response.body.pagination.totalPages).toBe(2);
    });

    it('searches invitations by guest details', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);

      const mayaGuest = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Maya',
        lastName: 'Perera',
        email: 'maya.search@example.com',
      });

      const arjunGuest = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Arjun',
        lastName: 'Silva',
        email: 'arjun.search@example.com',
      });

      await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        mayaGuest.body.data.id,
      );

      await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        arjunGuest.body.data.id,
      );

      const response = await getEventInvitationsRequest(
        accessToken,
        eventResponse.body.data.id,
        '?search=maya',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].guest.firstName).toBe('Maya');
    });

    it('filters active invitations', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);

      const activeGuest = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Active',
        lastName: 'Guest',
        email: 'active.invitation@example.com',
      });

      const revokedGuest = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Revoked',
        lastName: 'Guest',
        email: 'revoked.invitation@example.com',
      });

      await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        activeGuest.body.data.id,
      );

      await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        revokedGuest.body.data.id,
      );

      await revokeInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        revokedGuest.body.data.id,
      );

      const response = await getEventInvitationsRequest(
        accessToken,
        eventResponse.body.data.id,
        '?status=active',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].guest.id).toBe(activeGuest.body.data.id);
    });

    it('filters responded invitations', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);

      const respondedGuest = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Responded',
        lastName: 'Guest',
        email: 'responded.invitation@example.com',
      });

      const waitingGuest = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Waiting',
        lastName: 'Guest',
        email: 'waiting.invitation@example.com',
      });

      const respondedInvitation = await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        respondedGuest.body.data.id,
      );

      await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        waitingGuest.body.data.id,
      );

      await submitPublicRsvpRequest(getCreatedToken(respondedInvitation));

      const response = await getEventInvitationsRequest(
        accessToken,
        eventResponse.body.data.id,
        '?status=responded',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].guest.id).toBe(respondedGuest.body.data.id);
    });

    it('sorts invitations by guest name', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);

      const zaraGuest = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Zara',
        lastName: 'Fernando',
        email: 'zara.sort@example.com',
      });

      const arjunGuest = await createGuestRequest(accessToken, eventResponse.body.data.id, {
        firstName: 'Arjun',
        lastName: 'Silva',
        email: 'arjun.sort@example.com',
      });

      await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        zaraGuest.body.data.id,
      );

      await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        arjunGuest.body.data.id,
      );

      const response = await getEventInvitationsRequest(
        accessToken,
        eventResponse.body.data.id,
        '?sort=guest_name_asc',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].guest.firstName).toBe('Arjun');
      expect(response.body.data[1].guest.firstName).toBe('Zara');
    });

    it('rejects invalid list query parameters', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);

      const response = await getEventInvitationsRequest(
        accessToken,
        eventResponse.body.data.id,
        '?page=0&limit=100&status=unknown&sort=invalid',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Invitation cascade deletion', () => {
    it('deletes the invitation when its guest is deleted', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      await request(app)
        .delete(`/api/v1/guests/events/${eventResponse.body.data.id}/${guestResponse.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      const invitation = await prisma.eventInvitation.findUnique({
        where: {
          guestId: guestResponse.body.data.id,
        },
      });

      expect(invitation).toBeNull();
    });

    it('deletes invitations when the event is deleted', async () => {
      const registration = await registerCustomer(customerPayload);
      const accessToken = registration.body.data.accessToken;

      const eventResponse = await createEventRequest(accessToken);
      const guestResponse = await createGuestRequest(accessToken, eventResponse.body.data.id);

      await createInvitationRequest(
        accessToken,
        eventResponse.body.data.id,
        guestResponse.body.data.id,
      );

      await request(app)
        .delete(`/api/v1/events/${eventResponse.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      const invitation = await prisma.eventInvitation.findUnique({
        where: {
          guestId: guestResponse.body.data.id,
        },
      });

      expect(invitation).toBeNull();
    });
  });
});
