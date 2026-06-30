import { VendorVerificationStatus } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const vendorEmail = 'package-vendor@example.com';
const secondVendorEmail = 'package-second-vendor@example.com';
const customerEmail = 'package-customer@example.com';

const vendorPayload = {
  email: vendorEmail,
  password: 'Vendor@2026',
  firstName: 'Nila',
  lastName: 'Perera',
  businessName: 'Golden Hour Packages',
};

const secondVendorPayload = {
  email: secondVendorEmail,
  password: 'Vendor@2026',
  firstName: 'Second',
  lastName: 'Vendor',
  businessName: 'Silver Moon Events',
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
        in: [vendorEmail, secondVendorEmail, customerEmail],
      },
    },
  });
};

const getPhotographyCategory = async () => {
  const category = await prisma.serviceCategory.findUnique({
    where: {
      slug: 'photography',
    },
  });

  if (!category) {
    throw new Error('Photography category must exist in the test database');
  }

  return category;
};

const registerVendor = async (payload: typeof vendorPayload | typeof secondVendorPayload) => {
  return request(app).post('/api/v1/auth/register/vendor').send(payload);
};

const assignPhotographyCategory = async (userId: string) => {
  const category = await getPhotographyCategory();

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!vendor) {
    throw new Error('Vendor profile must exist after registration');
  }

  await prisma.vendorCategory.create({
    data: {
      vendorId: vendor.id,
      categoryId: category.id,
    },
  });

  return {
    category,
    vendor,
  };
};

const approveVendor = async (userId: string) => {
  await prisma.vendorProfile.update({
    where: {
      userId,
    },
    data: {
      verificationStatus: VendorVerificationStatus.APPROVED,
      reviewedAt: new Date(),
    },
  });
};

