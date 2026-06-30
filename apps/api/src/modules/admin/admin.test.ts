import bcrypt from 'bcryptjs';
import { AccountStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const adminEmail = 'admin-review-test@example.com';
const vendorEmail = 'admin-pending-vendor@example.com';
const draftVendorEmail = 'admin-draft-vendor@example.com';

const adminPassword = 'Admin@2026';
const vendorPassword = 'Vendor@2026';

const vendorPayload = {
  email: vendorEmail,
  password: vendorPassword,
  firstName: 'Pending',
  lastName: 'Vendor',
  businessName: 'Pending Moments Photography',
};

const draftVendorPayload = {
  email: draftVendorEmail,
  password: vendorPassword,
  firstName: 'Draft',
  lastName: 'Vendor',
  businessName: 'Draft Events Studio',
};

const createTestAdmin = async () => {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      passwordHash,
      firstName: 'Test',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
    },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'Test',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
    },
  });
};

const loginTestAdmin = async () => {
  const response = await request(app).post('/api/v1/auth/login').send({
    email: adminEmail,
    password: adminPassword,
  });

  return response.body.data.accessToken as string;
};

const registerVendor = async (payload: typeof vendorPayload) => {
  return request(app).post('/api/v1/auth/register/vendor').send(payload);
};

const completeAndSubmitVendor = async (accessToken: string, categoryId: string) => {
  await request(app)
    .patch('/api/v1/vendors/me/onboarding')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      description: 'Professional photography services for weddings and private events.',
      contactPhone: '+94771234567',
      website: 'https://pending-moments.example.com',
      baseLocation: 'Kandy',
      serviceAreas: ['Kandy', 'Colombo'],
    });

  await request(app)
    .put('/api/v1/vendors/me/onboarding/categories')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      categoryIds: [categoryId],
    });

  return request(app)
    .post('/api/v1/vendors/me/onboarding/submit')
    .set('Authorization', `Bearer ${accessToken}`);
};

beforeEach(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [adminEmail, vendorEmail, draftVendorEmail],
      },
    },
  });

  await createTestAdmin();
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [adminEmail, vendorEmail, draftVendorEmail],
      },
    },
  });

  await prisma.$disconnect();
});

