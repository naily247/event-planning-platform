import {
  EventStatus,
  QuotationRequestStatus,
  QuotationStatus,
  VendorVerificationStatus,
} from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const customerEmail = 'booking-customer@example.com';
const secondCustomerEmail = 'booking-second-customer@example.com';
const vendorEmail = 'booking-vendor@example.com';

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
  businessName: 'Booking Photography Studio',
};

const testEmails = [customerEmail, secondCustomerEmail, vendorEmail];

const clearTestData = async () => {
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

const registerCustomer = async (
  payload: typeof customerPayload | typeof secondCustomerPayload,
) => {
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

const prepareAcceptedQuotation = async () => {
  const customerRegistration = await registerCustomer(customerPayload);
  const vendorRegistration = await registerVendor();

  const customerAccessToken =
    customerRegistration.body.data.accessToken as string;

  const vendorAccessToken = vendorRegistration.body.data.accessToken as string;
  const customerUserId = customerRegistration.body.data.user.id as string;
  const vendorUserId = vendorRegistration.body.data.user.id as string;

  const category = await getPhotographyCategory();

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: vendorUserId,
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

  const servicePackage = await prisma.servicePackage.create({
    data: {
      vendorId: vendor.id,
      categoryId: category.id,
      title: 'Booking Wedding Photography Package',
      description:
        'Professional full-day wedding photography with edited digital photographs.',
      basePrice: 150000,
      isActive: true,
    },
  });

  const event = await prisma.event.create({
    data: {
      ownerId: customerUserId,
      name: 'Maya and Arjun Wedding',
      eventType: 'Wedding',
      eventDate: new Date('2030-08-20T09:00:00.000Z'),
      location: 'Colombo',
      guestCount: 250,
      plannedBudget: 2500000,
      theme: 'Classic Garden',
      requirements:
        'Outdoor ceremony with photography, catering, decoration, and live music.',
      status: EventStatus.PLANNING,
    },
  });

  const quotationRequest = await prisma.quotationRequest.create({
    data: {
      eventId: event.id,
      vendorId: vendor.id,
      packageId: servicePackage.id,
      requirements:
        'Full-day wedding photography with ceremony and reception coverage.',
      status: QuotationRequestStatus.ACCEPTED,
    },
  });

  const quotation = await prisma.quotation.create({
    data: {
      quotationRequestId: quotationRequest.id,
      version: 1,
      status: QuotationStatus.ACCEPTED,
      proposedPrice: 175000,
      depositAmount: 50000,
      inclusions:
        'Full-day photography, edited digital photographs, and online gallery.',
      exclusions: 'Printed wedding albums are not included.',
      terms: 'A deposit is required to reserve the event date.',
      expiresAt: new Date('2030-07-20T09:00:00.000Z'),
    },
  });

  return {
    customerAccessToken,
    vendorAccessToken,
    customerUserId,
    vendorId: vendor.id,
    eventId: event.id,
    quotationRequestId: quotationRequest.id,
    quotationId: quotation.id,
  };
};

const createBookingRequest = (
  accessToken: string,
  quotationId: string,
  overrides: Record<string, unknown> = {},
) => {
  return request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      quotationId,
      serviceStart: '2030-08-20T08:00:00.000Z',
      serviceEnd: '2030-08-20T18:00:00.000Z',
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

describe('Customer booking creation API', () => {
  describe('POST /api/v1/bookings', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).post('/api/v1/bookings').send({
        quotationId: 'clx0000000000000000000000',
        serviceStart: '2030-08-20T08:00:00.000Z',
        serviceEnd: '2030-08-20T18:00:00.000Z',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const vendorRegistration = await registerVendor();

      const response = await createBookingRequest(
        vendorRegistration.body.data.accessToken,
        'clx0000000000000000000000',
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('creates a booking from the customer accepted quotation', async () => {
      const preparedData = await prepareAcceptedQuotation();

      const response = await createBookingRequest(
        preparedData.customerAccessToken,
        preparedData.quotationId,
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        agreedCost: '175000.00',
        serviceStart: '2030-08-20T08:00:00.000Z',
        serviceEnd: '2030-08-20T18:00:00.000Z',
        status: 'AWAITING_VENDOR_CONFIRMATION',

        event: {
          id: preparedData.eventId,
          name: 'Maya and Arjun Wedding',
          eventType: 'Wedding',
          location: 'Colombo',
          status: 'PLANNING',
        },

        vendor: {
          id: preparedData.vendorId,
          businessName: 'Booking Photography Studio',
        },

        acceptedQuotation: {
          id: preparedData.quotationId,
          quotationRequestId: preparedData.quotationRequestId,
          version: 1,
          status: 'ACCEPTED',
          proposedPrice: '175000.00',
          depositAmount: '50000.00',
        },
      });

      expect(response.body.data.id).toEqual(expect.any(String));
      expect(response.body.data.createdAt).toEqual(expect.any(String));
      expect(response.body.data.updatedAt).toEqual(expect.any(String));

      const savedBooking = await prisma.booking.findUnique({
        where: {
          acceptedQuotationId: preparedData.quotationId,
        },
      });

      expect(savedBooking).not.toBeNull();
      expect(savedBooking?.eventId).toBe(preparedData.eventId);
      expect(savedBooking?.vendorId).toBe(preparedData.vendorId);
      expect(savedBooking?.agreedCost.toFixed(2)).toBe('175000.00');
      expect(savedBooking?.status).toBe('AWAITING_VENDOR_CONFIRMATION');
    });

    it('does not allow another customer to book the quotation', async () => {
      const preparedData = await prepareAcceptedQuotation();

      const secondCustomerRegistration = await registerCustomer(
        secondCustomerPayload,
      );

      const response = await createBookingRequest(
        secondCustomerRegistration.body.data.accessToken,
        preparedData.quotationId,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'ACCEPTED_QUOTATION_NOT_FOUND',
      );
    });

    it('rejects a quotation that has not been accepted', async () => {
      const preparedData = await prepareAcceptedQuotation();

      await prisma.quotation.update({
        where: {
          id: preparedData.quotationId,
        },
        data: {
          status: QuotationStatus.SENT,
        },
      });

      await prisma.quotationRequest.update({
        where: {
          id: preparedData.quotationRequestId,
        },
        data: {
          status: QuotationRequestStatus.QUOTED,
        },
      });

      const response = await createBookingRequest(
        preparedData.customerAccessToken,
        preparedData.quotationId,
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTATION_NOT_ACCEPTED');
    });

    it('rejects duplicate booking creation for the same quotation', async () => {
      const preparedData = await prepareAcceptedQuotation();

      const firstResponse = await createBookingRequest(
        preparedData.customerAccessToken,
        preparedData.quotationId,
      );

      expect(firstResponse.status).toBe(201);

      const secondResponse = await createBookingRequest(
        preparedData.customerAccessToken,
        preparedData.quotationId,
      );

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.success).toBe(false);
      expect(secondResponse.body.error.code).toBe(
        'BOOKING_ALREADY_EXISTS',
      );
    });

    it('rejects a service start outside the event date', async () => {
      const preparedData = await prepareAcceptedQuotation();

      const response = await createBookingRequest(
        preparedData.customerAccessToken,
        preparedData.quotationId,
        {
          serviceStart: '2030-08-21T08:00:00.000Z',
          serviceEnd: '2030-08-21T18:00:00.000Z',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'SERVICE_DATE_DOES_NOT_MATCH_EVENT',
      );
    });

    it('rejects booking creation when the vendor is no longer approved', async () => {
      const preparedData = await prepareAcceptedQuotation();

      await prisma.vendorProfile.update({
        where: {
          id: preparedData.vendorId,
        },
        data: {
          verificationStatus: VendorVerificationStatus.REJECTED,
          rejectionReason: 'Vendor verification was revoked for testing.',
        },
      });

      const response = await createBookingRequest(
        preparedData.customerAccessToken,
        preparedData.quotationId,
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'VENDOR_NOT_AVAILABLE_FOR_BOOKING',
      );
    });

    it('rejects a service end before the service start', async () => {
      const preparedData = await prepareAcceptedQuotation();

      const response = await createBookingRequest(
        preparedData.customerAccessToken,
        preparedData.quotationId,
        {
          serviceStart: '2030-08-20T18:00:00.000Z',
          serviceEnd: '2030-08-20T08:00:00.000Z',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an invalid quotation ID', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await createBookingRequest(
        customerRegistration.body.data.accessToken,
        'invalid-id',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});