const createPackageRequest = (
  accessToken: string,
  categoryId: string,
  overrides: Record<string, unknown> = {},
) => {
  return request(app)
    .post('/api/v1/packages')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      categoryId,
      title: 'Essential Wedding Photography',
      description: 'Professional wedding photography coverage with edited digital photographs.',
      basePrice: 125000,
      isActive: false,
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

describe('Vendor service package API', () => {
  describe('POST /api/v1/packages', () => {
    it('rejects requests without authentication', async () => {
      const category = await getPhotographyCategory();

      const response = await request(app).post('/api/v1/packages').send({
        categoryId: category.id,
        title: 'Essential Wedding Photography',
        description: 'Professional wedding photography coverage with edited digital photographs.',
        basePrice: 125000,
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated customers', async () => {
      const registrationResponse = await request(app)
        .post('/api/v1/auth/register/customer')
        .send(customerPayload);

      const category = await getPhotographyCategory();

      const response = await createPackageRequest(
        registrationResponse.body.data.accessToken,
        category.id,
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('creates an inactive package for a vendor', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      const accessToken = registrationResponse.body.data.accessToken;
      const userId = registrationResponse.body.data.user.id;

      const { category } = await assignPhotographyCategory(userId);

      const response = await createPackageRequest(accessToken, category.id);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        title: 'Essential Wedding Photography',
        description: 'Professional wedding photography coverage with edited digital photographs.',
        basePrice: '125000.00',
        isActive: false,
        category: {
          id: category.id,
          name: 'Photography',
          slug: 'photography',
        },
      });

      expect(response.body.data.id).toEqual(expect.any(String));
      expect(response.body.data.createdAt).toEqual(expect.any(String));
      expect(response.body.data.updatedAt).toEqual(expect.any(String));
    });

    it('rejects a category not assigned to the vendor', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      const category = await getPhotographyCategory();

      const response = await createPackageRequest(
        registrationResponse.body.data.accessToken,
        category.id,
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PACKAGE_CATEGORY_NOT_ASSIGNED');
    });

    it('prevents an unapproved vendor from creating an active package', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      const accessToken = registrationResponse.body.data.accessToken;
      const userId = registrationResponse.body.data.user.id;

      const { category } = await assignPhotographyCategory(userId);

      const response = await createPackageRequest(accessToken, category.id, {
        isActive: true,
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VENDOR_NOT_APPROVED_FOR_ACTIVE_PACKAGE');
    });

    it('allows an approved vendor to create an active package', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      const accessToken = registrationResponse.body.data.accessToken;
      const userId = registrationResponse.body.data.user.id;

      const { category } = await assignPhotographyCategory(userId);

      await approveVendor(userId);

      const response = await createPackageRequest(accessToken, category.id, {
        isActive: true,
      });

      expect(response.status).toBe(201);
      expect(response.body.data.isActive).toBe(true);
    });

    it('rejects a price with more than two decimal places', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      const accessToken = registrationResponse.body.data.accessToken;
      const userId = registrationResponse.body.data.user.id;

      const { category } = await assignPhotographyCategory(userId);

      const response = await createPackageRequest(accessToken, category.id, {
        basePrice: 125000.123,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Package ownership and management', () => {
    it('lists only packages owned by the authenticated vendor', async () => {
      const firstRegistration = await registerVendor(vendorPayload);
      const secondRegistration = await registerVendor(secondVendorPayload);

      const firstSetup = await assignPhotographyCategory(firstRegistration.body.data.user.id);
      const secondSetup = await assignPhotographyCategory(secondRegistration.body.data.user.id);

      await createPackageRequest(firstRegistration.body.data.accessToken, firstSetup.category.id);

      await createPackageRequest(
        secondRegistration.body.data.accessToken,
        secondSetup.category.id,
        {
          title: 'Second Vendor Photography Package',
        },
      );

      const response = await request(app)
        .get('/api/v1/packages/me')
        .set('Authorization', `Bearer ${firstRegistration.body.data.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Essential Wedding Photography');
    });

    it('updates a package owned by the vendor', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      const accessToken = registrationResponse.body.data.accessToken;
      const userId = registrationResponse.body.data.user.id;

      const { category } = await assignPhotographyCategory(userId);

      const createResponse = await createPackageRequest(accessToken, category.id);

      const packageId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/v1/packages/${packageId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Premium Wedding Photography',
          basePrice: 175000.5,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id: packageId,
        title: 'Premium Wedding Photography',
        basePrice: '175000.50',
      });
    });

    it('prevents one vendor from accessing another vendor package', async () => {
      const firstRegistration = await registerVendor(vendorPayload);
      const secondRegistration = await registerVendor(secondVendorPayload);

      const firstSetup = await assignPhotographyCategory(firstRegistration.body.data.user.id);

      await assignPhotographyCategory(secondRegistration.body.data.user.id);

      const createResponse = await createPackageRequest(
        firstRegistration.body.data.accessToken,
        firstSetup.category.id,
      );

      const response = await request(app)
        .get(`/api/v1/packages/${createResponse.body.data.id}`)
        .set('Authorization', `Bearer ${secondRegistration.body.data.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SERVICE_PACKAGE_NOT_FOUND');
    });

    it('activates a package after vendor approval', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      const accessToken = registrationResponse.body.data.accessToken;
      const userId = registrationResponse.body.data.user.id;

      const { category } = await assignPhotographyCategory(userId);

      const createResponse = await createPackageRequest(accessToken, category.id);

      await approveVendor(userId);

      const response = await request(app)
        .patch(`/api/v1/packages/${createResponse.body.data.id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          isActive: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isActive).toBe(true);
    });

    it('filters packages by active status', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      const accessToken = registrationResponse.body.data.accessToken;
      const userId = registrationResponse.body.data.user.id;

      const { category } = await assignPhotographyCategory(userId);

      await approveVendor(userId);

      await createPackageRequest(accessToken, category.id, {
        title: 'Active Photography Package',
        isActive: true,
      });

      await createPackageRequest(accessToken, category.id, {
        title: 'Inactive Photography Package',
        isActive: false,
      });

      const response = await request(app)
        .get('/api/v1/packages/me?isActive=true')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        title: 'Active Photography Package',
        isActive: true,
      });
    });

    it('deletes a package owned by the vendor', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      const accessToken = registrationResponse.body.data.accessToken;
      const userId = registrationResponse.body.data.user.id;

      const { category } = await assignPhotographyCategory(userId);

      const createResponse = await createPackageRequest(accessToken, category.id);

      const packageId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/packages/${packageId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      const storedPackage = await prisma.servicePackage.findUnique({
        where: {
          id: packageId,
        },
      });

      expect(storedPackage).toBeNull();
    });
  });
});
