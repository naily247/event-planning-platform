import { QuotationRequestStatus, QuotationStatus, VendorVerificationStatus } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const customerEmail = 'quotation-customer@example.com';
const secondCustomerEmail = 'quotation-second-customer@example.com';
const vendorEmail = 'quotation-vendor@example.com';
const secondVendorEmail = 'quotation-second-vendor@example.com';

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

const secondVendorPayload = {
  email: secondVendorEmail,
  password: 'Vendor@2026',
  firstName: 'Nimal',
  lastName: 'Fernando',
  businessName: 'Second Quotation Studio',
};

const testEmails = [customerEmail, secondCustomerEmail, vendorEmail, secondVendorEmail];

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

  await prisma.servicePackage.deleteMany({
    where: {
      vendor: {
        user: {
          email: {
            in: testEmails,
          },
        },
      },
    },
  });

  await prisma.vendorCategory.deleteMany({
    where: {
      vendor: {
        user: {
          email: {
            in: testEmails,
          },
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

const registerVendor = async (
  payload: typeof vendorPayload | typeof secondVendorPayload = vendorPayload,
) => {
  return request(app).post('/api/v1/auth/register/vendor').send(payload);
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

const createVendorQuotationDraft = (
  vendorAccessToken: string,
  quotationRequestId: string,
  overrides: Record<string, unknown> = {},
) => {
  return request(app)
    .post(`/api/v1/quotation-requests/vendor/incoming/${quotationRequestId}/quotations`)
    .set('Authorization', `Bearer ${vendorAccessToken}`)
    .send({
      proposedPrice: 175000,
      depositAmount: 50000,
      inclusions:
        'Full-day photography, edited digital photographs, couple portraits, and one printed album.',
      exclusions: 'Travel outside Colombo and additional printed albums.',
      terms: 'The remaining balance must be paid seven days before the event.',
      expiresAt: '2030-07-25T09:00:00.000Z',
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

  describe('GET /api/v1/quotation-requests', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).get('/api/v1/quotation-requests');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .get('/api/v1/quotation-requests')
        .set('Authorization', `Bearer ${vendorRegistration.body.data.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns only quotation requests belonging to the authenticated customer', async () => {
      const firstCustomer = await registerCustomer(customerPayload);
      const secondCustomer = await registerCustomer(secondCustomerPayload);

      const { packageId } = await prepareApprovedVendorPackage();

      const firstEventId = await createPlanningEvent(firstCustomer.body.data.accessToken);
      const secondEventId = await createPlanningEvent(secondCustomer.body.data.accessToken);

      const firstRequest = await createQuotationRequest(
        firstCustomer.body.data.accessToken,
        firstEventId,
        packageId,
      );

      await createQuotationRequest(secondCustomer.body.data.accessToken, secondEventId, packageId);

      const response = await request(app)
        .get('/api/v1/quotation-requests')
        .set('Authorization', `Bearer ${firstCustomer.body.data.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(firstRequest.body.data.id);
      expect(response.body.data[0].event.id).toBe(firstEventId);

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('filters customer quotation requests by status and event', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { packageId } = await prepareApprovedVendorPackage();

      const firstEventId = await createPlanningEvent(customerAccessToken);
      const secondEventId = await createPlanningEvent(customerAccessToken);

      const firstRequest = await createQuotationRequest(
        customerAccessToken,
        firstEventId,
        packageId,
      );

      await createQuotationRequest(customerAccessToken, secondEventId, packageId);

      await prisma.quotationRequest.update({
        where: {
          id: firstRequest.body.data.id,
        },
        data: {
          status: QuotationRequestStatus.VIEWED,
        },
      });

      const response = await request(app)
        .get(`/api/v1/quotation-requests?status=VIEWED&eventId=${firstEventId}`)
        .set('Authorization', `Bearer ${customerAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(firstRequest.body.data.id);
      expect(response.body.data[0].status).toBe('VIEWED');
      expect(response.body.data[0].event.id).toBe(firstEventId);
    });

    it('supports pagination and oldest-first sorting', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { packageId } = await prepareApprovedVendorPackage();

      const firstEventId = await createPlanningEvent(customerAccessToken);
      const secondEventId = await createPlanningEvent(customerAccessToken);

      const firstRequest = await createQuotationRequest(
        customerAccessToken,
        firstEventId,
        packageId,
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      const secondRequest = await createQuotationRequest(
        customerAccessToken,
        secondEventId,
        packageId,
      );

      const response = await request(app)
        .get('/api/v1/quotation-requests?page=1&limit=1&sort=oldest')
        .set('Authorization', `Bearer ${customerAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(firstRequest.body.data.id);
      expect(response.body.data[0].id).not.toBe(secondRequest.body.data.id);

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('rejects invalid list query parameters', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await request(app)
        .get('/api/v1/quotation-requests?page=0&limit=100&sort=invalid&status=INVALID')
        .set('Authorization', `Bearer ${customerRegistration.body.data.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/quotation-requests/:quotationRequestId', () => {
    it('returns an owned quotation request', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { packageId } = await prepareApprovedVendorPackage();
      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      const response = await request(app)
        .get(`/api/v1/quotation-requests/${createdRequest.body.data.id}`)
        .set('Authorization', `Bearer ${customerAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdRequest.body.data.id);
      expect(response.body.data.event.id).toBe(eventId);
      expect(response.body.data.package.id).toBe(packageId);
    });

    it('hides a quotation request belonging to another customer', async () => {
      const firstCustomer = await registerCustomer(customerPayload);
      const secondCustomer = await registerCustomer(secondCustomerPayload);

      const { packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(firstCustomer.body.data.accessToken);

      const createdRequest = await createQuotationRequest(
        firstCustomer.body.data.accessToken,
        eventId,
        packageId,
      );

      const response = await request(app)
        .get(`/api/v1/quotation-requests/${createdRequest.body.data.id}`)
        .set('Authorization', `Bearer ${secondCustomer.body.data.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTATION_REQUEST_NOT_FOUND');
    });

    it('rejects an invalid quotation request ID', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await request(app)
        .get('/api/v1/quotation-requests/invalid-id')
        .set('Authorization', `Bearer ${customerRegistration.body.data.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('Vendor quotation request API', () => {
  describe('GET /api/v1/quotation-requests/vendor/incoming', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).get('/api/v1/quotation-requests/vendor/incoming');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated customers', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await request(app)
        .get('/api/v1/quotation-requests/vendor/incoming')
        .set('Authorization', `Bearer ${customerRegistration.body.data.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns quotation requests belonging to the authenticated vendor', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId, vendorId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      const response = await request(app)
        .get('/api/v1/quotation-requests/vendor/incoming')
        .set('Authorization', `Bearer ${vendorAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        id: createdRequest.body.data.id,
        status: 'SENT',
        event: {
          id: eventId,
          name: 'Maya and Arjun Wedding',
          owner: {
            firstName: 'Maya',
            lastName: 'Fernando',
            email: customerEmail,
            phone: expect.any(String),
          },
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

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('filters vendor quotation requests by status', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const firstEventId = await createPlanningEvent(customerAccessToken);
      const secondEventId = await createPlanningEvent(customerAccessToken);

      const firstRequest = await createQuotationRequest(
        customerAccessToken,
        firstEventId,
        packageId,
      );

      await createQuotationRequest(customerAccessToken, secondEventId, packageId);

      await prisma.quotationRequest.update({
        where: {
          id: firstRequest.body.data.id,
        },
        data: {
          status: QuotationRequestStatus.VIEWED,
        },
      });

      const response = await request(app)
        .get('/api/v1/quotation-requests/vendor/incoming?status=VIEWED')
        .set('Authorization', `Bearer ${vendorAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(firstRequest.body.data.id);
      expect(response.body.data[0].status).toBe('VIEWED');
    });

    it('supports pagination and oldest-first sorting', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const firstEventId = await createPlanningEvent(customerAccessToken);
      const secondEventId = await createPlanningEvent(customerAccessToken);

      const firstRequest = await createQuotationRequest(
        customerAccessToken,
        firstEventId,
        packageId,
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      const secondRequest = await createQuotationRequest(
        customerAccessToken,
        secondEventId,
        packageId,
      );

      const response = await request(app)
        .get('/api/v1/quotation-requests/vendor/incoming?page=1&limit=1&sort=oldest')
        .set('Authorization', `Bearer ${vendorAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(firstRequest.body.data.id);
      expect(response.body.data[0].id).not.toBe(secondRequest.body.data.id);

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('rejects invalid vendor list query parameters', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .get(
          '/api/v1/quotation-requests/vendor/incoming?page=0&limit=100&sort=invalid&status=INVALID',
        )
        .set('Authorization', `Bearer ${vendorRegistration.body.data.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/quotation-requests/vendor/incoming/:quotationRequestId', () => {
    it('returns a quotation request belonging to the authenticated vendor', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      const response = await request(app)
        .get(`/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}`)
        .set('Authorization', `Bearer ${vendorAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdRequest.body.data.id);
      expect(response.body.data.event.id).toBe(eventId);
      expect(response.body.data.event.owner.email).toBe(customerEmail);
      expect(response.body.data.package.id).toBe(packageId);
    });

    it('hides a quotation request belonging to another vendor', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { packageId } = await prepareApprovedVendorPackage();

      const secondVendorRegistration = await registerVendor(secondVendorPayload);

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      const response = await request(app)
        .get(`/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}`)
        .set('Authorization', `Bearer ${secondVendorRegistration.body.data.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTATION_REQUEST_NOT_FOUND');
    });

    it('rejects an invalid quotation request ID', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .get('/api/v1/quotation-requests/vendor/incoming/invalid-id')
        .set('Authorization', `Bearer ${vendorRegistration.body.data.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/quotation-requests/vendor/incoming/:quotationRequestId/viewed', () => {
    it('marks a sent quotation request as viewed', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      const response = await request(app)
        .patch(`/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/viewed`)
        .set('Authorization', `Bearer ${vendorAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(createdRequest.body.data.id);
      expect(response.body.data.status).toBe('VIEWED');

      const savedRequest = await prisma.quotationRequest.findUnique({
        where: {
          id: createdRequest.body.data.id,
        },
        select: {
          status: true,
        },
      });

      expect(savedRequest?.status).toBe(QuotationRequestStatus.VIEWED);
    });

    it('rejects marking an already viewed quotation request again', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      await request(app)
        .patch(`/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/viewed`)
        .set('Authorization', `Bearer ${vendorAccessToken}`);

      const response = await request(app)
        .patch(`/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/viewed`)
        .set('Authorization', `Bearer ${vendorAccessToken}`);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTATION_REQUEST_CANNOT_BE_MARKED_VIEWED');
    });

    it('hides another vendor quotation request', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { packageId } = await prepareApprovedVendorPackage();

      const secondVendorRegistration = await registerVendor(secondVendorPayload);

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      const response = await request(app)
        .patch(`/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/viewed`)
        .set('Authorization', `Bearer ${secondVendorRegistration.body.data.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTATION_REQUEST_NOT_FOUND');
    });
  });

  describe('POST /api/v1/quotation-requests/vendor/incoming/:quotationRequestId/quotations', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/quotation-requests/vendor/incoming/clx0000000000000000000000/quotations')
        .send({
          proposedPrice: 175000,
          inclusions: 'Professional full-day wedding photography coverage.',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated customers', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await request(app)
        .post('/api/v1/quotation-requests/vendor/incoming/clx0000000000000000000000/quotations')
        .set('Authorization', `Bearer ${customerRegistration.body.data.accessToken}`)
        .send({
          proposedPrice: 175000,
          inclusions: 'Professional full-day wedding photography coverage.',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('creates the first quotation draft for a sent quotation request', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      const response = await createVendorQuotationDraft(
        vendorAccessToken,
        createdRequest.body.data.id,
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        quotationRequestId: createdRequest.body.data.id,
        version: 1,
        status: 'DRAFT',
        proposedPrice: '175000.00',
        depositAmount: '50000.00',
        inclusions:
          'Full-day photography, edited digital photographs, couple portraits, and one printed album.',
        exclusions: 'Travel outside Colombo and additional printed albums.',
        terms: 'The remaining balance must be paid seven days before the event.',
        expiresAt: '2030-07-25T09:00:00.000Z',
      });

      expect(response.body.data.id).toEqual(expect.any(String));
      expect(response.body.data.createdAt).toEqual(expect.any(String));

      const savedQuotation = await prisma.quotation.findUnique({
        where: {
          quotationRequestId_version: {
            quotationRequestId: createdRequest.body.data.id,
            version: 1,
          },
        },
      });

      expect(savedQuotation).not.toBeNull();
      expect(savedQuotation?.status).toBe(QuotationStatus.DRAFT);
      expect(savedQuotation?.proposedPrice.toFixed(2)).toBe('175000.00');
      expect(savedQuotation?.depositAmount?.toFixed(2)).toBe('50000.00');

      const savedRequest = await prisma.quotationRequest.findUnique({
        where: {
          id: createdRequest.body.data.id,
        },
        select: {
          status: true,
        },
      });

      expect(savedRequest?.status).toBe(QuotationRequestStatus.SENT);
    });

    it('creates a quotation draft for a viewed quotation request', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      await request(app)
        .patch(`/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/viewed`)
        .set('Authorization', `Bearer ${vendorAccessToken}`);

      const response = await createVendorQuotationDraft(
        vendorAccessToken,
        createdRequest.body.data.id,
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('DRAFT');
      expect(response.body.data.version).toBe(1);
    });

    it('rejects invalid quotation draft input', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .post('/api/v1/quotation-requests/vendor/incoming/clx0000000000000000000000/quotations')
        .set('Authorization', `Bearer ${vendorRegistration.body.data.accessToken}`)
        .send({
          proposedPrice: 0,
          depositAmount: -100,
          inclusions: 'Short',
          expiresAt: 'invalid-date',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a deposit greater than the proposed price', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .post('/api/v1/quotation-requests/vendor/incoming/clx0000000000000000000000/quotations')
        .set('Authorization', `Bearer ${vendorRegistration.body.data.accessToken}`)
        .send({
          proposedPrice: 100000,
          depositAmount: 120000,
          inclusions: 'Professional full-day wedding photography and edited photographs.',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a quotation expiry after the event date', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      const response = await createVendorQuotationDraft(
        vendorAccessToken,
        createdRequest.body.data.id,
        {
          expiresAt: '2030-09-01T09:00:00.000Z',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_QUOTATION_EXPIRY');
    });

    it('rejects a quotation draft after the response deadline', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId, {
        responseDueAt: null,
      });

      await prisma.quotationRequest.update({
        where: {
          id: createdRequest.body.data.id,
        },
        data: {
          responseDueAt: new Date('2020-01-01T09:00:00.000Z'),
        },
      });

      const response = await createVendorQuotationDraft(
        vendorAccessToken,
        createdRequest.body.data.id,
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTATION_RESPONSE_DEADLINE_PASSED');
    });

    it('prevents creating another quotation for the same quotation request', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      await createVendorQuotationDraft(vendorAccessToken, createdRequest.body.data.id);

      const response = await createVendorQuotationDraft(
        vendorAccessToken,
        createdRequest.body.data.id,
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTATION_ALREADY_EXISTS');
    });

    it('hides a quotation request belonging to another vendor', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { packageId } = await prepareApprovedVendorPackage();

      const secondVendorRegistration = await registerVendor(secondVendorPayload);

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      const response = await createVendorQuotationDraft(
        secondVendorRegistration.body.data.accessToken,
        createdRequest.body.data.id,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTATION_REQUEST_NOT_FOUND');
    });

    it('rejects an invalid quotation request ID', async () => {
      const vendorRegistration = await registerVendor();

      const response = await createVendorQuotationDraft(
        vendorRegistration.body.data.accessToken,
        'invalid-id',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/quotation-requests/vendor/incoming/:quotationRequestId/quotations/draft', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).get(
        '/api/v1/quotation-requests/vendor/incoming/clx0000000000000000000000/quotations/draft',
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated customers', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await request(app)
        .get(
          '/api/v1/quotation-requests/vendor/incoming/clx0000000000000000000000/quotations/draft',
        )
        .set('Authorization', `Bearer ${customerRegistration.body.data.accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns the authenticated vendor quotation draft', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      const createdDraft = await createVendorQuotationDraft(
        vendorAccessToken,
        createdRequest.body.data.id,
      );

      const response = await request(app)
        .get(
          `/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/quotations/draft`,
        )
        .set('Authorization', `Bearer ${vendorAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: createdDraft.body.data.id,
        quotationRequestId: createdRequest.body.data.id,
        version: 1,
        status: 'DRAFT',
        proposedPrice: '175000.00',
        depositAmount: '50000.00',
        inclusions:
          'Full-day photography, edited digital photographs, couple portraits, and one printed album.',
        exclusions: 'Travel outside Colombo and additional printed albums.',
        terms: 'The remaining balance must be paid seven days before the event.',
        expiresAt: '2030-07-25T09:00:00.000Z',
      });
    });

    it('returns not found when no quotation draft exists', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      const response = await request(app)
        .get(
          `/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/quotations/draft`,
        )
        .set('Authorization', `Bearer ${vendorAccessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTATION_DRAFT_NOT_FOUND');
    });

    it('hides another vendor quotation draft', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const secondVendorRegistration = await registerVendor(secondVendorPayload);

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      await createVendorQuotationDraft(vendorAccessToken, createdRequest.body.data.id);

      const response = await request(app)
        .get(
          `/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/quotations/draft`,
        )
        .set('Authorization', `Bearer ${secondVendorRegistration.body.data.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTATION_DRAFT_NOT_FOUND');
    });

    it('rejects an invalid quotation request ID', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .get('/api/v1/quotation-requests/vendor/incoming/invalid-id/quotations/draft')
        .set('Authorization', `Bearer ${vendorRegistration.body.data.accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/quotation-requests/vendor/incoming/:quotationRequestId/quotations/draft', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app)
        .patch(
          '/api/v1/quotation-requests/vendor/incoming/clx0000000000000000000000/quotations/draft',
        )
        .send({
          proposedPrice: 180000,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated customers', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await request(app)
        .patch(
          '/api/v1/quotation-requests/vendor/incoming/clx0000000000000000000000/quotations/draft',
        )
        .set('Authorization', `Bearer ${customerRegistration.body.data.accessToken}`)
        .send({
          proposedPrice: 180000,
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('partially updates an owned quotation draft', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      const createdDraft = await createVendorQuotationDraft(
        vendorAccessToken,
        createdRequest.body.data.id,
      );

      const response = await request(app)
        .patch(
          `/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/quotations/draft`,
        )
        .set('Authorization', `Bearer ${vendorAccessToken}`)
        .send({
          proposedPrice: 185000,
          depositAmount: 60000,
          inclusions:
            'Full-day photography, edited photographs, printed album, and drone photography.',
          terms: 'The remaining balance must be paid five days before the event.',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: createdDraft.body.data.id,
        quotationRequestId: createdRequest.body.data.id,
        version: 1,
        status: 'DRAFT',
        proposedPrice: '185000.00',
        depositAmount: '60000.00',
        inclusions:
          'Full-day photography, edited photographs, printed album, and drone photography.',
        exclusions: 'Travel outside Colombo and additional printed albums.',
        terms: 'The remaining balance must be paid five days before the event.',
        expiresAt: '2030-07-25T09:00:00.000Z',
      });

      const savedQuotation = await prisma.quotation.findUnique({
        where: {
          id: createdDraft.body.data.id,
        },
      });

      expect(savedQuotation?.proposedPrice.toFixed(2)).toBe('185000.00');
      expect(savedQuotation?.depositAmount?.toFixed(2)).toBe('60000.00');
      expect(savedQuotation?.status).toBe(QuotationStatus.DRAFT);
    });

    it('clears nullable quotation draft fields', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      await createVendorQuotationDraft(vendorAccessToken, createdRequest.body.data.id);

      const response = await request(app)
        .patch(
          `/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/quotations/draft`,
        )
        .set('Authorization', `Bearer ${vendorAccessToken}`)
        .send({
          depositAmount: null,
          exclusions: null,
          terms: null,
          expiresAt: null,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.depositAmount).toBeNull();
      expect(response.body.data.exclusions).toBeNull();
      expect(response.body.data.terms).toBeNull();
      expect(response.body.data.expiresAt).toBeNull();
    });

    it('rejects an empty quotation draft update', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .patch(
          '/api/v1/quotation-requests/vendor/incoming/clx0000000000000000000000/quotations/draft',
        )
        .set('Authorization', `Bearer ${vendorRegistration.body.data.accessToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a deposit greater than the saved proposed price', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      await createVendorQuotationDraft(vendorAccessToken, createdRequest.body.data.id);

      const response = await request(app)
        .patch(
          `/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/quotations/draft`,
        )
        .set('Authorization', `Bearer ${vendorAccessToken}`)
        .send({
          depositAmount: 200000,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_QUOTATION_DEPOSIT');
    });

    it('rejects reducing the proposed price below the saved deposit', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      await createVendorQuotationDraft(vendorAccessToken, createdRequest.body.data.id);

      const response = await request(app)
        .patch(
          `/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/quotations/draft`,
        )
        .set('Authorization', `Bearer ${vendorAccessToken}`)
        .send({
          proposedPrice: 40000,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_QUOTATION_DEPOSIT');
    });

    it('rejects a quotation expiry after the event date', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      await createVendorQuotationDraft(vendorAccessToken, createdRequest.body.data.id);

      const response = await request(app)
        .patch(
          `/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/quotations/draft`,
        )
        .set('Authorization', `Bearer ${vendorAccessToken}`)
        .send({
          expiresAt: '2030-09-01T09:00:00.000Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_QUOTATION_EXPIRY');
    });

    it('rejects updating a quotation draft after the response deadline', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId, {
        responseDueAt: null,
      });

      await createVendorQuotationDraft(vendorAccessToken, createdRequest.body.data.id);

      await prisma.quotationRequest.update({
        where: {
          id: createdRequest.body.data.id,
        },
        data: {
          responseDueAt: new Date('2020-01-01T09:00:00.000Z'),
        },
      });

      const response = await request(app)
        .patch(
          `/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/quotations/draft`,
        )
        .set('Authorization', `Bearer ${vendorAccessToken}`)
        .send({
          proposedPrice: 180000,
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTATION_RESPONSE_DEADLINE_PASSED');
    });

    it('rejects updating a quotation that is no longer a draft', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      const createdDraft = await createVendorQuotationDraft(
        vendorAccessToken,
        createdRequest.body.data.id,
      );

      await prisma.quotation.update({
        where: {
          id: createdDraft.body.data.id,
        },
        data: {
          status: QuotationStatus.SENT,
        },
      });

      const response = await request(app)
        .patch(
          `/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/quotations/draft`,
        )
        .set('Authorization', `Bearer ${vendorAccessToken}`)
        .send({
          proposedPrice: 180000,
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTATION_DRAFT_CANNOT_BE_UPDATED');
    });

    it('hides another vendor quotation draft', async () => {
      const customerRegistration = await registerCustomer(customerPayload);
      const customerAccessToken = customerRegistration.body.data.accessToken;

      const { vendorAccessToken, packageId } = await prepareApprovedVendorPackage();

      const secondVendorRegistration = await registerVendor(secondVendorPayload);

      const eventId = await createPlanningEvent(customerAccessToken);

      const createdRequest = await createQuotationRequest(customerAccessToken, eventId, packageId);

      await createVendorQuotationDraft(vendorAccessToken, createdRequest.body.data.id);

      const response = await request(app)
        .patch(
          `/api/v1/quotation-requests/vendor/incoming/${createdRequest.body.data.id}/quotations/draft`,
        )
        .set('Authorization', `Bearer ${secondVendorRegistration.body.data.accessToken}`)
        .send({
          proposedPrice: 180000,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTATION_DRAFT_NOT_FOUND');
    });

    it('rejects an invalid quotation request ID', async () => {
      const vendorRegistration = await registerVendor();

      const response = await request(app)
        .patch('/api/v1/quotation-requests/vendor/incoming/invalid-id/quotations/draft')
        .set('Authorization', `Bearer ${vendorRegistration.body.data.accessToken}`)
        .send({
          proposedPrice: 180000,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
