import request from 'supertest';
import {
  AccountStatus,
  UserRole,
  VendorVerificationStatus,
} from '@prisma/client';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const vendorEmail = 'availability-vendor@example.com';
const secondVendorEmail = 'availability-second-vendor@example.com';
const customerEmail = 'availability-customer@example.com';

const vendorPayload = {
  email: vendorEmail,
  password: 'Vendor@2026',
  firstName: 'Nila',
  lastName: 'Perera',
  businessName: 'Availability Events',
};

const secondVendorPayload = {
  email: secondVendorEmail,
  password: 'Vendor@2026',
  firstName: 'Ravi',
  lastName: 'Fernando',
  businessName: 'Second Availability Events',
};

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

const availabilityQuery =
  '?from=2030-08-01T00:00:00.000Z&to=2030-09-01T00:00:00.000Z';

const clearAvailabilityTestData = async () => {
  const emails = [
    vendorEmail,
    secondVendorEmail,
    customerEmail,
  ];

  await prisma.vendorAvailabilityBlock.deleteMany({
    where: {
      vendor: {
        user: {
          email: {
            in: emails,
          },
        },
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: emails,
      },
    },
  });
};

const registerVendor = async (
  payload: typeof vendorPayload | typeof secondVendorPayload,
) => {
  const response = await request(app)
    .post('/api/v1/auth/register/vendor')
    .send(payload);

  if (response.status !== 201) {
    throw new Error(
      `Vendor registration failed with status ${response.status}`,
    );
  }

  return response.body.data.accessToken as string;
};

const approveVendor = async (email: string) => {
  const vendor = await prisma.vendorProfile.findFirst({
    where: {
      user: {
        email,
      },
    },
    select: {
      id: true,
    },
  });

  if (!vendor) {
    throw new Error(
      `Vendor profile for "${email}" was not found`,
    );
  }

  return prisma.vendorProfile.update({
    where: {
      id: vendor.id,
    },
    data: {
      verificationStatus:
        VendorVerificationStatus.APPROVED,
      submittedAt: new Date(),
      reviewedAt: new Date(),
      rejectionReason: null,
    },
  });
};