describe('Admin vendor review API', () => {
  describe('GET /api/v1/admin/vendors/pending', () => {
    it('rejects requests without an access token', async () => {
      const response = await request(app).get('/api/v1/admin/vendors/pending');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      const vendorAccessToken = registrationResponse.body.data.accessToken;

      const response = await request(app)
        .get('/api/v1/admin/vendors/pending')
        .set('Authorization', `Bearer ${vendorAccessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns only pending vendor applications to an admin', async () => {
      const category = await prisma.serviceCategory.findUnique({
        where: {
          slug: 'photography',
        },
      });

      expect(category).not.toBeNull();

      if (!category) {
        throw new Error('Photography service category must exist in the test database');
      }

      const pendingVendorRegistration = await registerVendor(vendorPayload);

      const pendingVendorAccessToken = pendingVendorRegistration.body.data.accessToken;

      const submissionResponse = await completeAndSubmitVendor(
        pendingVendorAccessToken,
        category.id,
      );

      expect(submissionResponse.status).toBe(200);

      await registerVendor(draftVendorPayload);

      const adminAccessToken = await loginTestAdmin();

      const response = await request(app)
        .get('/api/v1/admin/vendors/pending')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.count).toBe(1);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        businessName: 'Pending Moments Photography',
        verificationStatus: 'PENDING',
        baseLocation: 'Kandy',
        serviceAreas: ['Kandy', 'Colombo'],
        user: {
          email: vendorEmail,
          firstName: 'Pending',
          lastName: 'Vendor',
          status: 'ACTIVE',
        },
        categories: [
          {
            id: category.id,
            name: 'Photography',
            slug: 'photography',
          },
        ],
      });

      expect(response.body.data[0].submittedAt).toEqual(expect.any(String));

      expect(
        response.body.data.some(
          (vendor: { businessName: string }) => vendor.businessName === 'Draft Events Studio',
        ),
      ).toBe(false);
    });
  });

  describe('GET /api/v1/admin/vendors/:vendorId', () => {
    it('returns 404 when the vendor application does not exist', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await request(app)
        .get('/api/v1/admin/vendors/non-existent-vendor-id')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VENDOR_APPLICATION_NOT_FOUND');
    });

    it('returns a vendor application by ID to an admin', async () => {
      const category = await prisma.serviceCategory.findUnique({
        where: {
          slug: 'photography',
        },
      });

      expect(category).not.toBeNull();

      if (!category) {
        throw new Error('Photography service category must exist in the test database');
      }

      const registrationResponse = await registerVendor(vendorPayload);

      const vendorAccessToken = registrationResponse.body.data.accessToken;

      await completeAndSubmitVendor(vendorAccessToken, category.id);

      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: {
          userId: registrationResponse.body.data.user.id,
        },
        select: {
          id: true,
        },
      });

      expect(vendorProfile).not.toBeNull();

      if (!vendorProfile) {
        throw new Error('Vendor profile must exist after registration');
      }

      const adminAccessToken = await loginTestAdmin();

      const response = await request(app)
        .get(`/api/v1/admin/vendors/${vendorProfile.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: vendorProfile.id,
        businessName: 'Pending Moments Photography',
        verificationStatus: 'PENDING',
        baseLocation: 'Kandy',
        serviceAreas: ['Kandy', 'Colombo'],
        user: {
          email: vendorEmail,
          firstName: 'Pending',
          lastName: 'Vendor',
          status: 'ACTIVE',
        },
        categories: [
          {
            id: category.id,
            name: 'Photography',
            slug: 'photography',
          },
        ],
      });

      expect(response.body.data.submittedAt).toEqual(expect.any(String));
    });

    it('returns 404 when the vendor application is still in draft', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: {
          userId: registrationResponse.body.data.user.id,
        },
        select: {
          id: true,
          verificationStatus: true,
        },
      });

      expect(vendorProfile).not.toBeNull();

      if (!vendorProfile) {
        throw new Error('Vendor profile must exist after registration');
      }

      expect(vendorProfile.verificationStatus).toBe('DRAFT');

      const adminAccessToken = await loginTestAdmin();

      const response = await request(app)
        .get(`/api/v1/admin/vendors/${vendorProfile.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VENDOR_APPLICATION_NOT_FOUND');
    });
  });
  describe('PATCH /api/v1/admin/vendors/:vendorId/approve', () => {
    it('returns 404 when the vendor application does not exist', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await request(app)
        .patch('/api/v1/admin/vendors/non-existent-vendor-id/approve')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VENDOR_APPLICATION_NOT_FOUND');
    });

    it('rejects approval when the vendor application is not pending', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: {
          userId: registrationResponse.body.data.user.id,
        },
        select: {
          id: true,
        },
      });

      expect(vendorProfile).not.toBeNull();

      if (!vendorProfile) {
        throw new Error('Vendor profile must exist after registration');
      }

      const adminAccessToken = await loginTestAdmin();

      const response = await request(app)
        .patch(`/api/v1/admin/vendors/${vendorProfile.id}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VENDOR_APPLICATION_NOT_PENDING');
    });

    it('allows an admin to approve a pending vendor application', async () => {
      const category = await prisma.serviceCategory.findUnique({
        where: {
          slug: 'photography',
        },
      });

      expect(category).not.toBeNull();

      if (!category) {
        throw new Error('Photography service category must exist in the test database');
      }

      const registrationResponse = await registerVendor(vendorPayload);

      const vendorAccessToken = registrationResponse.body.data.accessToken;

      await completeAndSubmitVendor(vendorAccessToken, category.id);

      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: {
          userId: registrationResponse.body.data.user.id,
        },
        select: {
          id: true,
        },
      });

      expect(vendorProfile).not.toBeNull();

      if (!vendorProfile) {
        throw new Error('Vendor profile must exist after registration');
      }

      const adminAccessToken = await loginTestAdmin();

      const response = await request(app)
        .patch(`/api/v1/admin/vendors/${vendorProfile.id}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Vendor application approved successfully');

      expect(response.body.data).toMatchObject({
        id: vendorProfile.id,
        verificationStatus: 'APPROVED',
        rejectionReason: null,
      });

      expect(response.body.data.reviewedAt).toEqual(expect.any(String));

      const storedVendor = await prisma.vendorProfile.findUnique({
        where: {
          id: vendorProfile.id,
        },
        select: {
          verificationStatus: true,
          reviewedAt: true,
          rejectionReason: true,
        },
      });

      expect(storedVendor).toMatchObject({
        verificationStatus: 'APPROVED',
        rejectionReason: null,
      });

      expect(storedVendor?.reviewedAt).toBeInstanceOf(Date);
    });
  });
  describe('PATCH /api/v1/admin/vendors/:vendorId/reject', () => {
    const rejectionReason = 'The business information requires additional supporting details.';

    it('rejects requests with an invalid rejection reason', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await request(app)
        .patch('/api/v1/admin/vendors/non-existent-vendor-id/reject')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          reason: 'Too short',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 404 when the vendor application does not exist', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await request(app)
        .patch('/api/v1/admin/vendors/non-existent-vendor-id/reject')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          reason: rejectionReason,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VENDOR_APPLICATION_NOT_FOUND');
    });

    it('rejects the action when the vendor application is not pending', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: {
          userId: registrationResponse.body.data.user.id,
        },
        select: {
          id: true,
        },
      });

      expect(vendorProfile).not.toBeNull();

      if (!vendorProfile) {
        throw new Error('Vendor profile must exist after registration');
      }

      const adminAccessToken = await loginTestAdmin();

      const response = await request(app)
        .patch(`/api/v1/admin/vendors/${vendorProfile.id}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          reason: rejectionReason,
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VENDOR_APPLICATION_NOT_PENDING');
    });

    it('allows an admin to reject a pending vendor application', async () => {
      const category = await prisma.serviceCategory.findUnique({
        where: {
          slug: 'photography',
        },
      });

      expect(category).not.toBeNull();

      if (!category) {
        throw new Error('Photography service category must exist in the test database');
      }

      const registrationResponse = await registerVendor(vendorPayload);

      const vendorAccessToken = registrationResponse.body.data.accessToken;

      await completeAndSubmitVendor(vendorAccessToken, category.id);

      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: {
          userId: registrationResponse.body.data.user.id,
        },
        select: {
          id: true,
        },
      });

      expect(vendorProfile).not.toBeNull();

      if (!vendorProfile) {
        throw new Error('Vendor profile must exist after registration');
      }

      const adminAccessToken = await loginTestAdmin();

      const response = await request(app)
        .patch(`/api/v1/admin/vendors/${vendorProfile.id}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          reason: rejectionReason,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Vendor application rejected successfully');

      expect(response.body.data).toMatchObject({
        id: vendorProfile.id,
        verificationStatus: 'REJECTED',
        rejectionReason,
      });

      expect(response.body.data.reviewedAt).toEqual(expect.any(String));

      const storedVendor = await prisma.vendorProfile.findUnique({
        where: {
          id: vendorProfile.id,
        },
        select: {
          verificationStatus: true,
          reviewedAt: true,
          rejectionReason: true,
        },
      });

      expect(storedVendor).toMatchObject({
        verificationStatus: 'REJECTED',
        rejectionReason,
      });

      expect(storedVendor?.reviewedAt).toBeInstanceOf(Date);
    });
  });
});
