import { VendorVerificationStatus } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const customerEmail = 'quotation-customer@example.com';
const secondCustomerEmail = 'quotation-second-customer@example.com';
const vendorEmail = 'quotation-vendor@example.com';

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
  firstName: 'Ravi',
  lastName: 'Perera',
  businessName: 'Quotation Photography Studio',
};

const testEmails = [customerEmail, secondCustomerEmail, vendorEmail];

const clearTestData = async () => {
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
              email: vendorEmail,
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

  await prisma.servicePackage.deleteMany({
    where: {
      vendor: {
        user: {
          email: vendorEmail,
        },
      },
    },
  });

  await prisma.vendorCategory.deleteMany({
    where: {
      vendor: {
        user: {
          email: vendorEmail,
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

const registerVendor = async () => {
  return request(app).post('/api/v1/auth/register/vendor').send(vendorPayload);
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

const prepareApprovedVendorPackage = async () => {
  const registrationResponse = await registerVendor();

  const accessToken = registrationResponse.body.data.accessToken;
  const userId = registrationResponse.body.data.user.id;

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

  await prisma.vendorProfile.update({
    where: {
      id: vendor.id,
    },
    data: {
      verificationStatus: VendorVerificationStatus.APPROVED,
      reviewedAt: new Date(),
    },
  });

  const packageResponse = await request(app)
    .post('/api/v1/packages')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      categoryId: category.id,
      title: 'Wedding Photography Package',
      description: 'Professional full-day wedding photography with edited digital photographs.',
      basePrice: 150000,
      isActive: true,
    });

  return {
    vendorAccessToken: accessToken,
    vendorId: vendor.id,
    packageId: packageResponse.body.data.id,
  };
};

const createPlanningEvent = async (customerAccessToken: string) => {
  const eventResponse = await request(app)
    .post('/api/v1/events')
    .set('Authorization', `Bearer ${customerAccessToken}`)
    .send({
      name: 'Maya and Arjun Wedding',
      eventType: 'Wedding',
      eventDate: '2030-08-20T09:00:00.000Z',
      location: 'Colombo',
      guestCount: 250,
      plannedBudget: 2500000,
      theme: 'Classic Garden',
      requirements: 'Outdoor ceremony with photography, catering, decoration, and live music.',
    });

  const eventId = eventResponse.body.data.id;

  await request(app)
    .patch(`/api/v1/events/${eventId}/status`)
    .set('Authorization', `Bearer ${customerAccessToken}`)
    .send({
      status: 'PLANNING',
    });

  return eventId;
};

const createQuotationRequest = (
  customerAccessToken: string,
  eventId: string,
  packageId: string,
  overrides: Record<string, unknown> = {},
) => {
  return request(app)
    .post('/api/v1/quotation-requests')
    .set('Authorization', `Bearer ${customerAccessToken}`)
    .send({
      eventId,
      packageId,
      requirements:
        'We need full-day wedding photography, couple portraits, and edited digital photographs.',
      responseDueAt: '2030-07-20T09:00:00.000Z',
      ...overrides,
    });
};

beforeEach(async () => {
  await clearTestData();
});

afterAll(async () => {
  await clearTestData();
  await prisma.$disconnect();
});

describe('Customer quotation request API', () => {
  describe('POST /api/v1/quotation-requests', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).post('/api/v1/quotation-requests').send({
        eventId: 'clx0000000000000000000000',
        packageId: 'clx0000000000000000000001',
        requirements: 'We need professional wedding photography coverage.',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .post('/api/v1/quotation-requests')
        .set('Authorization', `Bearer ${vendorRegistration.body.data.accessToken}`)
        .send({
          eventId: 'clx0000000000000000000000',
          packageId: 'clx0000000000000000000001',
          requirements: 'We need professional wedding photography coverage.',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('creates a quotation request for an owned planning event and active package', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { packageId, vendorId } = await prepareApprovedVendorPackage();
      const eventId = await createPlanningEvent(customerAccessToken);

      const response = await createQuotationRequest(customerAccessToken, eventId, packageId);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        requirements:
          'We need full-day wedding photography, couple portraits, and edited digital photographs.',
        responseDueAt: '2030-07-20T09:00:00.000Z',
        status: 'SENT',
        event: {
          id: eventId,
          name: 'Maya and Arjun Wedding',
          status: 'PLANNING',
        },
        vendor: {
          id: vendorId,
          businessName: 'Quotation Photography Studio',
        },
        package: {
          id: packageId,
          title: 'Wedding Photography Package',
          basePrice: '150000.00',
        },
      });

      expect(response.body.data.id).toEqual(expect.any(String));
      expect(response.body.data.createdAt).toEqual(expect.any(String));
      expect(response.body.data.updatedAt).toEqual(expect.any(String));
    });

    it('hides an event owned by another customer', async () => {
      const firstCustomer = await registerCustomer(customerPayload);
      const secondCustomer = await registerCustomer(secondCustomerPayload);

      const { packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(firstCustomer.body.data.accessToken);

      const response = await createQuotationRequest(
        secondCustomer.body.data.accessToken,
        eventId,
        packageId,
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('EVENT_NOT_FOUND');
    });

    it('rejects quotation requests for draft events', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { packageId } = await prepareApprovedVendorPackage();

      const eventResponse = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send({
          name: 'Draft Wedding Event',
          eventType: 'Wedding',
          eventDate: '2030-08-20T09:00:00.000Z',
          location: 'Colombo',
        });

      const response = await createQuotationRequest(
        customerAccessToken,
        eventResponse.body.data.id,
        packageId,
      );

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('EVENT_NOT_AVAILABLE_FOR_QUOTATION_REQUEST');
    });

    it('rejects an inactive package', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { packageId } = await prepareApprovedVendorPackage();
      const eventId = await createPlanningEvent(customerAccessToken);

      await prisma.servicePackage.update({
        where: {
          id: packageId,
        },
        data: {
          isActive: false,
        },
      });

      const response = await createQuotationRequest(customerAccessToken, eventId, packageId);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('SERVICE_PACKAGE_NOT_AVAILABLE');
    });

    it('rejects a response deadline after the event date', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { packageId } = await prepareApprovedVendorPackage();
      const eventId = await createPlanningEvent(customerAccessToken);

      const response = await createQuotationRequest(customerAccessToken, eventId, packageId, {
        responseDueAt: '2030-09-01T09:00:00.000Z',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_QUOTATION_RESPONSE_DEADLINE');
    });

    it('prevents duplicate active quotation requests for the same event and package', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { packageId } = await prepareApprovedVendorPackage();
      const eventId = await createPlanningEvent(customerAccessToken);

      await createQuotationRequest(customerAccessToken, eventId, packageId);

      const response = await createQuotationRequest(customerAccessToken, eventId, packageId);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('QUOTATION_REQUEST_ALREADY_EXISTS');
    });

    it('rejects invalid quotation request input', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await request(app)
        .post('/api/v1/quotation-requests')
        .set('Authorization', `Bearer ${customerRegistration.body.data.accessToken}`)
        .send({
          eventId: 'invalid-event-id',
          packageId: 'invalid-package-id',
          requirements: 'Short',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
