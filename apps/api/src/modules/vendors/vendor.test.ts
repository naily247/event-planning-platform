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

const registerTestVendor = async () => {
  return request(app)
    .post('/api/v1/auth/register/vendor')
    .send(vendorPayload);
};

const getCategoryBySlug = async (slug: string) => {
  const category = await prisma.serviceCategory.findUnique({
    where: { slug },
  });

  if (!category) {
    throw new Error(`Seeded category "${slug}" was not found`);
  }

  return category;
};

const completeVendorOnboarding = async (
  accessToken: string,
) => {
  const photography = await getCategoryBySlug('photography');

  await request(app)
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

  await request(app)
    .put('/api/v1/vendors/me/onboarding/categories')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      categoryIds: [photography.id],
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
      const registrationResponse = await registerTestVendor();

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
        categories: [],
        verificationStatus: 'DRAFT',
      });

      expect(response.body.data.completion).toMatchObject({
        percentage: 17,
        completedFields: 1,
        totalFields: 6,
        fields: {
          businessName: true,
          description: false,
          contactPhone: false,
          baseLocation: false,
          serviceAreas: false,
          categories: false,
        },
      });
    });
  });

  describe('PATCH /api/v1/vendors/me/onboarding', () => {
    it('updates the vendor onboarding profile', async () => {
      const registrationResponse = await registerTestVendor();

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
        categories: [],
        verificationStatus: 'DRAFT',
      });

      expect(response.body.data.completion).toMatchObject({
        percentage: 83,
        completedFields: 5,
        totalFields: 6,
      });
    });

    it('rejects an empty update body', async () => {
      const registrationResponse = await registerTestVendor();

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
      const registrationResponse = await registerTestVendor();

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
      const registrationResponse = await registerTestVendor();

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
      const registrationResponse = await registerTestVendor();

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

  describe('PUT /api/v1/vendors/me/onboarding/categories', () => {
    it('rejects requests without an access token', async () => {
      const photography = await getCategoryBySlug('photography');

      const response = await request(app)
        .put('/api/v1/vendors/me/onboarding/categories')
        .send({
          categoryIds: [photography.id],
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated customers', async () => {
      const photography = await getCategoryBySlug('photography');

      const registrationResponse = await request(app)
        .post('/api/v1/auth/register/customer')
        .send(customerPayload);

      const accessToken =
        registrationResponse.body.data.accessToken;

      const response = await request(app)
        .put('/api/v1/vendors/me/onboarding/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          categoryIds: [photography.id],
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('assigns service categories to the vendor', async () => {
      const registrationResponse = await registerTestVendor();

      const accessToken =
        registrationResponse.body.data.accessToken;

      const photography = await getCategoryBySlug('photography');
      const videography = await getCategoryBySlug('videography');

      const response = await request(app)
        .put('/api/v1/vendors/me/onboarding/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          categoryIds: [photography.id, videography.id],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.profile.categories).toEqual([
        {
          id: photography.id,
          name: 'Photography',
          slug: 'photography',
        },
        {
          id: videography.id,
          name: 'Videography',
          slug: 'videography',
        },
      ]);

      expect(response.body.data.completion).toMatchObject({
        percentage: 33,
        completedFields: 2,
        totalFields: 6,
        fields: {
          businessName: true,
          categories: true,
        },
      });
    });

    it('replaces the vendor existing category selection', async () => {
      const registrationResponse = await registerTestVendor();

      const accessToken =
        registrationResponse.body.data.accessToken;

      const photography = await getCategoryBySlug('photography');
      const videography = await getCategoryBySlug('videography');
      const catering = await getCategoryBySlug('catering');

      await request(app)
        .put('/api/v1/vendors/me/onboarding/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          categoryIds: [photography.id, videography.id],
        });

      const response = await request(app)
        .put('/api/v1/vendors/me/onboarding/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          categoryIds: [catering.id],
        });

      expect(response.status).toBe(200);

      expect(response.body.data.profile.categories).toEqual([
        {
          id: catering.id,
          name: 'Catering',
          slug: 'catering',
        },
      ]);
    });

    it('rejects an empty category selection', async () => {
      const registrationResponse = await registerTestVendor();

      const accessToken =
        registrationResponse.body.data.accessToken;

      const response = await request(app)
        .put('/api/v1/vendors/me/onboarding/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          categoryIds: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate category IDs', async () => {
      const registrationResponse = await registerTestVendor();

      const accessToken =
        registrationResponse.body.data.accessToken;

      const photography = await getCategoryBySlug('photography');

      const response = await request(app)
        .put('/api/v1/vendors/me/onboarding/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          categoryIds: [photography.id, photography.id],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects category IDs that do not exist', async () => {
      const registrationResponse = await registerTestVendor();

      const accessToken =
        registrationResponse.body.data.accessToken;

      const response = await request(app)
        .put('/api/v1/vendors/me/onboarding/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          categoryIds: ['cm00000000000000000000000'],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'INVALID_SERVICE_CATEGORIES',
      );
    });

    it('prevents editing categories on a pending profile', async () => {
      const registrationResponse = await registerTestVendor();

      const accessToken =
        registrationResponse.body.data.accessToken;

      const photography = await getCategoryBySlug('photography');

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
        .put('/api/v1/vendors/me/onboarding/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          categoryIds: [photography.id],
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'VENDOR_PROFILE_LOCKED',
      );
    });
  });

  describe('POST /api/v1/vendors/me/onboarding/submit', () => {
    it('rejects requests without an access token', async () => {
      const response = await request(app).post(
        '/api/v1/vendors/me/onboarding/submit',
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
        .post('/api/v1/vendors/me/onboarding/submit')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects an incomplete vendor profile', async () => {
      const registrationResponse = await registerTestVendor();

      const accessToken =
        registrationResponse.body.data.accessToken;

      const response = await request(app)
        .post('/api/v1/vendors/me/onboarding/submit')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'VENDOR_PROFILE_INCOMPLETE',
      );

      expect(
        response.body.error.details.incompleteFields,
      ).toEqual([
        'description',
        'contactPhone',
        'baseLocation',
        'serviceAreas',
        'categories',
      ]);

      expect(
        response.body.error.details.completion,
      ).toMatchObject({
        percentage: 17,
        completedFields: 1,
        totalFields: 6,
      });
    });

    it('submits a complete vendor profile for review', async () => {
      const registrationResponse = await registerTestVendor();

      const accessToken =
        registrationResponse.body.data.accessToken;

      await completeVendorOnboarding(accessToken);

      const response = await request(app)
        .post('/api/v1/vendors/me/onboarding/submit')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.profile).toMatchObject({
        businessName: 'Golden Hour Events',
        verificationStatus: 'PENDING',
        reviewedAt: null,
        rejectionReason: null,
      });

      expect(
        response.body.data.profile.submittedAt,
      ).toEqual(expect.any(String));

      expect(response.body.data.completion).toMatchObject({
        percentage: 100,
        completedFields: 6,
        totalFields: 6,
      });

      const storedVendor =
        await prisma.vendorProfile.findUnique({
          where: {
            userId: registrationResponse.body.data.user.id,
          },
        });

      expect(storedVendor?.verificationStatus).toBe(
        VendorVerificationStatus.PENDING,
      );

      expect(storedVendor?.submittedAt).toBeInstanceOf(Date);
    });

    it('rejects submitting the same profile twice', async () => {
      const registrationResponse = await registerTestVendor();

      const accessToken =
        registrationResponse.body.data.accessToken;

      await completeVendorOnboarding(accessToken);

      await request(app)
        .post('/api/v1/vendors/me/onboarding/submit')
        .set('Authorization', `Bearer ${accessToken}`);

      const response = await request(app)
        .post('/api/v1/vendors/me/onboarding/submit')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'VENDOR_PROFILE_NOT_SUBMITTABLE',
      );
    });

    it('locks profile editing after submission', async () => {
      const registrationResponse = await registerTestVendor();

      const accessToken =
        registrationResponse.body.data.accessToken;

      await completeVendorOnboarding(accessToken);

      await request(app)
        .post('/api/v1/vendors/me/onboarding/submit')
        .set('Authorization', `Bearer ${accessToken}`);

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

    it('locks category editing after submission', async () => {
      const registrationResponse = await registerTestVendor();

      const accessToken =
        registrationResponse.body.data.accessToken;

      await completeVendorOnboarding(accessToken);

      await request(app)
        .post('/api/v1/vendors/me/onboarding/submit')
        .set('Authorization', `Bearer ${accessToken}`);

      const catering = await getCategoryBySlug('catering');

      const response = await request(app)
        .put('/api/v1/vendors/me/onboarding/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          categoryIds: [catering.id],
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'VENDOR_PROFILE_LOCKED',
      );
    });
  });
});