const createAvailabilityBlockRequest = (
  accessToken: string,
  body: Record<string, unknown>,
) => {
  return request(app)
    .post('/api/v1/vendors/me/availability/blocks')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

const getVendorAvailabilityRequest = (
  accessToken: string,
  query = availabilityQuery,
) => {
  return request(app)
    .get(`/api/v1/vendors/me/availability${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

beforeEach(async () => {
  await clearAvailabilityTestData();
});

afterAll(async () => {
  await clearAvailabilityTestData();
  await prisma.$disconnect();
});

describe('Vendor availability API', () => {
  describe('Protected vendor availability routes', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).get(
        `/api/v1/vendors/me/availability${availabilityQuery}`,
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated customers', async () => {
      const registrationResponse = await request(app)
        .post('/api/v1/auth/register/customer')
        .send(customerPayload);

      const accessToken =
        registrationResponse.body.data.accessToken as string;

      const response = await getVendorAvailabilityRequest(
        accessToken,
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects an invalid availability date range', async () => {
      const accessToken = await registerVendor(vendorPayload);

      const response = await getVendorAvailabilityRequest(
        accessToken,
        '?from=2030-09-01T00:00:00.000Z&to=2030-08-01T00:00:00.000Z',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/vendors/me/availability/blocks', () => {
    it('creates an availability block for the authenticated vendor', async () => {
      const accessToken = await registerVendor(vendorPayload);

      const response = await createAvailabilityBlockRequest(
        accessToken,
        {
          startsAt: '2030-08-10T08:00:00.000Z',
          endsAt: '2030-08-10T12:00:00.000Z',
          reason: 'Private family event',
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        startsAt: '2030-08-10T08:00:00.000Z',
        endsAt: '2030-08-10T12:00:00.000Z',
        reason: 'Private family event',
      });

      expect(response.body.data.id).toEqual(
        expect.any(String),
      );
    });

    it('rejects an availability block whose end is not after its start', async () => {
      const accessToken = await registerVendor(vendorPayload);

      const response = await createAvailabilityBlockRequest(
        accessToken,
        {
          startsAt: '2030-08-10T12:00:00.000Z',
          endsAt: '2030-08-10T08:00:00.000Z',
          reason: 'Invalid range',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a block that overlaps an existing block', async () => {
      const accessToken = await registerVendor(vendorPayload);

      await createAvailabilityBlockRequest(accessToken, {
        startsAt: '2030-08-10T08:00:00.000Z',
        endsAt: '2030-08-10T12:00:00.000Z',
        reason: 'Morning block',
      });

      const response = await createAvailabilityBlockRequest(
        accessToken,
        {
          startsAt: '2030-08-10T10:00:00.000Z',
          endsAt: '2030-08-10T14:00:00.000Z',
          reason: 'Overlapping block',
        },
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'AVAILABILITY_BLOCK_CONFLICT',
      );
    });

    it('allows a block that begins exactly when another block ends', async () => {
      const accessToken = await registerVendor(vendorPayload);

      await createAvailabilityBlockRequest(accessToken, {
        startsAt: '2030-08-10T08:00:00.000Z',
        endsAt: '2030-08-10T12:00:00.000Z',
        reason: 'Morning block',
      });

      const response = await createAvailabilityBlockRequest(
        accessToken,
        {
          startsAt: '2030-08-10T12:00:00.000Z',
          endsAt: '2030-08-10T16:00:00.000Z',
          reason: 'Afternoon block',
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.startsAt).toBe(
        '2030-08-10T12:00:00.000Z',
      );
    });
  });

  describe('GET /api/v1/vendors/me/availability', () => {
    it('returns the authenticated vendor own blocks', async () => {
      const accessToken = await registerVendor(vendorPayload);

      await createAvailabilityBlockRequest(accessToken, {
        startsAt: '2030-08-15T09:00:00.000Z',
        endsAt: '2030-08-15T13:00:00.000Z',
        reason: 'Equipment maintenance',
      });

      const response = await getVendorAvailabilityRequest(
        accessToken,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.range).toEqual({
        from: '2030-08-01T00:00:00.000Z',
        to: '2030-09-01T00:00:00.000Z',
      });

      expect(response.body.data.blocks).toHaveLength(1);
      expect(response.body.data.blocks[0]).toMatchObject({
        startsAt: '2030-08-15T09:00:00.000Z',
        endsAt: '2030-08-15T13:00:00.000Z',
        reason: 'Equipment maintenance',
      });

      expect(response.body.data.bookings).toEqual([]);
    });

    it('does not return blocks outside the requested range', async () => {
      const accessToken = await registerVendor(vendorPayload);

      await createAvailabilityBlockRequest(accessToken, {
        startsAt: '2030-10-10T09:00:00.000Z',
        endsAt: '2030-10-10T13:00:00.000Z',
        reason: 'Outside requested range',
      });

      const response = await getVendorAvailabilityRequest(
        accessToken,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.blocks).toEqual([]);
    });
  });

  describe('GET /api/v1/vendors/:slug/availability', () => {
    it('returns unavailable ranges for an approved public vendor', async () => {
      const accessToken = await registerVendor(vendorPayload);
      const vendor = await approveVendor(vendorEmail);

      await createAvailabilityBlockRequest(accessToken, {
        startsAt: '2030-08-20T08:00:00.000Z',
        endsAt: '2030-08-20T11:00:00.000Z',
        reason: 'Private internal reason',
      });

      const response = await request(app).get(
        `/api/v1/vendors/${vendor.slug}/availability${availabilityQuery}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.unavailableRanges).toEqual([
        {
          startsAt: '2030-08-20T08:00:00.000Z',
          endsAt: '2030-08-20T11:00:00.000Z',
          source: 'VENDOR_BLOCK',
        },
      ]);
    });

    it('does not expose block IDs, reasons, or internal timestamps publicly', async () => {
      const accessToken = await registerVendor(vendorPayload);
      const vendor = await approveVendor(vendorEmail);

      await createAvailabilityBlockRequest(accessToken, {
        startsAt: '2030-08-20T08:00:00.000Z',
        endsAt: '2030-08-20T11:00:00.000Z',
        reason: 'Confidential reason',
      });

      const response = await request(app).get(
        `/api/v1/vendors/${vendor.slug}/availability${availabilityQuery}`,
      );

      const unavailableRange =
        response.body.data.unavailableRanges[0];

      expect(unavailableRange).not.toHaveProperty('id');
      expect(unavailableRange).not.toHaveProperty('reason');
      expect(unavailableRange).not.toHaveProperty('createdAt');
      expect(unavailableRange).not.toHaveProperty('updatedAt');
    });

    it('returns 404 for a vendor that is not publicly approved', async () => {
      await registerVendor(vendorPayload);

      const vendor = await prisma.vendorProfile.findFirst({
        where: {
            user: {
            email: vendorEmail,
            },
        },
      });

      if (!vendor) {
        throw new Error('Availability test vendor was not found');
      }

      const response = await request(app).get(
        `/api/v1/vendors/${vendor.slug}/availability${availabilityQuery}`,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'PUBLIC_VENDOR_NOT_FOUND',
      );
    });
  });

  describe('DELETE /api/v1/vendors/me/availability/blocks/:blockId', () => {
    it('deletes a block owned by the authenticated vendor', async () => {
      const accessToken = await registerVendor(vendorPayload);

      const createResponse =
        await createAvailabilityBlockRequest(accessToken, {
          startsAt: '2030-08-25T08:00:00.000Z',
          endsAt: '2030-08-25T12:00:00.000Z',
          reason: 'Temporary closure',
        });

      const blockId = createResponse.body.data.id as string;

      const deleteResponse = await request(app)
        .delete(
          `/api/v1/vendors/me/availability/blocks/${blockId}`,
        )
        .set('Authorization', `Bearer ${accessToken}`);

      expect(deleteResponse.status).toBe(204);

      const savedBlock =
        await prisma.vendorAvailabilityBlock.findUnique({
          where: {
            id: blockId,
          },
        });

      expect(savedBlock).toBeNull();
    });

    it('does not allow one vendor to delete another vendor block', async () => {
      const firstAccessToken = await registerVendor(
        vendorPayload,
      );

      const secondAccessToken = await registerVendor(
        secondVendorPayload,
      );

      const createResponse =
        await createAvailabilityBlockRequest(
          firstAccessToken,
          {
            startsAt: '2030-08-26T08:00:00.000Z',
            endsAt: '2030-08-26T12:00:00.000Z',
            reason: 'First vendor block',
          },
        );

      const blockId = createResponse.body.data.id as string;

      const deleteResponse = await request(app)
        .delete(
          `/api/v1/vendors/me/availability/blocks/${blockId}`,
        )
        .set(
          'Authorization',
          `Bearer ${secondAccessToken}`,
        );

      expect(deleteResponse.status).toBe(404);
      expect(deleteResponse.body.success).toBe(false);
      expect(deleteResponse.body.error.code).toBe(
        'AVAILABILITY_BLOCK_NOT_FOUND',
      );

      const savedBlock =
        await prisma.vendorAvailabilityBlock.findUnique({
          where: {
            id: blockId,
          },
        });

      expect(savedBlock).not.toBeNull();
    });
  });
});