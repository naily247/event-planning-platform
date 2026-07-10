import bcrypt from 'bcryptjs';
import {
  AccountStatus,
  BookingStatus,
  EventStatus,
  PaymentMethod,
  PaymentStatus,
  QuotationRequestStatus,
  QuotationStatus,
  UserRole,
  VendorVerificationStatus,
} from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';
import {
  constructStripeWebhookEvent,
  getStripeClient,
} from '../../services/stripe.service.js';

jest.mock('../../services/stripe.service.js', () => ({
  constructStripeWebhookEvent: jest.fn(),
  getStripeClient: jest.fn(),
}));

const app = createApp();

const mockedConstructStripeWebhookEvent = jest.mocked(constructStripeWebhookEvent);
const mockedGetStripeClient = jest.mocked(getStripeClient);
const mockedStripeCheckoutSessionCreate = jest.fn();

const customerEmail = 'payment-customer@example.com';
const secondCustomerEmail = 'payment-second-customer@example.com';
const vendorEmail = 'payment-vendor@example.com';
const adminEmail = 'payment-admin@example.com';

const customerPassword = 'Customer@2026';
const vendorPassword = 'Vendor@2026';
const adminPassword = 'Admin@2026';

const customerPayload = {
  email: customerEmail,
  password: customerPassword,
  firstName: 'Maya',
  lastName: 'Fernando',
  phone: {
    country: 'LK',
    number: '0771234567',
  },
};

const secondCustomerPayload = {
  email: secondCustomerEmail,
  password: customerPassword,
  firstName: 'Nila',
  lastName: 'Perera',
  phone: {
    country: 'LK',
    number: '0777654321',
  },
};

const vendorPayload = {
  email: vendorEmail,
  password: vendorPassword,
  firstName: 'Ravi',
  lastName: 'Perera',
  businessName: 'Payment Photography Studio',
};

const testEmails = [customerEmail, secondCustomerEmail, vendorEmail, adminEmail];

const createTestAdmin = async () => {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: {
      email: adminEmail,
    },

    update: {
      passwordHash,
      firstName: 'Payment',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
    },

    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'Payment',
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

const registerCustomer = async (
  payload: typeof customerPayload | typeof secondCustomerPayload = customerPayload,
) => {
  return request(app).post('/api/v1/auth/register/customer').send(payload);
};

const registerVendor = async () => {
  return request(app).post('/api/v1/auth/register/vendor').send(vendorPayload);
};

const clearTestData = async () => {
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
          reviewedBy: {
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

const prepareDepositPendingBooking = async () => {
  const customerRegistration = await registerCustomer();

  const vendorRegistration = await registerVendor();

  const customerAccessToken = customerRegistration.body.data.accessToken as string;

  const vendorAccessToken = vendorRegistration.body.data.accessToken as string;

  const customerUserId = customerRegistration.body.data.user.id as string;

  const vendorUserId = vendorRegistration.body.data.user.id as string;

  const category = await prisma.serviceCategory.findUnique({
    where: {
      slug: 'photography',
    },
  });

  if (!category) {
    throw new Error('Photography category must exist in the test database');
  }

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
      title: 'Deposit Photography Package',
      description: 'Full-day wedding photography with edited digital photographs.',
      basePrice: 150000,
      isActive: true,
    },
  });

  const event = await prisma.event.create({
    data: {
      ownerId: customerUserId,
      name: 'Deposit Payment Wedding',
      eventType: 'Wedding',
      eventDate: new Date('2030-08-20T09:00:00.000Z'),
      location: 'Colombo',
      guestCount: 250,
      plannedBudget: 2500000,
      theme: 'Classic Garden',
      requirements: 'Wedding photography and full-day event coverage.',
      status: EventStatus.PLANNING,
    },
  });

  const quotationRequest = await prisma.quotationRequest.create({
    data: {
      eventId: event.id,
      vendorId: vendor.id,
      packageId: servicePackage.id,
      requirements: 'Full-day wedding photography coverage.',
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
      inclusions: 'Photography, edited photographs, and online gallery.',
      exclusions: 'Printed albums are not included.',
      terms: 'A deposit is required to reserve the event date.',
      expiresAt: new Date('2030-07-20T09:00:00.000Z'),
    },
  });

  const bookingResponse = await request(app)
    .post('/api/v1/bookings')
    .set('Authorization', `Bearer ${customerAccessToken}`)
    .send({
      quotationId: quotation.id,
      serviceStart: '2030-08-20T08:00:00.000Z',
      serviceEnd: '2030-08-20T18:00:00.000Z',
    });

  if (bookingResponse.status !== 201) {
    throw new Error('Booking must be created successfully for the payment test');
  }

  const bookingId = bookingResponse.body.data.id as string;

  const confirmationResponse = await request(app)
    .patch(`/api/v1/bookings/vendor/incoming/${bookingId}/confirm`)
    .set('Authorization', `Bearer ${vendorAccessToken}`)
    .send({
      note: 'The booking date is available.',
    });

  if (confirmationResponse.status !== 200) {
    throw new Error('Vendor must confirm the booking successfully');
  }

  if (confirmationResponse.body.data.status !== BookingStatus.DEPOSIT_PENDING) {
    throw new Error('Confirmed booking must await its deposit');
  }

  return {
    customerAccessToken,
    vendorAccessToken,
    customerUserId,
    vendorUserId,
    bookingId,
    eventId: event.id,
    vendorId: vendor.id,
    quotationId: quotation.id,
  };
};

