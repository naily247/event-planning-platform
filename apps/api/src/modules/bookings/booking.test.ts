import {
  BookingStatus,
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
const secondVendorEmail = 'booking-second-vendor@example.com';

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

const secondVendorPayload = {
  email: secondVendorEmail,
  password: 'Vendor@2026',
  firstName: 'Arun',
  lastName: 'Silva',
  businessName: 'Second Booking Studio',
};

const testEmails = [customerEmail, secondCustomerEmail, vendorEmail, secondVendorEmail];

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

const prepareAcceptedQuotation = async () => {
  const customerRegistration = await registerCustomer(customerPayload);
  const vendorRegistration = await registerVendor();

  const customerAccessToken = customerRegistration.body.data.accessToken as string;

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
      description: 'Professional full-day wedding photography with edited digital photographs.',
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
      requirements: 'Outdoor ceremony with photography, catering, decoration, and live music.',
      status: EventStatus.PLANNING,
    },
  });

  const quotationRequest = await prisma.quotationRequest.create({
    data: {
      eventId: event.id,
      vendorId: vendor.id,
      packageId: servicePackage.id,
      requirements: 'Full-day wedding photography with ceremony and reception coverage.',
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
      inclusions: 'Full-day photography, edited digital photographs, and online gallery.',
      exclusions: 'Printed wedding albums are not included.',
      terms: 'A deposit is required to reserve the event date.',
      expiresAt: new Date('2030-07-20T09:00:00.000Z'),
    },
  });

  return {
    customerAccessToken,
    vendorAccessToken,
    customerUserId,
    vendorUserId,
    vendorId: vendor.id,
    eventId: event.id,
    quotationRequestId: quotationRequest.id,
    quotationId: quotation.id,
  };
};

