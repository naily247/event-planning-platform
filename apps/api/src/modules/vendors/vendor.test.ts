import request from 'supertest';
import { VendorVerificationStatus } from '@prisma/client';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const vendorEmail = 'onboarding-vendor@example.com';
const customerEmail = 'onboarding-customer@example.com';

const vendorPayload = {
  email: vendorEmail,
  password: 'Vendor@2026',
  firstName: 'Nila',
  lastName: 'Perera',
  businessName: 'Golden Hour Events',
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

const clearTestUsers = async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [vendorEmail, customerEmail],
      },
    },
  });
};

beforeEach(async () => {
  await clearTestUsers();
});

afterAll(async () => {
  await clearTestUsers();
  await prisma.$disconnect();
});

describe('Vendor onboarding API', () => {
  describe('GET /api/v1/vendors/me/onboarding', () => {
    it('rejects requests without an access token', async () => {
      const response = await request(app).get(
        '/api/v1/vendors/me/onboarding',
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
        registrationResponse.body.data.accessToken;

      const response = await request(app)
        .get('/api/v1/vendors/me/onboarding')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns the authenticated vendor onboarding profile', async () => {
      const registrationResponse = await request(app)
        .post('/api/v1/auth/register/vendor')
        .send(vendorPayload);

      const accessToken =
        registrationResponse.body.data.accessToken;

      const response = await request(app)
        .get('/api/v1/vendors/me/onboarding')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.profile).toMatchObject({
        businessName: 'Golden Hour Events',
        slug: 'golden-hour-events',
        description: null,
        contactPhone: null,
        website: null,
        baseLocation: null,
        serviceAreas: [],
        verificationStatus: 'DRAFT',
      });

      expect(response.body.data.completion).toMatchObject({
        percentage: 20,
        completedFields: 1,
        totalFields: 5,
      });
    });
  });

  describe('PATCH /api/v1/vendors/me/onboarding', () => {
    it('updates the vendor onboarding profile', async () => {
      const registrationResponse = await request(app)
        .post('/api/v1/auth/register/vendor')
        .send(vendorPayload);

      const accessToken =
        registrationResponse.body.data.accessToken;

      const response = await request(app)
        .patch('/api/v1/vendors/me/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description:
            'We provide photography and event coordination services for weddings and private celebrations.',
          contactPhone: '+94771234567',
          website: 'https://goldenhourevents.lk',
          baseLocation: 'Colombo',
          serviceAreas: ['Colombo', 'Gampaha', 'Kandy'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.profile).toMatchObject({
        businessName: 'Golden Hour Events',
        description:
          'We provide photography and event coordination services for weddings and private celebrations.',
        contactPhone: '+94771234567',
        website: 'https://goldenhourevents.lk',
        baseLocation: 'Colombo',
        serviceAreas: ['Colombo', 'Gampaha', 'Kandy'],
        verificationStatus: 'DRAFT',
      });

      expect(response.body.data.completion).toMatchObject({
        percentage: 100,
        completedFields: 5,
        totalFields: 5,
      });
    });

    it('rejects an empty update body', async () => {
      const registrationResponse = await request(app)
        .post('/api/v1/auth/register/vendor')
        .send(vendorPayload);

      const accessToken =
        registrationResponse.body.data.accessToken;

      const response = await request(app)
        .patch('/api/v1/vendors/me/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an invalid phone number', async () => {
      const registrationResponse = await request(app)
        .post('/api/v1/auth/register/vendor')
        .send(vendorPayload);

      const accessToken =
        registrationResponse.body.data.accessToken;

      const response = await request(app)
        .patch('/api/v1/vendors/me/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          contactPhone: '0771234567',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an invalid website URL', async () => {
      const registrationResponse = await request(app)
        .post('/api/v1/auth/register/vendor')
        .send(vendorPayload);

      const accessToken =
        registrationResponse.body.data.accessToken;

      const response = await request(app)
        .patch('/api/v1/vendors/me/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          website: 'golden-hour-events',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('prevents editing a pending vendor profile', async () => {
      const registrationResponse = await request(app)
        .post('/api/v1/auth/register/vendor')
        .send(vendorPayload);

      const accessToken =
        registrationResponse.body.data.accessToken;

      await prisma.vendorProfile.update({
        where: {
          userId: registrationResponse.body.data.user.id,
        },
        data: {
          verificationStatus:
            VendorVerificationStatus.PENDING,
        },
      });

      const response = await request(app)
        .patch('/api/v1/vendors/me/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          baseLocation: 'Kandy',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'VENDOR_PROFILE_LOCKED',
      );
    });
  });
});