const submitCustomerPaymentRequest = (
  accessToken: string,
  bookingId: string,
  body: Record<string, unknown> = {},
) => {
  return request(app)
    .post(`/api/v1/bookings/customer/${bookingId}/payments`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      method: PaymentMethod.BANK_TRANSFER,
      referenceNumber: 'TXN-2026-001234',
      ...body,
    });
};

const getCustomerPaymentsRequest = (accessToken: string, bookingId: string) => {
  return request(app)
    .get(`/api/v1/bookings/customer/${bookingId}/payments`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const createStripeCheckoutSessionRequest = (accessToken: string, bookingId: string) => {
  return request(app)
    .post(`/api/v1/payments/bookings/${bookingId}/checkout-session`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const sendStripeWebhookRequest = () => {
  return request(app)
    .post('/api/v1/payments/stripe/webhook')
    .set('stripe-signature', 'test_stripe_signature')
    .set('Content-Type', 'application/json')
    .send(Buffer.from(JSON.stringify({ id: 'evt_test_checkout_completed' })));
};

const getPendingAdminPaymentsRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/admin/payments/pending${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getAdminPaymentRequest = (accessToken: string, paymentId: string) => {
  return request(app)
    .get(`/api/v1/admin/payments/${paymentId}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const verifyAdminPaymentRequest = (accessToken: string, paymentId: string) => {
  return request(app)
    .patch(`/api/v1/admin/payments/${paymentId}/verify`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const rejectAdminPaymentRequest = (
  accessToken: string,
  paymentId: string,
  reason = 'The submitted bank reference could not be verified.',
) => {
  return request(app)
    .patch(`/api/v1/admin/payments/${paymentId}/reject`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      reason,
    });
};

beforeEach(async () => {
  mockedConstructStripeWebhookEvent.mockReset();
  mockedGetStripeClient.mockReset();
  mockedStripeCheckoutSessionCreate.mockReset();

  mockedGetStripeClient.mockReturnValue({
    checkout: {
      sessions: {
        create: mockedStripeCheckoutSessionCreate,
      },
    },
  } as never);

  mockedStripeCheckoutSessionCreate.mockResolvedValue({
    id: 'cs_test_deposit_payment',
    url: 'https://checkout.stripe.com/c/pay/cs_test_deposit_payment',
  });

  await clearTestData();
  await createTestAdmin();
});

afterAll(async () => {
  await clearTestData();
  await prisma.$disconnect();
});

describe('Booking deposit payment API', () => {
  describe('POST /api/v1/bookings/customer/:bookingId/payments', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/bookings/customer/clx0000000000000000000000/payments')
        .send({
          method: PaymentMethod.BANK_TRANSFER,
          referenceNumber: 'TXN-2026-001234',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const vendorRegistration = await registerVendor();

      const response = await submitCustomerPaymentRequest(
        vendorRegistration.body.data.accessToken,
        'clx0000000000000000000000',
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('submits the required deposit for verification', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      const response = await submitCustomerPaymentRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        bookingId: preparedBooking.bookingId,
        submittedById: preparedBooking.customerUserId,
        reviewedById: null,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.BANK_TRANSFER,
        referenceNumber: 'TXN-2026-001234',
        reviewedAt: null,
        rejectionReason: null,

        booking: {
          id: preparedBooking.bookingId,
          status: BookingStatus.DEPOSIT_PENDING,

          event: {
            id: preparedBooking.eventId,
            name: 'Deposit Payment Wedding',
          },

          vendor: {
            id: preparedBooking.vendorId,
            businessName: 'Payment Photography Studio',
          },

          acceptedQuotation: {
            id: preparedBooking.quotationId,
          },
        },

        submittedBy: {
          email: customerEmail,
          firstName: 'Maya',
          lastName: 'Fernando',
        },

        reviewedBy: null,
      });

      expect(Number(response.body.data.amount)).toBe(50000);

      const savedPayment = await prisma.payment.findFirst({
        where: {
          bookingId: preparedBooking.bookingId,
        },
      });

      expect(savedPayment).not.toBeNull();
      expect(savedPayment?.status).toBe(PaymentStatus.PENDING);
      expect(savedPayment?.amount.toFixed(2)).toBe('50000.00');
      expect(savedPayment?.submittedById).toBe(preparedBooking.customerUserId);
    });

    it('does not allow the customer to submit an arbitrary amount', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      const response = await submitCustomerPaymentRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
        {
          amount: 1,
        },
      );

      expect(response.status).toBe(201);
      expect(Number(response.body.data.amount)).toBe(50000);

      const savedPayment = await prisma.payment.findFirstOrThrow({
        where: {
          bookingId: preparedBooking.bookingId,
        },
      });

      expect(savedPayment.amount.toFixed(2)).toBe('50000.00');
    });

    it('rejects another payment while one is pending', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      await submitCustomerPaymentRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      const response = await submitCustomerPaymentRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
        {
          referenceNumber: 'TXN-2026-009999',
        },
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_ALREADY_PENDING');
    });

    it('does not allow another customer to pay for the booking', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      const secondCustomerRegistration = await registerCustomer(secondCustomerPayload);

      const response = await submitCustomerPaymentRequest(
        secondCustomerRegistration.body.data.accessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CUSTOMER_BOOKING_NOT_FOUND');
    });
  });

  describe('GET /api/v1/bookings/customer/:bookingId/payments', () => {
    it('returns the customer payment history', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      const submissionResponse = await submitCustomerPaymentRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      const response = await getCustomerPaymentsRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.count).toBe(1);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        id: submissionResponse.body.data.id,
        bookingId: preparedBooking.bookingId,
        status: PaymentStatus.PENDING,
        referenceNumber: 'TXN-2026-001234',
      });
    });
  });

    describe('POST /api/v1/payments/bookings/:bookingId/checkout-session', () => {
    it('rejects Stripe checkout requests without authentication', async () => {
      const response = await request(app).post(
        '/api/v1/payments/bookings/clx0000000000000000000000/checkout-session',
      );

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('creates a Stripe checkout session for the required deposit', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      const response = await createStripeCheckoutSessionRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Stripe checkout session created successfully');

      expect(response.body.data.checkout).toMatchObject({
        sessionId: 'cs_test_deposit_payment',
        checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_deposit_payment',
      });

      expect(response.body.data.payment).toMatchObject({
        bookingId: preparedBooking.bookingId,
        submittedById: preparedBooking.customerUserId,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.STRIPE_CHECKOUT,
        referenceNumber: 'cs_test_deposit_payment',
      });

      expect(Number(response.body.data.payment.amount)).toBe(50000);

      expect(mockedStripeCheckoutSessionCreate).toHaveBeenCalledTimes(1);

      const checkoutInput = mockedStripeCheckoutSessionCreate.mock.calls[0]?.[0];

      expect(checkoutInput).toMatchObject({
        mode: 'payment',
        customer_email: customerEmail,
        client_reference_id: response.body.data.payment.id,
        success_url:
          'http://localhost:5173/payments/success?session_id=%7BCHECKOUT_SESSION_ID%7D',
        cancel_url: `http://localhost:5173/payments/cancel?bookingId=${preparedBooking.bookingId}`,

        metadata: {
          paymentId: response.body.data.payment.id,
          bookingId: preparedBooking.bookingId,
          customerId: preparedBooking.customerUserId,
        },
      });

      expect(checkoutInput?.line_items).toHaveLength(1);
      expect(checkoutInput?.line_items?.[0]).toMatchObject({
        quantity: 1,

        price_data: {
          currency: 'lkr',
          unit_amount: 5000000,

          product_data: {
            name: 'Deposit payment for Deposit Payment Wedding',
            description: 'Vendor: Payment Photography Studio',
          },
        },
      });

      const savedPayment = await prisma.payment.findUniqueOrThrow({
        where: {
          id: response.body.data.payment.id,
        },
      });

      expect(savedPayment.status).toBe(PaymentStatus.PENDING);
      expect(savedPayment.method).toBe(PaymentMethod.STRIPE_CHECKOUT);
      expect(savedPayment.referenceNumber).toBe('cs_test_deposit_payment');
      expect(savedPayment.amount.toFixed(2)).toBe('50000.00');
    });

    it('removes the pending payment if Stripe checkout creation fails', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      mockedStripeCheckoutSessionCreate.mockRejectedValueOnce(new Error('Stripe is unavailable'));

      const response = await createStripeCheckoutSessionRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(500);

      const payments = await prisma.payment.findMany({
        where: {
          bookingId: preparedBooking.bookingId,
        },
      });

      expect(payments).toHaveLength(0);
    });

    it('rejects another Stripe checkout while one payment is pending', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      await createStripeCheckoutSessionRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      const response = await createStripeCheckoutSessionRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_ALREADY_PENDING');
    });
  });

  describe('POST /api/v1/payments/stripe/webhook', () => {
    it('verifies a completed Stripe checkout session and activates the booking', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      const checkoutResponse = await createStripeCheckoutSessionRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      const paymentId = checkoutResponse.body.data.payment.id as string;

      mockedConstructStripeWebhookEvent.mockReturnValue({
        id: 'evt_test_checkout_completed',
        type: 'checkout.session.completed',

        data: {
          object: {
            id: 'cs_test_deposit_payment',
            payment_status: 'paid',

            metadata: {
              paymentId,
              bookingId: preparedBooking.bookingId,
              customerId: preparedBooking.customerUserId,
            },
          },
        },
      } as never);

      const response = await sendStripeWebhookRequest();

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        received: true,
        processed: true,
      });

      expect(mockedConstructStripeWebhookEvent).toHaveBeenCalledTimes(1);

      const savedPayment = await prisma.payment.findUniqueOrThrow({
        where: {
          id: paymentId,
        },
      });

      expect(savedPayment.status).toBe(PaymentStatus.VERIFIED);
      expect(savedPayment.reviewedById).toBeNull();
      expect(savedPayment.reviewedAt).not.toBeNull();

      const booking = await prisma.booking.findUniqueOrThrow({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(booking.status).toBe(BookingStatus.ACTIVE);
    });

    it('ignores Stripe checkout sessions that are not paid', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      const checkoutResponse = await createStripeCheckoutSessionRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      const paymentId = checkoutResponse.body.data.payment.id as string;

      mockedConstructStripeWebhookEvent.mockReturnValue({
        id: 'evt_test_checkout_unpaid',
        type: 'checkout.session.completed',

        data: {
          object: {
            id: 'cs_test_deposit_payment',
            payment_status: 'unpaid',

            metadata: {
              paymentId,
            },
          },
        },
      } as never);

      const response = await sendStripeWebhookRequest();

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        received: true,
        processed: false,
        reason: 'CHECKOUT_SESSION_NOT_PAID',
      });

      const savedPayment = await prisma.payment.findUniqueOrThrow({
        where: {
          id: paymentId,
        },
      });

      expect(savedPayment.status).toBe(PaymentStatus.PENDING);
    });

    it('rejects webhook requests with an invalid Stripe signature', async () => {
      mockedConstructStripeWebhookEvent.mockImplementationOnce(() => {
        throw new Error('Invalid Stripe webhook signature');
      });

      const response = await sendStripeWebhookRequest();

      expect(response.status).toBe(500);
      expect(mockedConstructStripeWebhookEvent).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Admin payment review API', () => {
    it('returns pending payments to an admin', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      const submissionResponse = await submitCustomerPaymentRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      const adminAccessToken = await loginTestAdmin();

      const response = await getPendingAdminPaymentsRequest(adminAccessToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        id: submissionResponse.body.data.id,
        bookingId: preparedBooking.bookingId,
        status: PaymentStatus.PENDING,
        referenceNumber: 'TXN-2026-001234',
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

    it('returns payment details to an admin', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      const submissionResponse = await submitCustomerPaymentRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminPaymentRequest(
        adminAccessToken,
        submissionResponse.body.data.id,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: submissionResponse.body.data.id,
        bookingId: preparedBooking.bookingId,
        status: PaymentStatus.PENDING,
        referenceNumber: 'TXN-2026-001234',
      });
    });

    it('rejects a pending payment and permits resubmission', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      const submissionResponse = await submitCustomerPaymentRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      const adminAccessToken = await loginTestAdmin();

      const rejectionResponse = await rejectAdminPaymentRequest(
        adminAccessToken,
        submissionResponse.body.data.id,
      );

      expect(rejectionResponse.status).toBe(200);
      expect(rejectionResponse.body.data.status).toBe(PaymentStatus.REJECTED);
      expect(rejectionResponse.body.data.rejectionReason).toBe(
        'The submitted bank reference could not be verified.',
      );
      expect(rejectionResponse.body.data.reviewedBy.email).toBe(adminEmail);

      const booking = await prisma.booking.findUniqueOrThrow({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(booking.status).toBe(BookingStatus.DEPOSIT_PENDING);

      const resubmissionResponse = await submitCustomerPaymentRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
        {
          referenceNumber: 'TXN-2026-NEW-001',
        },
      );

      expect(resubmissionResponse.status).toBe(201);
      expect(resubmissionResponse.body.data.status).toBe(PaymentStatus.PENDING);
      expect(resubmissionResponse.body.data.referenceNumber).toBe('TXN-2026-NEW-001');

      const payments = await prisma.payment.findMany({
        where: {
          bookingId: preparedBooking.bookingId,
        },

        orderBy: {
          createdAt: 'asc',
        },
      });

      expect(payments).toHaveLength(2);

      const [rejectedPayment, pendingPayment] = payments;

      expect(rejectedPayment).toBeDefined();
      expect(pendingPayment).toBeDefined();

      expect(rejectedPayment!.status).toBe(PaymentStatus.REJECTED);

      expect(pendingPayment!.status).toBe(PaymentStatus.PENDING);
    });

    it('verifies a payment and activates the booking', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      const submissionResponse = await submitCustomerPaymentRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      const adminAccessToken = await loginTestAdmin();

      const response = await verifyAdminPaymentRequest(
        adminAccessToken,
        submissionResponse.body.data.id,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(PaymentStatus.VERIFIED);
      expect(response.body.data.reviewedBy.email).toBe(adminEmail);
      expect(response.body.data.reviewedAt).toEqual(expect.any(String));

      const savedPayment = await prisma.payment.findUniqueOrThrow({
        where: {
          id: submissionResponse.body.data.id,
        },
      });

      expect(savedPayment.status).toBe(PaymentStatus.VERIFIED);
      expect(savedPayment.reviewedById).not.toBeNull();
      expect(savedPayment.reviewedAt).not.toBeNull();

      const booking = await prisma.booking.findUniqueOrThrow({
        where: {
          id: preparedBooking.bookingId,
        },
      });

      expect(booking.status).toBe(BookingStatus.ACTIVE);
    });

    it('does not allow a reviewed payment to be reviewed again', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      const submissionResponse = await submitCustomerPaymentRequest(
        preparedBooking.customerAccessToken,
        preparedBooking.bookingId,
      );

      const adminAccessToken = await loginTestAdmin();

      await verifyAdminPaymentRequest(adminAccessToken, submissionResponse.body.data.id);

      const response = await rejectAdminPaymentRequest(
        adminAccessToken,
        submissionResponse.body.data.id,
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_NOT_PENDING');
    });

    it('rejects non-admin access to pending payments', async () => {
      const preparedBooking = await prepareDepositPendingBooking();

      const response = await getPendingAdminPaymentsRequest(preparedBooking.customerAccessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
});