const prepareBooking = async () => {
  const preparedData = await prepareAcceptedQuotation();

  const bookingResponse = await createBookingRequest(
    preparedData.customerAccessToken,
    preparedData.quotationId,
  );

  if (bookingResponse.status !== 201) {
    throw new Error('Booking must be created successfully for the test');
  }

  return {
    ...preparedData,
    bookingId: bookingResponse.body.data.id as string,
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

const getCustomerBookingsRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/bookings/customer${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getCustomerBookingByIdRequest = (
  accessToken: string,
  bookingId: string,
) => {
  return request(app)
    .get(`/api/v1/bookings/customer/${bookingId}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const cancelCustomerBookingRequest = (
  accessToken: string,
  bookingId: string,
  body: Record<string, unknown> = {},
) => {
  return request(app)
    .patch(`/api/v1/bookings/customer/${bookingId}/cancel`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

const getVendorBookingsRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/bookings/vendor/incoming${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getVendorBookingByIdRequest = (accessToken: string, bookingId: string) => {
  return request(app)
    .get(`/api/v1/bookings/vendor/incoming/${bookingId}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const confirmVendorBookingRequest = (
  accessToken: string,
  bookingId: string,
  body: Record<string, unknown> = {},
) => {
  return request(app)
    .patch(`/api/v1/bookings/vendor/incoming/${bookingId}/confirm`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

const rejectVendorBookingRequest = (
  accessToken: string,
  bookingId: string,
  body: Record<string, unknown> = {},
) => {
  return request(app)
    .patch(`/api/v1/bookings/vendor/incoming/${bookingId}/reject`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

const cancelVendorBookingRequest = (
  accessToken: string,
  bookingId: string,
  body: Record<string, unknown> = {},
) => {
  return request(app)
    .patch(`/api/v1/bookings/vendor/incoming/${bookingId}/cancel`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
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
        vendorResponseNote: null,
        vendorRespondedAt: null,

        event: {
          id: preparedData.eventId,
          name: 'Maya and Arjun Wedding',
          eventType: 'Wedding',
          location: 'Colombo',
          status: 'PLANNING',

          owner: {
            firstName: 'Maya',
            lastName: 'Fernando',
            email: customerEmail,
          },
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
      expect(savedBooking?.status).toBe(BookingStatus.AWAITING_VENDOR_CONFIRMATION);
    });

    it('does not allow another customer to book the quotation', async () => {
      const preparedData = await prepareAcceptedQuotation();

      const secondCustomerRegistration = await registerCustomer(secondCustomerPayload);

      const response = await createBookingRequest(
        secondCustomerRegistration.body.data.accessToken,
        preparedData.quotationId,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCEPTED_QUOTATION_NOT_FOUND');
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
      expect(secondResponse.body.error.code).toBe('BOOKING_ALREADY_EXISTS');
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
      expect(response.body.error.code).toBe('SERVICE_DATE_DOES_NOT_MATCH_EVENT');
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
      expect(response.body.error.code).toBe('VENDOR_NOT_AVAILABLE_FOR_BOOKING');
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

describe('Customer booking retrieval API', () => {
  describe('GET /api/v1/bookings/customer', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).get('/api/v1/bookings/customer');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const vendorRegistration = await registerVendor();

      const response = await getCustomerBookingsRequest(
        vendorRegistration.body.data.accessToken,
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns only bookings belonging to the authenticated customer', async () => {
      const preparedBooking = await prepareBooking();

      const secondCustomerRegistration = await registerCustomer(
        secondCustomerPayload,
      );

      const secondCustomerResponse = await getCustomerBookingsRequest(
        secondCustomerRegistration.body.data.accessToken,
      );

      expect(secondCustomerResponse.status).toBe(200);
      expect(secondCustomerResponse.body.success).toBe(true);
      expect(secondCustomerResponse.body.data).toEqual([]);

      expect(secondCustomerResponse.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const ownerResponse = await getCustomerBookingsRequest(
        preparedBooking.customerAccessToken,
      );

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body.success).toBe(true);
      expect(ownerResponse.body.data).toHaveLength(1);

      expect(ownerResponse.body.data[0]).toMatchObject({
        id: preparedBooking.bookingId,
        agreedCost: '175000.00',
        status: 'AWAITING_VENDOR_CONFIRMATION',
        vendorResponseNote: null,
        vendorRespondedAt: null,

        event: {
          id: preparedBooking.eventId,
          name: 'Maya and Arjun Wedding',
          eventType: 'Wedding',
          location: 'Colombo',
          status: 'PLANNING',

          owner: {
            firstName: 'Maya',
            lastName: 'Fernando',
            email: customerEmail,
          },
        },

        vendor: {
          id: preparedBooking.vendorId,
          businessName: 'Booking Photography Studio',
        },

        acceptedQuotation: {
          id: preparedBooking.quotationId,
          quotationRequestId: preparedBooking.quotationRequestId,
          status: 'ACCEPTED',
          proposedPrice: '175000.00',
          depositAmount: '50000.00',
        },
      });

      expect(ownerResponse.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('shows the vendor response to the customer', async () => {
      const preparedBooking = await prepareBooking();

      const note =
        'The event date is available and your booking has been confirmed.';

      const confirmationResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          note,
        },
      );

      expect(confirmationResponse.status).toBe(200);

      const response = await getCustomerBookingsRequest(
        preparedBooking.customerAccessToken,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        id: preparedBooking.bookingId,
        status: 'CONFIRMED',
        vendorResponseNote: note,
      });

      expect(response.body.data[0].vendorRespondedAt).toEqual(
        expect.any(String),
      );
    });

    it('filters customer bookings by status', async () => {
      const preparedBooking = await prepareBooking();

      await prisma.booking.update({
        where: {
          id: preparedBooking.bookingId,
        },

        data: {
          status: BookingStatus.CONFIRMED,
          vendorResponseNote: 'The booking has been confirmed.',
          vendorRespondedAt: new Date(),
        },
      });

      const confirmedResponse = await getCustomerBookingsRequest(
        preparedBooking.customerAccessToken,
        '?status=CONFIRMED',
      );

      expect(confirmedResponse.status).toBe(200);
      expect(confirmedResponse.body.data).toHaveLength(1);
      expect(confirmedResponse.body.data[0].status).toBe('CONFIRMED');

      const waitingResponse = await getCustomerBookingsRequest(
        preparedBooking.customerAccessToken,
        '?status=AWAITING_VENDOR_CONFIRMATION',
      );

      expect(waitingResponse.status).toBe(200);
      expect(waitingResponse.body.data).toHaveLength(0);
    });

    it('supports customer booking pagination and sorting', async () => {
      const preparedBooking = await prepareBooking();

      const response = await getCustomerBookingsRequest(
        preparedBooking.customerAccessToken,
        '?page=1&limit=1&sort=service_soonest',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(preparedBooking.bookingId);

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('rejects invalid customer booking query parameters', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await getCustomerBookingsRequest(
        customerRegistration.body.data.accessToken,
        '?page=0&limit=100&sort=invalid&status=INVALID',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/bookings/customer/:bookingId', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).get(
        '/api/v1/bookings/customer/clx0000000000000000000000',
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const vendorRegistration = await registerVendor();

      const response = await getCustomerBookingByIdRequest(
        vendorRegistration.body.data.accessToken,
        'clx0000000000000000000000',
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns a booking belonging to the authenticated customer', async () => {
      const preparedBooking = await prepareBooking();

      const response = await getCustomerBookingByIdRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: preparedBooking.bookingId,
        agreedCost: '175000.00',
        status: 'AWAITING_VENDOR_CONFIRMATION',
        vendorResponseNote: null,
        vendorRespondedAt: null,

        event: {
          id: preparedBooking.eventId,
          name: 'Maya and Arjun Wedding',
          eventType: 'Wedding',
          location: 'Colombo',
          status: 'PLANNING',

          owner: {
            firstName: 'Maya',
            lastName: 'Fernando',
            email: customerEmail,
          },
        },

        vendor: {
          id: preparedBooking.vendorId,
          businessName: 'Booking Photography Studio',
        },

        acceptedQuotation: {
          id: preparedBooking.quotationId,
          quotationRequestId: preparedBooking.quotationRequestId,
          version: 1,
          status: 'ACCEPTED',
          proposedPrice: '175000.00',
          depositAmount: '50000.00',
        },
      });

      expect(response.body.data.createdAt).toEqual(expect.any(String));
      expect(response.body.data.updatedAt).toEqual(expect.any(String));
    });

    it('shows a vendor rejection reason in customer booking details', async () => {
      const preparedBooking = await prepareBooking();

      const reason =
        'The requested event date is no longer available for our service.';

      const rejectionResponse = await rejectVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason,
        },
      );

      expect(rejectionResponse.status).toBe(200);

      const response = await getCustomerBookingByIdRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(200);

      expect(response.body.data).toMatchObject({
        id: preparedBooking.bookingId,
        status: 'REJECTED',
        vendorResponseNote: reason,
      });

      expect(response.body.data.vendorRespondedAt).toEqual(
        expect.any(String),
      );
    });

    it('does not allow another customer to access the booking', async () => {
      const preparedBooking = await prepareBooking();

      const secondCustomerRegistration = await registerCustomer(
        secondCustomerPayload,
      );

      const response = await getCustomerBookingByIdRequest(
        secondCustomerRegistration.body.data.accessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'CUSTOMER_BOOKING_NOT_FOUND',
      );
    });

    it('returns 404 when the customer booking does not exist', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await getCustomerBookingByIdRequest(
        customerRegistration.body.data.accessToken,
        'clx0000000000000000000000',
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'CUSTOMER_BOOKING_NOT_FOUND',
      );
    });

    it('rejects an invalid booking ID', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await getCustomerBookingByIdRequest(
        customerRegistration.body.data.accessToken,
        'invalid-id',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('Customer booking cancellation API', () => {
  describe('PATCH /api/v1/bookings/customer/:bookingId/cancel', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app)
        .patch(
          '/api/v1/bookings/customer/clx0000000000000000000000/cancel',
        )
        .send({
          reason: 'The event has been cancelled by the customer.',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const vendorRegistration = await registerVendor();

      const response = await cancelCustomerBookingRequest(
        vendorRegistration.body.data.accessToken,
        'clx0000000000000000000000',
        {
          reason: 'The event has been cancelled by the customer.',
        },
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('allows the customer to cancel a booking awaiting vendor confirmation', async () => {
      const preparedBooking = await prepareBooking();

      const reason =
        'The event plans have changed and this booking is no longer required.';

      const response = await cancelCustomerBookingRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
        {
          reason,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: preparedBooking.bookingId,
        status: 'CANCELLED',
        customerCancellationReason: reason,
        vendorResponseNote: null,
        vendorRespondedAt: null,
      });

      expect(response.body.data.customerCancelledAt).toEqual(
        expect.any(String),
      );

      const savedBooking = await prisma.booking.findUnique({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(savedBooking?.status).toBe(BookingStatus.CANCELLED);
      expect(savedBooking?.customerCancellationReason).toBe(reason);
      expect(savedBooking?.customerCancelledAt).not.toBeNull();
    });

    it('allows the customer to cancel a confirmed booking', async () => {
      const preparedBooking = await prepareBooking();

      const confirmationResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          note: 'The requested date is available and the booking is confirmed.',
        },
      );

      expect(confirmationResponse.status).toBe(200);

      const reason =
        'The event date has changed and the confirmed booking must be cancelled.';

      const response = await cancelCustomerBookingRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
        {
          reason,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: preparedBooking.bookingId,
        status: 'CANCELLED',
        customerCancellationReason: reason,
        vendorResponseNote:
          'The requested date is available and the booking is confirmed.',
      });

      expect(response.body.data.vendorRespondedAt).toEqual(
        expect.any(String),
      );

      expect(response.body.data.customerCancelledAt).toEqual(
        expect.any(String),
      );
    });

    it('shows the customer cancellation to the assigned vendor', async () => {
      const preparedBooking = await prepareBooking();

      const reason =
        'The customer has postponed the event and no longer needs this booking.';

      const cancellationResponse = await cancelCustomerBookingRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
        {
          reason,
        },
      );

      expect(cancellationResponse.status).toBe(200);

      const vendorResponse = await getVendorBookingByIdRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(vendorResponse.status).toBe(200);
      expect(vendorResponse.body.success).toBe(true);

      expect(vendorResponse.body.data).toMatchObject({
        id: preparedBooking.bookingId,
        status: 'CANCELLED',
        customerCancellationReason: reason,
      });

      expect(vendorResponse.body.data.customerCancelledAt).toEqual(
        expect.any(String),
      );
    });

    it('does not allow another customer to cancel the booking', async () => {
      const preparedBooking = await prepareBooking();

      const secondCustomerRegistration = await registerCustomer(
        secondCustomerPayload,
      );

      const response = await cancelCustomerBookingRequest(
        secondCustomerRegistration.body.data.accessToken,
        preparedBooking.bookingId,
        {
          reason:
            'The event plans have changed and this booking is no longer required.',
        },
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'CUSTOMER_BOOKING_NOT_FOUND',
      );

      const savedBooking = await prisma.booking.findUnique({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(savedBooking?.status).toBe(
        BookingStatus.AWAITING_VENDOR_CONFIRMATION,
      );

      expect(savedBooking?.customerCancellationReason).toBeNull();
      expect(savedBooking?.customerCancelledAt).toBeNull();
    });

    it('rejects repeated customer cancellation', async () => {
      const preparedBooking = await prepareBooking();

      const firstResponse = await cancelCustomerBookingRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
        {
          reason:
            'The event plans have changed and this booking is no longer required.',
        },
      );

      expect(firstResponse.status).toBe(200);

      const secondResponse = await cancelCustomerBookingRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
        {
          reason:
            'The customer is trying to cancel the same booking for a second time.',
        },
      );

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.success).toBe(false);
      expect(secondResponse.body.error.code).toBe(
        'BOOKING_ALREADY_CANCELLED',
      );
    });

    it('does not allow the customer to cancel a rejected booking', async () => {
      const preparedBooking = await prepareBooking();

      const rejectionResponse = await rejectVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason:
            'The requested event date is no longer available for our service.',
        },
      );

      expect(rejectionResponse.status).toBe(200);

      const response = await cancelCustomerBookingRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
        {
          reason:
            'The customer would also like to cancel the rejected booking.',
        },
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'BOOKING_CANNOT_BE_CANCELLED',
      );

      const savedBooking = await prisma.booking.findUnique({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(savedBooking?.status).toBe(BookingStatus.REJECTED);
      expect(savedBooking?.customerCancellationReason).toBeNull();
      expect(savedBooking?.customerCancelledAt).toBeNull();
    });

    it('rejects a missing cancellation reason', async () => {
      const preparedBooking = await prepareBooking();

      const response = await cancelCustomerBookingRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a cancellation reason that is too short', async () => {
      const preparedBooking = await prepareBooking();

      const response = await cancelCustomerBookingRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
        {
          reason: 'Changed',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an invalid booking ID', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await cancelCustomerBookingRequest(
        customerRegistration.body.data.accessToken,
        'invalid-id',
        {
          reason:
            'The event plans have changed and the booking must be cancelled.',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('Vendor booking retrieval API', () => {
  describe('GET /api/v1/bookings/vendor/incoming', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app).get('/api/v1/bookings/vendor/incoming');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated customers', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await getVendorBookingsRequest(customerRegistration.body.data.accessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns only bookings assigned to the authenticated vendor', async () => {
      const preparedBooking = await prepareBooking();

      const secondVendorRegistration = await registerVendor(secondVendorPayload);

      const response = await getVendorBookingsRequest(
        secondVendorRegistration.body.data.accessToken,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);

      const ownerResponse = await getVendorBookingsRequest(preparedBooking.vendorAccessToken);

      expect(ownerResponse.status).toBe(200);
      expect(ownerResponse.body.success).toBe(true);
      expect(ownerResponse.body.data).toHaveLength(1);

      expect(ownerResponse.body.data[0]).toMatchObject({
        id: preparedBooking.bookingId,
        status: 'AWAITING_VENDOR_CONFIRMATION',
        agreedCost: '175000.00',

        event: {
          id: preparedBooking.eventId,
          name: 'Maya and Arjun Wedding',

          owner: {
            firstName: 'Maya',
            lastName: 'Fernando',
            email: customerEmail,
          },
        },
      });

      expect(ownerResponse.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('filters vendor bookings by status', async () => {
      const preparedBooking = await prepareBooking();

      await prisma.booking.update({
        where: {
          id: preparedBooking.bookingId,
        },

        data: {
          status: BookingStatus.CONFIRMED,
          vendorRespondedAt: new Date(),
        },
      });

      const confirmedResponse = await getVendorBookingsRequest(
        preparedBooking.vendorAccessToken,
        '?status=CONFIRMED',
      );

      expect(confirmedResponse.status).toBe(200);
      expect(confirmedResponse.body.data).toHaveLength(1);
      expect(confirmedResponse.body.data[0].status).toBe('CONFIRMED');

      const waitingResponse = await getVendorBookingsRequest(
        preparedBooking.vendorAccessToken,
        '?status=AWAITING_VENDOR_CONFIRMATION',
      );

      expect(waitingResponse.status).toBe(200);
      expect(waitingResponse.body.data).toHaveLength(0);
    });

    it('supports vendor booking pagination', async () => {
      const preparedBooking = await prepareBooking();

      const response = await getVendorBookingsRequest(
        preparedBooking.vendorAccessToken,
        '?page=1&limit=1&sort=oldest',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('rejects invalid list query parameters', async () => {
      const vendorRegistration = await registerVendor();

      const response = await getVendorBookingsRequest(
        vendorRegistration.body.data.accessToken,
        '?page=0&limit=100&sort=invalid&status=INVALID',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/bookings/vendor/incoming/:bookingId', () => {
    it('returns an owned vendor booking', async () => {
      const preparedBooking = await prepareBooking();

      const response = await getVendorBookingByIdRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: preparedBooking.bookingId,
        agreedCost: '175000.00',
        status: 'AWAITING_VENDOR_CONFIRMATION',

        event: {
          id: preparedBooking.eventId,
          name: 'Maya and Arjun Wedding',
          location: 'Colombo',

          owner: {
            firstName: 'Maya',
            lastName: 'Fernando',
            email: customerEmail,
          },
        },

        acceptedQuotation: {
          id: preparedBooking.quotationId,
          proposedPrice: '175000.00',
          depositAmount: '50000.00',
        },
      });
    });

    it('does not allow another vendor to access the booking', async () => {
      const preparedBooking = await prepareBooking();

      const secondVendorRegistration = await registerVendor(secondVendorPayload);

      const response = await getVendorBookingByIdRequest(
        secondVendorRegistration.body.data.accessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VENDOR_BOOKING_NOT_FOUND');
    });

    it('rejects an invalid booking ID', async () => {
      const vendorRegistration = await registerVendor();

      const response = await getVendorBookingByIdRequest(
        vendorRegistration.body.data.accessToken,
        'invalid-id',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('Vendor booking response API', () => {
  describe('PATCH /api/v1/bookings/vendor/incoming/:bookingId/confirm', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app)
        .patch('/api/v1/bookings/vendor/incoming/clx0000000000000000000000/confirm')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated customers', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await confirmVendorBookingRequest(
        customerRegistration.body.data.accessToken,
        'clx0000000000000000000000',
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('allows the assigned vendor to confirm a booking', async () => {
      const preparedBooking = await prepareBooking();

      const note = 'The requested event date is available and the booking is confirmed.';

      const response = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          note,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: preparedBooking.bookingId,
        status: 'CONFIRMED',
        vendorResponseNote: note,
      });

      expect(response.body.data.vendorRespondedAt).toEqual(expect.any(String));

      const savedBooking = await prisma.booking.findUnique({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(savedBooking?.status).toBe(BookingStatus.CONFIRMED);
      expect(savedBooking?.vendorResponseNote).toBe(note);
      expect(savedBooking?.vendorRespondedAt).not.toBeNull();
    });

    it('allows confirmation without a note', async () => {
      const preparedBooking = await prepareBooking();

      const response = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('CONFIRMED');
      expect(response.body.data.vendorResponseNote).toBeNull();
      expect(response.body.data.vendorRespondedAt).toEqual(expect.any(String));
    });

    it('does not allow another vendor to confirm the booking', async () => {
      const preparedBooking = await prepareBooking();

      const secondVendorRegistration = await registerVendor(secondVendorPayload);

      const response = await confirmVendorBookingRequest(
        secondVendorRegistration.body.data.accessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VENDOR_BOOKING_NOT_FOUND');
    });

    it('rejects repeated confirmation', async () => {
      const preparedBooking = await prepareBooking();

      const firstResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(firstResponse.status).toBe(200);

      const secondResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.success).toBe(false);
      expect(secondResponse.body.error.code).toBe('BOOKING_ALREADY_RESPONDED');
    });

    it('rejects a confirmation note that is too short', async () => {
      const preparedBooking = await prepareBooking();

      const response = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          note: 'No',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an invalid booking ID', async () => {
      const vendorRegistration = await registerVendor();

      const response = await confirmVendorBookingRequest(
        vendorRegistration.body.data.accessToken,
        'invalid-id',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/bookings/vendor/incoming/:bookingId/reject', () => {
    it('allows the assigned vendor to reject a booking', async () => {
      const preparedBooking = await prepareBooking();

      const reason = 'The requested event date is no longer available for this service.';

      const response = await rejectVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: preparedBooking.bookingId,
        status: 'REJECTED',
        vendorResponseNote: reason,
      });

      expect(response.body.data.vendorRespondedAt).toEqual(expect.any(String));

      const savedBooking = await prisma.booking.findUnique({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(savedBooking?.status).toBe(BookingStatus.REJECTED);
      expect(savedBooking?.vendorResponseNote).toBe(reason);
      expect(savedBooking?.vendorRespondedAt).not.toBeNull();
    });

    it('does not allow another vendor to reject the booking', async () => {
      const preparedBooking = await prepareBooking();

      const secondVendorRegistration = await registerVendor(secondVendorPayload);

      const response = await rejectVendorBookingRequest(
        secondVendorRegistration.body.data.accessToken,
        preparedBooking.bookingId,
        {
          reason: 'The requested event date is unavailable for our business.',
        },
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VENDOR_BOOKING_NOT_FOUND');
    });

    it('rejects a missing rejection reason', async () => {
      const preparedBooking = await prepareBooking();

      const response = await rejectVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a rejection reason that is too short', async () => {
      const preparedBooking = await prepareBooking();

      const response = await rejectVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason: 'Busy',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('does not allow rejection after confirmation', async () => {
      const preparedBooking = await prepareBooking();

      const confirmationResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(confirmationResponse.status).toBe(200);

      const rejectionResponse = await rejectVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason: 'The requested event date is no longer available for this service.',
        },
      );

      expect(rejectionResponse.status).toBe(409);
      expect(rejectionResponse.body.success).toBe(false);
      expect(rejectionResponse.body.error.code).toBe('BOOKING_ALREADY_RESPONDED');
    });

    it('does not allow confirmation after rejection', async () => {
      const preparedBooking = await prepareBooking();

      const rejectionResponse = await rejectVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason: 'The requested event date is no longer available for this service.',
        },
      );

      expect(rejectionResponse.status).toBe(200);

      const confirmationResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(confirmationResponse.status).toBe(409);
      expect(confirmationResponse.body.success).toBe(false);
      expect(confirmationResponse.body.error.code).toBe('BOOKING_ALREADY_RESPONDED');
    });

    it('rejects an invalid booking ID', async () => {
      const vendorRegistration = await registerVendor();

      const response = await rejectVendorBookingRequest(
        vendorRegistration.body.data.accessToken,
        'invalid-id',
        {
          reason: 'The requested event date is unavailable for our business.',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('Vendor booking cancellation API', () => {
  describe('PATCH /api/v1/bookings/vendor/incoming/:bookingId/cancel', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app)
        .patch(
          '/api/v1/bookings/vendor/incoming/clx0000000000000000000000/cancel',
        )
        .send({
          reason:
            'An unavoidable equipment issue means we cannot provide the service.',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated customers', async () => {
      const customerRegistration = await registerCustomer(customerPayload);

      const response = await cancelVendorBookingRequest(
        customerRegistration.body.data.accessToken,
        'clx0000000000000000000000',
        {
          reason:
            'An unavoidable equipment issue means we cannot provide the service.',
        },
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('allows the assigned vendor to cancel a confirmed booking', async () => {
      const preparedBooking = await prepareBooking();

      const confirmationResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          note:
            'The requested date is available and the booking is confirmed.',
        },
      );

      expect(confirmationResponse.status).toBe(200);

      const reason =
        'An unavoidable equipment issue means we cannot provide the service.';

      const response = await cancelVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: preparedBooking.bookingId,
        status: 'CANCELLED',
        vendorCancellationReason: reason,
        customerCancellationReason: null,
        customerCancelledAt: null,
        vendorResponseNote:
          'The requested date is available and the booking is confirmed.',
      });

      expect(response.body.data.vendorCancelledAt).toEqual(
        expect.any(String),
      );

      expect(response.body.data.vendorRespondedAt).toEqual(
        expect.any(String),
      );

      const savedBooking = await prisma.booking.findUnique({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(savedBooking?.status).toBe(BookingStatus.CANCELLED);
      expect(savedBooking?.vendorCancellationReason).toBe(reason);
      expect(savedBooking?.vendorCancelledAt).not.toBeNull();
      expect(savedBooking?.customerCancellationReason).toBeNull();
      expect(savedBooking?.customerCancelledAt).toBeNull();
    });

    it('trims the vendor cancellation reason before saving it', async () => {
      const preparedBooking = await prepareBooking();

      const confirmationResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(confirmationResponse.status).toBe(200);

      const reason =
        'An unavoidable staffing emergency means we cannot provide the service.';

      const response = await cancelVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason: `   ${reason}   `,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data.vendorCancellationReason).toBe(reason);

      const savedBooking = await prisma.booking.findUnique({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(savedBooking?.vendorCancellationReason).toBe(reason);
    });

    it('shows the vendor cancellation in customer booking details', async () => {
      const preparedBooking = await prepareBooking();

      const confirmationResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(confirmationResponse.status).toBe(200);

      const reason =
        'A critical equipment failure means the vendor cannot provide the service.';

      const cancellationResponse = await cancelVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason,
        },
      );

      expect(cancellationResponse.status).toBe(200);

      const customerResponse = await getCustomerBookingByIdRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      expect(customerResponse.status).toBe(200);
      expect(customerResponse.body.success).toBe(true);

      expect(customerResponse.body.data).toMatchObject({
        id: preparedBooking.bookingId,
        status: 'CANCELLED',
        vendorCancellationReason: reason,
      });

      expect(customerResponse.body.data.vendorCancelledAt).toEqual(
        expect.any(String),
      );
    });

    it('shows the vendor cancellation in customer booking lists', async () => {
      const preparedBooking = await prepareBooking();

      const confirmationResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(confirmationResponse.status).toBe(200);

      const reason =
        'An unexpected operational issue means the service cannot be delivered.';

      const cancellationResponse = await cancelVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason,
        },
      );

      expect(cancellationResponse.status).toBe(200);

      const customerResponse = await getCustomerBookingsRequest(
        preparedBooking.customerAccessToken,
      );

      expect(customerResponse.status).toBe(200);
      expect(customerResponse.body.data).toHaveLength(1);

      expect(customerResponse.body.data[0]).toMatchObject({
        id: preparedBooking.bookingId,
        status: 'CANCELLED',
        vendorCancellationReason: reason,
      });

      expect(customerResponse.body.data[0].vendorCancelledAt).toEqual(
        expect.any(String),
      );
    });

    it('shows the vendor cancellation in vendor booking lists and details', async () => {
      const preparedBooking = await prepareBooking();

      const confirmationResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(confirmationResponse.status).toBe(200);

      const reason =
        'An unavoidable operational emergency means the booking must be cancelled.';

      const cancellationResponse = await cancelVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason,
        },
      );

      expect(cancellationResponse.status).toBe(200);

      const listResponse = await getVendorBookingsRequest(
        preparedBooking.vendorAccessToken,
      );

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data).toHaveLength(1);

      expect(listResponse.body.data[0]).toMatchObject({
        id: preparedBooking.bookingId,
        status: 'CANCELLED',
        vendorCancellationReason: reason,
      });

      expect(listResponse.body.data[0].vendorCancelledAt).toEqual(
        expect.any(String),
      );

      const detailResponse = await getVendorBookingByIdRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(detailResponse.status).toBe(200);

      expect(detailResponse.body.data).toMatchObject({
        id: preparedBooking.bookingId,
        status: 'CANCELLED',
        vendorCancellationReason: reason,
      });

      expect(detailResponse.body.data.vendorCancelledAt).toEqual(
        expect.any(String),
      );
    });

    it('does not allow another vendor to cancel the booking', async () => {
      const preparedBooking = await prepareBooking();

      const confirmationResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(confirmationResponse.status).toBe(200);

      const secondVendorRegistration = await registerVendor(
        secondVendorPayload,
      );

      const response = await cancelVendorBookingRequest(
        secondVendorRegistration.body.data.accessToken,
        preparedBooking.bookingId,
        {
          reason:
            'The second vendor is attempting to cancel a booking they do not own.',
        },
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'VENDOR_BOOKING_NOT_FOUND',
      );

      const savedBooking = await prisma.booking.findUnique({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(savedBooking?.status).toBe(BookingStatus.CONFIRMED);
      expect(savedBooking?.vendorCancellationReason).toBeNull();
      expect(savedBooking?.vendorCancelledAt).toBeNull();
    });

    it('rejects vendor cancellation while awaiting confirmation', async () => {
      const preparedBooking = await prepareBooking();

      const response = await cancelVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason:
            'The vendor cannot cancel while the booking is awaiting confirmation.',
        },
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'BOOKING_CANNOT_BE_CANCELLED_BY_VENDOR',
      );

      const savedBooking = await prisma.booking.findUnique({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(savedBooking?.status).toBe(
        BookingStatus.AWAITING_VENDOR_CONFIRMATION,
      );

      expect(savedBooking?.vendorCancellationReason).toBeNull();
      expect(savedBooking?.vendorCancelledAt).toBeNull();
    });

    it('rejects repeated vendor cancellation', async () => {
      const preparedBooking = await prepareBooking();

      const confirmationResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(confirmationResponse.status).toBe(200);

      const firstResponse = await cancelVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason:
            'An unavoidable equipment issue means we cannot provide the service.',
        },
      );

      expect(firstResponse.status).toBe(200);

      const secondResponse = await cancelVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason:
            'The vendor is attempting to cancel the same booking for a second time.',
        },
      );

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.success).toBe(false);
      expect(secondResponse.body.error.code).toBe(
        'BOOKING_ALREADY_CANCELLED',
      );
    });

    it('does not allow the vendor to cancel a rejected booking', async () => {
      const preparedBooking = await prepareBooking();

      const rejectionResponse = await rejectVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason:
            'The requested event date is no longer available for our service.',
        },
      );

      expect(rejectionResponse.status).toBe(200);

      const response = await cancelVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason:
            'The vendor is attempting to cancel a booking that was already rejected.',
        },
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'BOOKING_CANNOT_BE_CANCELLED_BY_VENDOR',
      );

      const savedBooking = await prisma.booking.findUnique({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(savedBooking?.status).toBe(BookingStatus.REJECTED);
      expect(savedBooking?.vendorCancellationReason).toBeNull();
      expect(savedBooking?.vendorCancelledAt).toBeNull();
    });

    it('does not allow the vendor to cancel a completed booking', async () => {
      const preparedBooking = await prepareBooking();

      await prisma.booking.update({
        where: {
          id: preparedBooking.bookingId,
        },

        data: {
          status: BookingStatus.COMPLETED,
        },
      });

      const response = await cancelVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason:
            'The vendor is attempting to cancel a booking that is already completed.',
        },
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(
        'BOOKING_CANNOT_BE_CANCELLED_BY_VENDOR',
      );

      const savedBooking = await prisma.booking.findUnique({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(savedBooking?.status).toBe(BookingStatus.COMPLETED);
      expect(savedBooking?.vendorCancellationReason).toBeNull();
      expect(savedBooking?.vendorCancelledAt).toBeNull();
    });

    it('rejects a missing vendor cancellation reason', async () => {
      const preparedBooking = await prepareBooking();

      const confirmationResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(confirmationResponse.status).toBe(200);

      const response = await cancelVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a vendor cancellation reason that is too short', async () => {
      const preparedBooking = await prepareBooking();

      const confirmationResponse = await confirmVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
      );

      expect(confirmationResponse.status).toBe(200);

      const response = await cancelVendorBookingRequest(
        preparedBooking.vendorAccessToken,
        preparedBooking.bookingId,
        {
          reason: 'Broken',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects an invalid booking ID', async () => {
      const vendorRegistration = await registerVendor();

      const response = await cancelVendorBookingRequest(
        vendorRegistration.body.data.accessToken,
        'invalid-id',
        {
          reason:
            'An unavoidable equipment issue means we cannot provide the service.',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});