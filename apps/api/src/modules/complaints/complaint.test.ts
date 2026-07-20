import bcrypt from 'bcryptjs';
import {
  AccountStatus,
  BookingStatus,
  ComplaintActionType,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintType,
  NotificationType,
  UserRole,
  EventStatus,
  PaymentMethod,
  PaymentStatus,
  QuotationRequestStatus,
  QuotationStatus,
} from '@prisma/client';
import request from 'supertest';

import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const CUSTOMER_EMAIL = 'complaint-customer@example.com';
const SECOND_CUSTOMER_EMAIL = 'complaint-second-customer@example.com';
const VENDOR_EMAIL = 'complaint-vendor@example.com';
const ADMIN_EMAIL = 'complaint-admin@example.com';
const INACTIVE_ADMIN_EMAIL = 'complaint-inactive-admin@example.com';

const CUSTOMER_PASSWORD = 'Customer@2026';
const VENDOR_PASSWORD = 'Vendor@2026';
const ADMIN_PASSWORD = 'Admin@2026';

const REPLACEMENT_ADMIN_EMAIL = 'complaint-replacement-admin@example.com';

const customerPayload = {
  email: CUSTOMER_EMAIL,
  password: CUSTOMER_PASSWORD,
  firstName: 'Maya',
  lastName: 'Fernando',
  phone: {
    country: 'LK',
    number: '0771234567',
  },
};

const secondCustomerPayload = {
  email: SECOND_CUSTOMER_EMAIL,
  password: CUSTOMER_PASSWORD,
  firstName: 'Nila',
  lastName: 'Perera',
  phone: {
    country: 'LK',
    number: '0777654321',
  },
};

const vendorPayload = {
  email: VENDOR_EMAIL,
  password: VENDOR_PASSWORD,
  firstName: 'Ravi',
  lastName: 'Perera',
  businessName: 'Complaint Photography Studio',
};

const testEmails = [
  CUSTOMER_EMAIL,
  SECOND_CUSTOMER_EMAIL,
  VENDOR_EMAIL,
  ADMIN_EMAIL,
  INACTIVE_ADMIN_EMAIL,
  REPLACEMENT_ADMIN_EMAIL,
];

const clearTestData = async () => {
  await prisma.notification.deleteMany({
    where: {
      OR: [
        {
          recipient: {
            email: {
              in: testEmails,
            },
          },
        },
        {
          entityType: 'COMPLAINT',
        },
      ],
    },
  });

  await prisma.complaint.deleteMany({
    where: {
      OR: [
        {
          complainant: {
            email: {
              in: testEmails,
            },
          },
        },
        {
          respondent: {
            email: {
              in: testEmails,
            },
          },
        },
        {
          assignedAdmin: {
            email: {
              in: testEmails,
            },
          },
        },
      ],
    },
  });

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
        {
          booking: {
            vendor: {
              user: {
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

  await prisma.review.deleteMany({
    where: {
      OR: [
        {
          customer: {
            email: {
              in: testEmails,
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

  await prisma.quotation.deleteMany({
    where: {
      quotationRequest: {
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
  payload: typeof customerPayload | typeof secondCustomerPayload = customerPayload,
) => {
  const response = await request(app)
    .post('/api/v1/auth/register/customer')
    .send(payload)
    .expect(201);

  return {
    accessToken: response.body.data.accessToken as string,
    userId: response.body.data.user.id as string,
  };
};

const registerVendor = async () => {
  const response = await request(app)
    .post('/api/v1/auth/register/vendor')
    .send(vendorPayload)
    .expect(201);

  const userId = response.body.data.user.id as string;

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

  return {
    accessToken: response.body.data.accessToken as string,
    userId,
    vendorId: vendor.id,
  };
};

const prepareLinkedComplaintFixture = async () => {
  const customer = await registerCustomer();
  const secondCustomer = await registerCustomer(secondCustomerPayload);
  const vendor = await registerVendor();

  const category = await prisma.serviceCategory.findUnique({
    where: {
      slug: 'photography',
    },
  });

  if (!category) {
    throw new Error('Photography category must exist in the test database');
  }

  const servicePackage = await prisma.servicePackage.create({
    data: {
      vendorId: vendor.vendorId,
      categoryId: category.id,
      title: 'Complaint Photography Package',
      description: 'Professional event photography for complaint integration testing.',
      basePrice: 175000,
      isActive: true,
    },
  });

  const event = await prisma.event.create({
    data: {
      ownerId: customer.userId,
      name: 'Complaint Fixture Wedding',
      eventType: 'Wedding',
      eventDate: new Date('2032-08-20T09:00:00.000Z'),
      location: 'Colombo',
      guestCount: 200,
      plannedBudget: 2000000,
      theme: 'Classic Garden',
      requirements: 'Photography, decorations, catering, and event coordination.',
      status: EventStatus.PLANNING,
    },
  });

  const quotationRequest = await prisma.quotationRequest.create({
    data: {
      eventId: event.id,
      vendorId: vendor.vendorId,
      packageId: servicePackage.id,
      requirements: 'Full-day professional photography and edited digital photographs.',
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
      inclusions: 'Full-day photography, edited photographs, and an online gallery.',
      exclusions: 'Printed albums are not included.',
      terms: 'A deposit is required before the event date.',
      expiresAt: new Date('2032-07-20T09:00:00.000Z'),
    },
  });

  const booking = await prisma.booking.create({
    data: {
      eventId: event.id,
      vendorId: vendor.vendorId,
      acceptedQuotationId: quotation.id,
      agreedCost: 175000,
      serviceStart: new Date('2032-08-20T08:00:00.000Z'),
      serviceEnd: new Date('2032-08-20T18:00:00.000Z'),
      status: BookingStatus.COMPLETED,
      vendorCompletedAt: new Date('2032-08-20T18:30:00.000Z'),
    },
  });

  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      submittedById: customer.userId,
      amount: 50000,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.BANK_TRANSFER,
      referenceNumber: 'COMPLAINT-PAYMENT-001',
    },
  });

  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      customerId: customer.userId,
      vendorId: vendor.vendorId,
      packageId: servicePackage.id,
      overallRating: 4,
      serviceRating: 4,
      communicationRating: 3,
      comment: 'The service was completed, but there were communication issues.',
    },
  });

  return {
    customer,
    secondCustomer,
    vendor,
    event,
    servicePackage,
    quotationRequest,
    quotation,
    booking,
    payment,
    review,
  };
};

const createTestAdministrator = async (
  email: string,
  status: AccountStatus = AccountStatus.ACTIVE,
) => {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: status === AccountStatus.ACTIVE ? 'Complaint' : 'Inactive',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
      status,
    },
  });
};

const loginAdministrator = async (email: string = ADMIN_EMAIL) => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email,
      password: ADMIN_PASSWORD,
    })
    .expect(200);

  return response.body.data.accessToken as string;
};

const createPlatformComplaintRequest = (
  accessToken: string,
  overrides: Record<string, unknown> = {},
) => {
  return request(app)
    .post('/api/v1/complaints')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      type: ComplaintType.PLATFORM,
      subject: 'Unable to complete an important platform action',
      description:
        'The platform repeatedly prevented me from completing an important event management action.',
      ...overrides,
    });
};

const createUserConductComplaintRequest = (accessToken: string, respondentId: string) => {
  return request(app)
    .post('/api/v1/complaints')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      type: ComplaintType.USER_CONDUCT,
      subject: 'Inappropriate communication from another user',
      description:
        'The other user repeatedly sent inappropriate messages during our platform interaction.',
      respondentId,
    });
};

const createLinkedComplaintRequest = (accessToken: string, body: Record<string, unknown>) => {
  return request(app)
    .post('/api/v1/complaints')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

const getMyComplaintsRequest = (accessToken: string) => {
  return request(app).get('/api/v1/complaints/me').set('Authorization', `Bearer ${accessToken}`);
};

const getComplaintByIdRequest = (accessToken: string, complaintId: string) => {
  return request(app)
    .get(`/api/v1/complaints/${complaintId}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const addComplaintMessageRequest = (
  accessToken: string,
  complaintId: string,
  body: Record<string, unknown> = {},
) => {
  return request(app)
    .post(`/api/v1/complaints/${complaintId}/messages`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      body: 'Here is some additional information about this complaint.',
      ...body,
    });
};

const closeComplaintRequest = (
  accessToken: string,
  complaintId: string,
  body: Record<string, unknown> = {},
) => {
  return request(app)
    .patch(`/api/v1/complaints/${complaintId}/close`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

const getAdminComplaintsRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/admin/complaints${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getAdminComplaintByIdRequest = (accessToken: string, complaintId: string) => {
  return request(app)
    .get(`/api/v1/admin/complaints/${complaintId}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const updateAdminComplaintStatusRequest = (
  accessToken: string,
  complaintId: string,
  body: Record<string, unknown> = {},
) => {
  return request(app)
    .patch(`/api/v1/admin/complaints/${complaintId}/status`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

const updateAdminComplaintAssignmentRequest = (
  accessToken: string,
  complaintId: string,
  body: Record<string, unknown> = {},
) => {
  return request(app)
    .patch(`/api/v1/admin/complaints/${complaintId}/assignment`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

const updateAdminComplaintPriorityRequest = (
  accessToken: string,
  complaintId: string,
  body: Record<string, unknown> = {},
) => {
  return request(app)
    .patch(`/api/v1/admin/complaints/${complaintId}/priority`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

const reopenAdminComplaintRequest = (
  accessToken: string,
  complaintId: string,
  body: Record<string, unknown> = {},
) => {
  return request(app)
    .patch(`/api/v1/admin/complaints/${complaintId}/reopen`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

beforeEach(async () => {
  await clearTestData();
  await createTestAdministrator(ADMIN_EMAIL);
  await createTestAdministrator(INACTIVE_ADMIN_EMAIL, AccountStatus.SUSPENDED);
});

afterEach(async () => {
  await clearTestData();
});

afterAll(async () => {
  await clearTestData();
  await prisma.$disconnect();
});

describe('Complaint management API', () => {
  describe('authorization', () => {
    it('rejects unauthenticated complaint creation', async () => {
      const response = await request(app).post('/api/v1/complaints').send({
        type: ComplaintType.PLATFORM,
        subject: 'Unable to complete an important platform action',
        description:
          'The platform repeatedly prevented me from completing an important event management action.',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects administrators from submitting complaints', async () => {
      const adminAccessToken = await loginAdministrator();

      const response = await createPlatformComplaintRequest(adminAccessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('allows authenticated vendors to submit platform complaints', async () => {
      const vendor = await registerVendor();

      const response = await createPlatformComplaintRequest(vendor.accessToken);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.complainantId).toBe(vendor.userId);
      expect(response.body.data.type).toBe(ComplaintType.PLATFORM);
    });
  });

  describe('POST /api/v1/complaints', () => {
    it('creates a platform complaint with default state and audit action', async () => {
      const customer = await registerCustomer();

      const response = await createPlatformComplaintRequest(customer.accessToken);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      const complaintId = response.body.data.id as string;

      expect(response.body.data).toMatchObject({
        complainantId: customer.userId,
        respondentId: null,
        assignedAdminId: null,
        type: ComplaintType.PLATFORM,
        status: ComplaintStatus.OPEN,
        priority: ComplaintPriority.MEDIUM,
        bookingId: null,
        paymentId: null,
        reviewId: null,
        quotationRequestId: null,
        resolutionSummary: null,
        resolvedAt: null,
        closedAt: null,
      });

      const storedComplaint = await prisma.complaint.findUnique({
        where: {
          id: complaintId,
        },
      });

      expect(storedComplaint).not.toBeNull();
      expect(storedComplaint?.complainantId).toBe(customer.userId);
      expect(storedComplaint?.respondentId).toBeNull();
      expect(storedComplaint?.status).toBe(ComplaintStatus.OPEN);
      expect(storedComplaint?.priority).toBe(ComplaintPriority.MEDIUM);

      const actions = await prisma.complaintAction.findMany({
        where: {
          complaintId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        complaintId,
        performedById: customer.userId,
        action: ComplaintActionType.CREATED,
        reason: 'Complaint submitted',
      });

      expect(actions[0]?.metadata).toEqual({
        type: ComplaintType.PLATFORM,
        status: ComplaintStatus.OPEN,
        priority: ComplaintPriority.MEDIUM,
      });
    });

    it('notifies only active administrators about a new platform complaint', async () => {
      const customer = await registerCustomer();

      const activeAdmin = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const inactiveAdmin = await prisma.user.findUniqueOrThrow({
        where: {
          email: INACTIVE_ADMIN_EMAIL,
        },
      });

      const response = await createPlatformComplaintRequest(customer.accessToken);

      expect(response.status).toBe(201);

      const complaintId = response.body.data.id as string;

      const activeAdminNotifications = await prisma.notification.findMany({
        where: {
          recipientId: activeAdmin.id,
          type: NotificationType.COMPLAINT_CREATED,
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
      });

      expect(activeAdminNotifications).toHaveLength(1);
      expect(activeAdminNotifications[0]).toMatchObject({
        recipientId: activeAdmin.id,
        type: NotificationType.COMPLAINT_CREATED,
        title: 'New complaint submitted',
        entityType: 'COMPLAINT',
        entityId: complaintId,
        isRead: false,
      });

      const inactiveAdminNotifications = await prisma.notification.findMany({
        where: {
          recipientId: inactiveAdmin.id,
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
      });

      expect(inactiveAdminNotifications).toHaveLength(0);
    });

    it('creates a user-conduct complaint and notifies the respondent', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();

      const response = await createUserConductComplaintRequest(customer.accessToken, vendor.userId);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      const complaintId = response.body.data.id as string;

      expect(response.body.data).toMatchObject({
        complainantId: customer.userId,
        respondentId: vendor.userId,
        type: ComplaintType.USER_CONDUCT,
        status: ComplaintStatus.OPEN,
        priority: ComplaintPriority.MEDIUM,
      });

      const respondentNotifications = await prisma.notification.findMany({
        where: {
          recipientId: vendor.userId,
          type: NotificationType.COMPLAINT_CREATED,
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
      });

      expect(respondentNotifications).toHaveLength(1);
      expect(respondentNotifications[0]).toMatchObject({
        recipientId: vendor.userId,
        type: NotificationType.COMPLAINT_CREATED,
        title: 'Complaint submitted',
        entityType: 'COMPLAINT',
        entityId: complaintId,
        isRead: false,
      });
    });

    it('rejects a complaint against the authenticated user', async () => {
      const customer = await registerCustomer();

      const response = await createUserConductComplaintRequest(
        customer.accessToken,
        customer.userId,
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_SELF_RESPONDENT');

      const complaintCount = await prisma.complaint.count({
        where: {
          complainantId: customer.userId,
        },
      });

      expect(complaintCount).toBe(0);
    });

    it('rejects administrators as complaint respondents', async () => {
      const customer = await registerCustomer();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const response = await createUserConductComplaintRequest(
        customer.accessToken,
        administrator.id,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_RESPONDENT_NOT_FOUND');
    });

    it('rejects fields that do not belong to the selected complaint type', async () => {
      const customer = await registerCustomer();

      const response = await createPlatformComplaintRequest(customer.accessToken, {
        bookingId: 'clx0000000000000000000000',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');

      const complaintCount = await prisma.complaint.count({
        where: {
          complainantId: customer.userId,
        },
      });

      expect(complaintCount).toBe(0);
    });

    it('rejects complaint descriptions shorter than the minimum length', async () => {
      const customer = await registerCustomer();

      const response = await createPlatformComplaintRequest(customer.accessToken, {
        description: 'Too short',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates a booking complaint for the customer and derives the vendor respondent', async () => {
      const fixture = await prepareLinkedComplaintFixture();

      const response = await createLinkedComplaintRequest(fixture.customer.accessToken, {
        type: ComplaintType.BOOKING,
        subject: 'Problem with the confirmed booking arrangement',
        description:
          'The confirmed booking arrangement does not match what was agreed during the quotation process.',
        bookingId: fixture.booking.id,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        complainantId: fixture.customer.userId,
        respondentId: fixture.vendor.userId,
        type: ComplaintType.BOOKING,
        bookingId: fixture.booking.id,
        paymentId: null,
        reviewId: null,
        quotationRequestId: null,
      });

      expect(response.body.data.booking).toMatchObject({
        id: fixture.booking.id,
        event: {
          id: fixture.event.id,
          ownerId: fixture.customer.userId,
        },
        vendor: {
          id: fixture.vendor.vendorId,
          userId: fixture.vendor.userId,
        },
      });
    });

    it('allows the vendor to create a booking complaint against the customer', async () => {
      const fixture = await prepareLinkedComplaintFixture();

      const response = await createLinkedComplaintRequest(fixture.vendor.accessToken, {
        type: ComplaintType.BOOKING,
        subject: 'Customer issue affecting the confirmed booking',
        description:
          'The customer has not provided the information required to complete the confirmed booking correctly.',
        bookingId: fixture.booking.id,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        complainantId: fixture.vendor.userId,
        respondentId: fixture.customer.userId,
        type: ComplaintType.BOOKING,
        bookingId: fixture.booking.id,
      });
    });

    it('rejects a booking complaint from a user unrelated to the booking', async () => {
      const fixture = await prepareLinkedComplaintFixture();

      const response = await createLinkedComplaintRequest(fixture.secondCustomer.accessToken, {
        type: ComplaintType.BOOKING,
        subject: 'Complaint concerning an unrelated booking',
        description:
          'This complaint attempts to reference a booking that does not involve the authenticated user.',
        bookingId: fixture.booking.id,
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_RELATED_RECORD_NOT_FOUND');

      const complaintCount = await prisma.complaint.count({
        where: {
          complainantId: fixture.secondCustomer.userId,
        },
      });

      expect(complaintCount).toBe(0);
    });

    it('creates a payment complaint and stores both payment and booking references', async () => {
      const fixture = await prepareLinkedComplaintFixture();

      const response = await createLinkedComplaintRequest(fixture.customer.accessToken, {
        type: ComplaintType.PAYMENT,
        subject: 'Deposit payment has not been handled correctly',
        description:
          'The deposit payment is still unresolved even though the payment details were submitted correctly.',
        paymentId: fixture.payment.id,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        complainantId: fixture.customer.userId,
        respondentId: fixture.vendor.userId,
        type: ComplaintType.PAYMENT,
        bookingId: fixture.booking.id,
        paymentId: fixture.payment.id,
        reviewId: null,
        quotationRequestId: null,
      });

      expect(response.body.data.payment).toMatchObject({
        id: fixture.payment.id,
        bookingId: fixture.booking.id,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.BANK_TRANSFER,
        referenceNumber: 'COMPLAINT-PAYMENT-001',
      });
    });

    it('rejects a payment complaint from a user unrelated to the payment booking', async () => {
      const fixture = await prepareLinkedComplaintFixture();

      const response = await createLinkedComplaintRequest(fixture.secondCustomer.accessToken, {
        type: ComplaintType.PAYMENT,
        subject: 'Complaint concerning an unrelated payment',
        description:
          'This complaint attempts to reference a payment belonging to a completely unrelated booking.',
        paymentId: fixture.payment.id,
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_RELATED_RECORD_NOT_FOUND');
    });

    it('creates a review complaint and stores both review and booking references', async () => {
      const fixture = await prepareLinkedComplaintFixture();

      const response = await createLinkedComplaintRequest(fixture.vendor.accessToken, {
        type: ComplaintType.REVIEW,
        subject: 'Customer review contains disputed information',
        description:
          'The customer review contains statements that do not accurately reflect the service that was delivered.',
        reviewId: fixture.review.id,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        complainantId: fixture.vendor.userId,
        respondentId: fixture.customer.userId,
        type: ComplaintType.REVIEW,
        bookingId: fixture.booking.id,
        paymentId: null,
        reviewId: fixture.review.id,
        quotationRequestId: null,
      });

      expect(response.body.data.review).toMatchObject({
        id: fixture.review.id,
        bookingId: fixture.booking.id,
        customerId: fixture.customer.userId,
        vendorId: fixture.vendor.vendorId,
        overallRating: 4,
      });
    });

    it('rejects a review complaint from a user unrelated to the review', async () => {
      const fixture = await prepareLinkedComplaintFixture();

      const response = await createLinkedComplaintRequest(fixture.secondCustomer.accessToken, {
        type: ComplaintType.REVIEW,
        subject: 'Complaint concerning an unrelated customer review',
        description:
          'This complaint attempts to reference a review that does not involve the authenticated customer.',
        reviewId: fixture.review.id,
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_RELATED_RECORD_NOT_FOUND');
    });

    it('creates a quotation complaint and derives the opposing participant', async () => {
      const fixture = await prepareLinkedComplaintFixture();

      const response = await createLinkedComplaintRequest(fixture.customer.accessToken, {
        type: ComplaintType.QUOTATION,
        subject: 'Quotation terms differ from the discussed requirements',
        description:
          'The quotation terms do not properly reflect the requirements that were supplied with the quotation request.',
        quotationRequestId: fixture.quotationRequest.id,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        complainantId: fixture.customer.userId,
        respondentId: fixture.vendor.userId,
        type: ComplaintType.QUOTATION,
        bookingId: null,
        paymentId: null,
        reviewId: null,
        quotationRequestId: fixture.quotationRequest.id,
      });

      expect(response.body.data.quotationRequest).toMatchObject({
        id: fixture.quotationRequest.id,
        status: QuotationRequestStatus.ACCEPTED,
        event: {
          id: fixture.event.id,
          ownerId: fixture.customer.userId,
        },
        vendor: {
          id: fixture.vendor.vendorId,
          userId: fixture.vendor.userId,
        },
      });
    });

    it('rejects a quotation complaint from a user unrelated to the quotation request', async () => {
      const fixture = await prepareLinkedComplaintFixture();

      const response = await createLinkedComplaintRequest(fixture.secondCustomer.accessToken, {
        type: ComplaintType.QUOTATION,
        subject: 'Complaint concerning an unrelated quotation request',
        description:
          'This complaint attempts to reference a quotation request that does not involve the authenticated user.',
        quotationRequestId: fixture.quotationRequest.id,
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_RELATED_RECORD_NOT_FOUND');
    });

    it.each([
      {
        type: ComplaintType.BOOKING,
        field: 'bookingId',
        expectedCode: 'COMPLAINT_BOOKING_NOT_FOUND',
      },
      {
        type: ComplaintType.PAYMENT,
        field: 'paymentId',
        expectedCode: 'COMPLAINT_PAYMENT_NOT_FOUND',
      },
      {
        type: ComplaintType.REVIEW,
        field: 'reviewId',
        expectedCode: 'COMPLAINT_REVIEW_NOT_FOUND',
      },
      {
        type: ComplaintType.QUOTATION,
        field: 'quotationRequestId',
        expectedCode: 'COMPLAINT_QUOTATION_REQUEST_NOT_FOUND',
      },
    ])(
      'rejects a $type complaint when its linked record does not exist',
      async ({ type, field, expectedCode }) => {
        const customer = await registerCustomer();

        const response = await createLinkedComplaintRequest(customer.accessToken, {
          type,
          subject: 'The selected linked platform record cannot be found',
          description:
            'The complaint references a linked platform record that does not exist in the system.',
          [field]: 'clx0000000000000000000000',
        });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe(expectedCode);
      },
    );
  });

  describe('GET /api/v1/complaints/me', () => {
    it('lists a complaint for both its complainant and respondent', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const complainantResponse = await getMyComplaintsRequest(customer.accessToken);

      expect(complainantResponse.status).toBe(200);
      expect(complainantResponse.body.success).toBe(true);
      expect(complainantResponse.body.data).toHaveLength(1);
      expect(complainantResponse.body.data[0].id).toBe(complaintId);
      expect(complainantResponse.body.meta.pagination.total).toBe(1);

      const respondentResponse = await getMyComplaintsRequest(vendor.accessToken);

      expect(respondentResponse.status).toBe(200);
      expect(respondentResponse.body.success).toBe(true);
      expect(respondentResponse.body.data).toHaveLength(1);
      expect(respondentResponse.body.data[0].id).toBe(complaintId);
      expect(respondentResponse.body.meta.pagination.total).toBe(1);
    });

    it('does not expose unrelated complaints', async () => {
      const customer = await registerCustomer();
      const secondCustomer = await registerCustomer(secondCustomerPayload);
      const vendor = await registerVendor();

      await createUserConductComplaintRequest(customer.accessToken, vendor.userId).expect(201);

      const response = await getMyComplaintsRequest(secondCustomer.accessToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });
  });

  describe('GET /api/v1/complaints/:complaintId', () => {
    it('allows both the complainant and respondent to view the complaint', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const complainantResponse = await getComplaintByIdRequest(customer.accessToken, complaintId);

      expect(complainantResponse.status).toBe(200);
      expect(complainantResponse.body.success).toBe(true);
      expect(complainantResponse.body.data).toMatchObject({
        id: complaintId,
        complainantId: customer.userId,
        respondentId: vendor.userId,
        type: ComplaintType.USER_CONDUCT,
      });

      const respondentResponse = await getComplaintByIdRequest(vendor.accessToken, complaintId);

      expect(respondentResponse.status).toBe(200);
      expect(respondentResponse.body.success).toBe(true);
      expect(respondentResponse.body.data.id).toBe(complaintId);
    });

    it('returns not found to an unrelated authenticated user', async () => {
      const customer = await registerCustomer();
      const secondCustomer = await registerCustomer(secondCustomerPayload);
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await getComplaintByIdRequest(secondCustomer.accessToken, complaintId);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_NOT_FOUND');
    });

    it('validates the complaint ID format', async () => {
      const customer = await registerCustomer();

      const response = await getComplaintByIdRequest(customer.accessToken, 'not-a-valid-cuid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/admin/complaints', () => {
    it('rejects unauthenticated requests', async () => {
      const response = await request(app).get('/api/v1/admin/complaints');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-administrators', async () => {
      const customer = await registerCustomer();

      const response = await getAdminComplaintsRequest(customer.accessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('allows an administrator to list every complaint', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();
      const adminAccessToken = await loginAdministrator();

      const platformComplaintResponse = await createPlatformComplaintRequest(customer.accessToken, {
        subject: 'Platform dashboard is not loading correctly',
        description:
          'The platform dashboard remains unavailable and prevents normal event-planning work from being completed.',
      });

      const conductComplaintResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(platformComplaintResponse.status).toBe(201);
      expect(conductComplaintResponse.status).toBe(201);

      const conductComplaintId = conductComplaintResponse.body.data.id as string;

      await addComplaintMessageRequest(customer.accessToken, conductComplaintId, {
        body: 'This message provides further context for administrator review.',
      }).expect(201);

      const response = await getAdminComplaintsRequest(adminAccessToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const platformComplaint = response.body.data.find(
        (complaint: { id: string }) => complaint.id === platformComplaintResponse.body.data.id,
      );

      expect(platformComplaint).toMatchObject({
        complainantId: customer.userId,
        respondentId: null,
        assignedAdminId: null,
        type: ComplaintType.PLATFORM,
        status: ComplaintStatus.OPEN,
        priority: ComplaintPriority.MEDIUM,
        complainant: {
          id: customer.userId,
          email: CUSTOMER_EMAIL,
          firstName: 'Maya',
          lastName: 'Fernando',
          role: UserRole.CUSTOMER,
        },
        respondent: null,
        assignedAdmin: null,
        _count: {
          messages: 0,
          actions: 1,
        },
      });

      const conductComplaint = response.body.data.find(
        (complaint: { id: string }) => complaint.id === conductComplaintId,
      );

      expect(conductComplaint).toMatchObject({
        complainantId: customer.userId,
        respondentId: vendor.userId,
        type: ComplaintType.USER_CONDUCT,
        respondent: {
          id: vendor.userId,
          email: VENDOR_EMAIL,
          firstName: 'Ravi',
          lastName: 'Perera',
          role: UserRole.VENDOR,
        },
        _count: {
          messages: 1,
          actions: 1,
        },
      });
    });

    it('filters complaints by status, type, and priority', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();
      const adminAccessToken = await loginAdministrator();

      const platformComplaintResponse = await createPlatformComplaintRequest(customer.accessToken);

      const conductComplaintResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(platformComplaintResponse.status).toBe(201);
      expect(conductComplaintResponse.status).toBe(201);

      const conductComplaintId = conductComplaintResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: conductComplaintId,
        },
        data: {
          status: ComplaintStatus.UNDER_REVIEW,
          priority: ComplaintPriority.HIGH,
        },
      });

      const response = await getAdminComplaintsRequest(
        adminAccessToken,
        `?status=${ComplaintStatus.UNDER_REVIEW}&type=${ComplaintType.USER_CONDUCT}&priority=${ComplaintPriority.HIGH}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        id: conductComplaintId,
        status: ComplaintStatus.UNDER_REVIEW,
        type: ComplaintType.USER_CONDUCT,
        priority: ComplaintPriority.HIGH,
      });

      expect(response.body.meta.pagination.total).toBe(1);
    });

    it('searches complaints by subject without case sensitivity', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const matchingComplaintResponse = await createPlatformComplaintRequest(customer.accessToken, {
        subject: 'Billing Dashboard Displays Incorrect Totals',
        description:
          'The billing dashboard displays totals that do not match the payment records stored for the event.',
      });

      await createPlatformComplaintRequest(customer.accessToken, {
        subject: 'Unable to update the event location',
        description:
          'The event location cannot be updated even though all required information has been supplied.',
      }).expect(201);

      expect(matchingComplaintResponse.status).toBe(201);

      const response = await getAdminComplaintsRequest(
        adminAccessToken,
        '?search=billing%20dashboard',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(matchingComplaintResponse.body.data.id);
      expect(response.body.meta.pagination.total).toBe(1);
    });

    it('filters assigned and unassigned complaints', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const assignedComplaintResponse = await createPlatformComplaintRequest(customer.accessToken, {
        subject: 'Assigned platform complaint for administrator review',
        description:
          'This platform complaint will be assigned directly to an administrator for focused testing.',
      });

      const unassignedComplaintResponse = await createPlatformComplaintRequest(
        customer.accessToken,
        {
          subject: 'Unassigned platform complaint awaiting review',
          description:
            'This platform complaint will remain unassigned while the administrator list filters are tested.',
        },
      );

      expect(assignedComplaintResponse.status).toBe(201);
      expect(unassignedComplaintResponse.status).toBe(201);

      const assignedComplaintId = assignedComplaintResponse.body.data.id as string;
      const unassignedComplaintId = unassignedComplaintResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: assignedComplaintId,
        },
        data: {
          assignedAdminId: administrator.id,
        },
      });

      const assignedResponse = await getAdminComplaintsRequest(
        adminAccessToken,
        '?assignment=assigned',
      );

      expect(assignedResponse.status).toBe(200);
      expect(assignedResponse.body.data).toHaveLength(1);
      expect(assignedResponse.body.data[0]).toMatchObject({
        id: assignedComplaintId,
        assignedAdminId: administrator.id,
        assignedAdmin: {
          id: administrator.id,
          email: ADMIN_EMAIL,
        },
      });

      const unassignedResponse = await getAdminComplaintsRequest(
        adminAccessToken,
        '?assignment=unassigned',
      );

      expect(unassignedResponse.status).toBe(200);
      expect(unassignedResponse.body.data).toHaveLength(1);
      expect(unassignedResponse.body.data[0]).toMatchObject({
        id: unassignedComplaintId,
        assignedAdminId: null,
        assignedAdmin: null,
      });

      const administratorResponse = await getAdminComplaintsRequest(
        adminAccessToken,
        `?assignedAdminId=${administrator.id}`,
      );

      expect(administratorResponse.status).toBe(200);
      expect(administratorResponse.body.data).toHaveLength(1);
      expect(administratorResponse.body.data[0].id).toBe(assignedComplaintId);
    });

    it('supports pagination and deterministic complaint sorting', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const olderComplaintResponse = await createPlatformComplaintRequest(customer.accessToken, {
        subject: 'Older platform complaint used for pagination',
        description:
          'This complaint represents the older record used to verify administrator pagination behavior.',
      });

      const newerComplaintResponse = await createPlatformComplaintRequest(customer.accessToken, {
        subject: 'Newer platform complaint used for pagination',
        description:
          'This complaint represents the newer record used to verify administrator pagination behavior.',
      });

      expect(olderComplaintResponse.status).toBe(201);
      expect(newerComplaintResponse.status).toBe(201);

      const olderComplaintId = olderComplaintResponse.body.data.id as string;
      const newerComplaintId = newerComplaintResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: olderComplaintId,
        },
        data: {
          createdAt: new Date('2030-01-01T00:00:00.000Z'),
        },
      });

      await prisma.complaint.update({
        where: {
          id: newerComplaintId,
        },
        data: {
          createdAt: new Date('2030-01-02T00:00:00.000Z'),
        },
      });

      const firstPageResponse = await getAdminComplaintsRequest(
        adminAccessToken,
        '?page=1&limit=1&sort=newest',
      );

      expect(firstPageResponse.status).toBe(200);
      expect(firstPageResponse.body.data).toHaveLength(1);
      expect(firstPageResponse.body.data[0].id).toBe(newerComplaintId);

      expect(firstPageResponse.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      });

      const secondPageResponse = await getAdminComplaintsRequest(
        adminAccessToken,
        '?page=2&limit=1&sort=newest',
      );

      expect(secondPageResponse.status).toBe(200);
      expect(secondPageResponse.body.data).toHaveLength(1);
      expect(secondPageResponse.body.data[0].id).toBe(olderComplaintId);

      expect(secondPageResponse.body.meta.pagination).toMatchObject({
        page: 2,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('rejects contradictory unassigned and administrator filters', async () => {
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const response = await getAdminComplaintsRequest(
        adminAccessToken,
        `?assignment=unassigned&assignedAdminId=${administrator.id}`,
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid complaint-list query values', async () => {
      const adminAccessToken = await loginAdministrator();

      const response = await getAdminComplaintsRequest(
        adminAccessToken,
        '?page=0&priority=CRITICAL&sort=unsupported',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/admin/complaints/:complaintId', () => {
    it('rejects unauthenticated requests', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await request(app).get(`/api/v1/admin/complaints/${complaintId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-administrators', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await getAdminComplaintByIdRequest(customer.accessToken, complaintId);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns complete complaint investigation details to an administrator', async () => {
      const fixture = await prepareLinkedComplaintFixture();
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const createResponse = await createLinkedComplaintRequest(fixture.customer.accessToken, {
        type: ComplaintType.PAYMENT,
        subject: 'Payment evidence requires administrator investigation',
        description:
          'The submitted payment evidence and booking records require a complete administrator investigation.',
        paymentId: fixture.payment.id,
      });

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const publicMessageResponse = await addComplaintMessageRequest(
        fixture.customer.accessToken,
        complaintId,
        {
          body: 'This public message contains additional payment evidence.',
        },
      );

      expect(publicMessageResponse.status).toBe(201);

      const internalMessage = await prisma.complaintMessage.create({
        data: {
          complaintId,
          authorId: administrator.id,
          body: 'Internal administrator note about the submitted payment evidence.',
          isInternal: true,
        },
      });

      await prisma.complaint.update({
        where: {
          id: complaintId,
        },
        data: {
          assignedAdminId: administrator.id,
          status: ComplaintStatus.UNDER_INVESTIGATION,
          priority: ComplaintPriority.HIGH,
        },
      });

      const statusAction = await prisma.complaintAction.create({
        data: {
          complaintId,
          performedById: administrator.id,
          action: ComplaintActionType.STATUS_CHANGED,
          reason: 'Complaint moved into administrator investigation',
          metadata: {
            previousStatus: ComplaintStatus.OPEN,
            newStatus: ComplaintStatus.UNDER_INVESTIGATION,
          },
        },
      });

      const response = await getAdminComplaintByIdRequest(adminAccessToken, complaintId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: complaintId,
        complainantId: fixture.customer.userId,
        respondentId: fixture.vendor.userId,
        assignedAdminId: administrator.id,
        type: ComplaintType.PAYMENT,
        status: ComplaintStatus.UNDER_INVESTIGATION,
        priority: ComplaintPriority.HIGH,
        bookingId: fixture.booking.id,
        paymentId: fixture.payment.id,
        reviewId: null,
        quotationRequestId: null,
        complainant: {
          id: fixture.customer.userId,
          email: CUSTOMER_EMAIL,
          firstName: 'Maya',
          lastName: 'Fernando',
          role: UserRole.CUSTOMER,
          status: AccountStatus.ACTIVE,
        },
        respondent: {
          id: fixture.vendor.userId,
          email: VENDOR_EMAIL,
          firstName: 'Ravi',
          lastName: 'Perera',
          role: UserRole.VENDOR,
          status: AccountStatus.ACTIVE,
        },
        assignedAdmin: {
          id: administrator.id,
          email: ADMIN_EMAIL,
          firstName: 'Complaint',
          lastName: 'Administrator',
          role: UserRole.ADMIN,
          status: AccountStatus.ACTIVE,
        },
        booking: {
          id: fixture.booking.id,
          event: {
            id: fixture.event.id,
            ownerId: fixture.customer.userId,
          },
          vendor: {
            id: fixture.vendor.vendorId,
            userId: fixture.vendor.userId,
          },
        },
        payment: {
          id: fixture.payment.id,
          bookingId: fixture.booking.id,
          status: PaymentStatus.PENDING,
          method: PaymentMethod.BANK_TRANSFER,
          referenceNumber: 'COMPLAINT-PAYMENT-001',
        },
        review: null,
        quotationRequest: null,
      });

      expect(response.body.data.messages).toHaveLength(2);

      expect(response.body.data.messages[0]).toMatchObject({
        id: publicMessageResponse.body.data.id,
        complaintId,
        authorId: fixture.customer.userId,
        body: 'This public message contains additional payment evidence.',
        isInternal: false,
        author: {
          id: fixture.customer.userId,
          email: CUSTOMER_EMAIL,
          role: UserRole.CUSTOMER,
        },
      });

      expect(response.body.data.messages[1]).toMatchObject({
        id: internalMessage.id,
        complaintId,
        authorId: administrator.id,
        body: 'Internal administrator note about the submitted payment evidence.',
        isInternal: true,
        author: {
          id: administrator.id,
          email: ADMIN_EMAIL,
          role: UserRole.ADMIN,
        },
      });

      expect(response.body.data.actions).toHaveLength(2);

      expect(response.body.data.actions[0]).toMatchObject({
        complaintId,
        performedById: fixture.customer.userId,
        action: ComplaintActionType.CREATED,
        reason: 'Complaint submitted',
        performedBy: {
          id: fixture.customer.userId,
          email: CUSTOMER_EMAIL,
          role: UserRole.CUSTOMER,
        },
      });

      expect(response.body.data.actions[1]).toMatchObject({
        id: statusAction.id,
        complaintId,
        performedById: administrator.id,
        action: ComplaintActionType.STATUS_CHANGED,
        reason: 'Complaint moved into administrator investigation',
        performedBy: {
          id: administrator.id,
          email: ADMIN_EMAIL,
          role: UserRole.ADMIN,
        },
      });

      expect(response.body.data.actions[1].metadata).toEqual({
        previousStatus: ComplaintStatus.OPEN,
        newStatus: ComplaintStatus.UNDER_INVESTIGATION,
      });
    });

    it('exposes internal administrator notes only through the administrator detail endpoint', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.complaintMessage.create({
        data: {
          complaintId,
          authorId: administrator.id,
          body: 'Administrator-only internal investigation note.',
          isInternal: true,
        },
      });

      const adminResponse = await getAdminComplaintByIdRequest(adminAccessToken, complaintId);

      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.data.messages).toHaveLength(1);
      expect(adminResponse.body.data.messages[0]).toMatchObject({
        body: 'Administrator-only internal investigation note.',
        isInternal: true,
      });

      const participantResponse = await getComplaintByIdRequest(customer.accessToken, complaintId);

      expect(participantResponse.status).toBe(200);

      expect(participantResponse.body.data.messages).toEqual([]);

      expect(participantResponse.body.data.actions).toHaveLength(1);
      expect(participantResponse.body.data.actions[0]).toMatchObject({
        complaintId,
        performedById: customer.userId,
        action: ComplaintActionType.CREATED,
        reason: 'Complaint submitted',
      });

      expect(
        participantResponse.body.data.messages.some(
          (message: { isInternal: boolean }) => message.isInternal,
        ),
      ).toBe(false);

      expect(
        participantResponse.body.data.messages.some(
          (message: { body: string }) =>
            message.body === 'Administrator-only internal investigation note.',
        ),
      ).toBe(false);
    });

    it('returns not found when the complaint does not exist', async () => {
      const adminAccessToken = await loginAdministrator();

      const response = await getAdminComplaintByIdRequest(
        adminAccessToken,
        'clx0000000000000000000000',
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_NOT_FOUND');
    });

    it('validates the complaint ID format', async () => {
      const adminAccessToken = await loginAdministrator();

      const response = await getAdminComplaintByIdRequest(adminAccessToken, 'not-a-valid-cuid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/admin/complaints/:complaintId/status', () => {
    it('rejects unauthenticated requests', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await request(app)
        .patch(`/api/v1/admin/complaints/${complaintId}/status`)
        .send({
          status: ComplaintStatus.UNDER_REVIEW,
          reason: 'Administrator review has started.',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-administrators', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintStatusRequest(customer.accessToken, complaintId, {
        status: ComplaintStatus.UNDER_REVIEW,
        reason: 'Administrator review has started.',
      });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('moves an open complaint under review and records the administrator action', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintStatusRequest(adminAccessToken, complaintId, {
        status: ComplaintStatus.UNDER_REVIEW,
        reason: 'The complaint has entered administrator review.',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Complaint status updated successfully');

      expect(response.body.data).toMatchObject({
        id: complaintId,
        status: ComplaintStatus.UNDER_REVIEW,
        resolutionSummary: null,
        resolvedAt: null,
        closedAt: null,
      });

      const statusAction = response.body.data.actions.find(
        (action: { action: ComplaintActionType }) =>
          action.action === ComplaintActionType.STATUS_CHANGED,
      );

      expect(statusAction).toMatchObject({
        complaintId,
        performedById: administrator.id,
        action: ComplaintActionType.STATUS_CHANGED,
        reason: 'The complaint has entered administrator review.',
        performedBy: {
          id: administrator.id,
          email: ADMIN_EMAIL,
          role: UserRole.ADMIN,
        },
      });

      expect(statusAction.metadata).toEqual({
        previousStatus: ComplaintStatus.OPEN,
        newStatus: ComplaintStatus.UNDER_REVIEW,
      });

      const storedComplaint = await prisma.complaint.findUniqueOrThrow({
        where: {
          id: complaintId,
        },
      });

      expect(storedComplaint.status).toBe(ComplaintStatus.UNDER_REVIEW);
      expect(storedComplaint.resolvedAt).toBeNull();
      expect(storedComplaint.resolutionSummary).toBeNull();

      const notifications = await prisma.notification.findMany({
        where: {
          type: NotificationType.COMPLAINT_STATUS_CHANGED,
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
        orderBy: {
          recipientId: 'asc',
        },
      });

      expect(notifications).toHaveLength(2);

      expect(notifications.map((notification) => notification.recipientId).sort()).toEqual(
        [customer.userId, vendor.userId].sort(),
      );

      for (const notification of notifications) {
        expect(notification).toMatchObject({
          type: NotificationType.COMPLAINT_STATUS_CHANGED,
          title: 'Complaint status updated',
          entityType: 'COMPLAINT',
          entityId: complaintId,
          isRead: false,
        });

        expect(notification.metadata).toEqual({
          complaintId,
          complaintType: ComplaintType.USER_CONDUCT,
          previousStatus: ComplaintStatus.OPEN,
          newStatus: ComplaintStatus.UNDER_REVIEW,
          changedById: administrator.id,
        });
      }
    });

    it.each([
      {
        status: ComplaintStatus.AWAITING_CUSTOMER_RESPONSE,
        reason: 'Additional evidence is required from the customer.',
      },
      {
        status: ComplaintStatus.AWAITING_VENDOR_RESPONSE,
        reason: 'Additional evidence is required from the vendor.',
      },
    ])('allows an administrator to move a complaint to $status', async ({ status, reason }) => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintStatusRequest(adminAccessToken, complaintId, {
        status,
        reason,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(status);
      expect(response.body.data.resolvedAt).toBeNull();
      expect(response.body.data.resolutionSummary).toBeNull();

      const action = response.body.data.actions.find(
        (item: { action: ComplaintActionType }) =>
          item.action === ComplaintActionType.STATUS_CHANGED,
      );

      expect(action.metadata).toEqual({
        previousStatus: ComplaintStatus.OPEN,
        newStatus: status,
      });
    });

    it('resolves a complaint with a resolution summary and completion timestamp', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const resolutionSummary =
        'The administrator reviewed the evidence and confirmed that the reported issue has been resolved.';

      const response = await updateAdminComplaintStatusRequest(adminAccessToken, complaintId, {
        status: ComplaintStatus.RESOLVED,
        reason: 'The investigation is complete and corrective action has been taken.',
        resolutionSummary,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: complaintId,
        status: ComplaintStatus.RESOLVED,
        resolutionSummary,
        closedAt: null,
      });

      expect(response.body.data.resolvedAt).not.toBeNull();

      const storedComplaint = await prisma.complaint.findUniqueOrThrow({
        where: {
          id: complaintId,
        },
      });

      expect(storedComplaint.status).toBe(ComplaintStatus.RESOLVED);
      expect(storedComplaint.resolutionSummary).toBe(resolutionSummary);
      expect(storedComplaint.resolvedAt).not.toBeNull();

      const action = await prisma.complaintAction.findFirst({
        where: {
          complaintId,
          action: ComplaintActionType.STATUS_CHANGED,
        },
      });

      expect(action).toMatchObject({
        complaintId,
        performedById: administrator.id,
        action: ComplaintActionType.STATUS_CHANGED,
        reason: 'The investigation is complete and corrective action has been taken.',
      });

      expect(action?.metadata).toEqual({
        previousStatus: ComplaintStatus.OPEN,
        newStatus: ComplaintStatus.RESOLVED,
        resolutionSummary,
      });
    });

    it('dismisses a complaint without storing a resolution summary', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintStatusRequest(adminAccessToken, complaintId, {
        status: ComplaintStatus.DISMISSED,
        reason: 'The supplied evidence does not support the complaint.',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: complaintId,
        status: ComplaintStatus.DISMISSED,
        resolutionSummary: null,
        closedAt: null,
      });

      expect(response.body.data.resolvedAt).not.toBeNull();

      const notifications = await prisma.notification.findMany({
        where: {
          type: NotificationType.COMPLAINT_STATUS_CHANGED,
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.recipientId).toBe(customer.userId);
    });

    it.each([ComplaintStatus.RESOLVED, ComplaintStatus.DISMISSED, ComplaintStatus.CLOSED])(
      'rejects administrator transitions from final status %s',
      async (currentStatus) => {
        const customer = await registerCustomer();
        const adminAccessToken = await loginAdministrator();

        const createResponse = await createPlatformComplaintRequest(customer.accessToken);

        expect(createResponse.status).toBe(201);

        const complaintId = createResponse.body.data.id as string;

        await prisma.complaint.update({
          where: {
            id: complaintId,
          },
          data: {
            status: currentStatus,
            resolvedAt:
              currentStatus === ComplaintStatus.RESOLVED ||
              currentStatus === ComplaintStatus.DISMISSED
                ? new Date()
                : null,
            closedAt: currentStatus === ComplaintStatus.CLOSED ? new Date() : null,
          },
        });

        const response = await updateAdminComplaintStatusRequest(adminAccessToken, complaintId, {
          status: ComplaintStatus.UNDER_REVIEW,
          reason: 'Attempting to reopen a completed complaint.',
        });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('COMPLAINT_STATUS_TRANSITION_NOT_ALLOWED');

        const statusActionCount = await prisma.complaintAction.count({
          where: {
            complaintId,
            action: ComplaintActionType.STATUS_CHANGED,
          },
        });

        expect(statusActionCount).toBe(0);
      },
    );

    it('rejects a same-status transition', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: complaintId,
        },
        data: {
          status: ComplaintStatus.UNDER_REVIEW,
        },
      });

      const response = await updateAdminComplaintStatusRequest(adminAccessToken, complaintId, {
        status: ComplaintStatus.UNDER_REVIEW,
        reason: 'Attempting to apply the same complaint status again.',
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_STATUS_TRANSITION_NOT_ALLOWED');
    });

    it('requires a resolution summary when resolving a complaint', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintStatusRequest(adminAccessToken, complaintId, {
        status: ComplaintStatus.RESOLVED,
        reason: 'The complaint investigation has now been completed.',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a resolution summary for a non-resolved status', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintStatusRequest(adminAccessToken, complaintId, {
        status: ComplaintStatus.UNDER_INVESTIGATION,
        reason: 'The complaint requires additional investigation.',
        resolutionSummary: 'This summary must not be accepted for an active status.',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns not found when the complaint does not exist', async () => {
      const adminAccessToken = await loginAdministrator();

      const response = await updateAdminComplaintStatusRequest(
        adminAccessToken,
        'clx0000000000000000000000',
        {
          status: ComplaintStatus.UNDER_REVIEW,
          reason: 'Administrator review has started.',
        },
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_NOT_FOUND');
    });

    it('validates the complaint ID format', async () => {
      const adminAccessToken = await loginAdministrator();

      const response = await updateAdminComplaintStatusRequest(
        adminAccessToken,
        'not-a-valid-cuid',
        {
          status: ComplaintStatus.UNDER_REVIEW,
          reason: 'Administrator review has started.',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/admin/complaints/:complaintId/assignment', () => {
    it('rejects unauthenticated requests', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const response = await request(app)
        .patch(`/api/v1/admin/complaints/${complaintId}/assignment`)
        .send({
          assignedAdminId: administrator.id,
          reason: 'Assigned for administrator investigation.',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-administrators', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const response = await updateAdminComplaintAssignmentRequest(
        customer.accessToken,
        complaintId,
        {
          assignedAdminId: administrator.id,
          reason: 'Assigned for administrator investigation.',
        },
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('assigns an unassigned complaint to an active administrator', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintAssignmentRequest(adminAccessToken, complaintId, {
        assignedAdminId: administrator.id,
        reason: 'Assigned to the administrator responsible for platform issues.',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Complaint assignment updated successfully');

      expect(response.body.data).toMatchObject({
        id: complaintId,
        assignedAdminId: administrator.id,
        assignedAdmin: {
          id: administrator.id,
          email: ADMIN_EMAIL,
          firstName: 'Complaint',
          lastName: 'Administrator',
          role: UserRole.ADMIN,
          status: AccountStatus.ACTIVE,
        },
      });

      const storedComplaint = await prisma.complaint.findUniqueOrThrow({
        where: {
          id: complaintId,
        },
      });

      expect(storedComplaint.assignedAdminId).toBe(administrator.id);

      const action = response.body.data.actions.find(
        (item: { action: ComplaintActionType }) => item.action === ComplaintActionType.ASSIGNED,
      );

      expect(action).toMatchObject({
        complaintId,
        performedById: administrator.id,
        action: ComplaintActionType.ASSIGNED,
        reason: 'Assigned to the administrator responsible for platform issues.',
        performedBy: {
          id: administrator.id,
          email: ADMIN_EMAIL,
          role: UserRole.ADMIN,
        },
      });

      expect(action.metadata).toEqual({
        previousAssignedAdminId: null,
        newAssignedAdminId: administrator.id,
      });
    });

    it('reassigns a complaint from one administrator to another', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const currentAdministrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const replacementAdministrator = await createTestAdministrator(REPLACEMENT_ADMIN_EMAIL);

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: complaintId,
        },
        data: {
          assignedAdminId: currentAdministrator.id,
        },
      });

      const response = await updateAdminComplaintAssignmentRequest(adminAccessToken, complaintId, {
        assignedAdminId: replacementAdministrator.id,
        reason: 'Reassigned to balance the administrator workload.',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: complaintId,
        assignedAdminId: replacementAdministrator.id,
        assignedAdmin: {
          id: replacementAdministrator.id,
          email: REPLACEMENT_ADMIN_EMAIL,
          role: UserRole.ADMIN,
          status: AccountStatus.ACTIVE,
        },
      });

      const action = response.body.data.actions.find(
        (item: { action: ComplaintActionType }) => item.action === ComplaintActionType.ASSIGNED,
      );

      expect(action.metadata).toEqual({
        previousAssignedAdminId: currentAdministrator.id,
        newAssignedAdminId: replacementAdministrator.id,
      });
    });

    it('unassigns an assigned complaint', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: complaintId,
        },
        data: {
          assignedAdminId: administrator.id,
        },
      });

      const response = await updateAdminComplaintAssignmentRequest(adminAccessToken, complaintId, {
        assignedAdminId: null,
        reason: 'Returned to the unassigned queue for workload redistribution.',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Complaint unassigned successfully');

      expect(response.body.data).toMatchObject({
        id: complaintId,
        assignedAdminId: null,
        assignedAdmin: null,
      });

      const storedComplaint = await prisma.complaint.findUniqueOrThrow({
        where: {
          id: complaintId,
        },
      });

      expect(storedComplaint.assignedAdminId).toBeNull();

      const action = response.body.data.actions.find(
        (item: { action: ComplaintActionType }) => item.action === ComplaintActionType.UNASSIGNED,
      );

      expect(action).toMatchObject({
        complaintId,
        performedById: administrator.id,
        action: ComplaintActionType.UNASSIGNED,
        reason: 'Returned to the unassigned queue for workload redistribution.',
      });

      expect(action.metadata).toEqual({
        previousAssignedAdminId: administrator.id,
        newAssignedAdminId: null,
      });
    });

    it('rejects assignment to a suspended administrator', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const inactiveAdministrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: INACTIVE_ADMIN_EMAIL,
        },
      });

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintAssignmentRequest(adminAccessToken, complaintId, {
        assignedAdminId: inactiveAdministrator.id,
        reason: 'Attempting to assign the complaint to an inactive administrator.',
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_ASSIGNEE_NOT_FOUND');

      const complaint = await prisma.complaint.findUniqueOrThrow({
        where: {
          id: complaintId,
        },
      });

      expect(complaint.assignedAdminId).toBeNull();
    });

    it('rejects assignment to a non-administrator user', async () => {
      const customer = await registerCustomer();
      const secondCustomer = await registerCustomer(secondCustomerPayload);
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintAssignmentRequest(adminAccessToken, complaintId, {
        assignedAdminId: secondCustomer.userId,
        reason: 'Attempting to assign the complaint to a customer account.',
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_ASSIGNEE_NOT_FOUND');
    });

    it('rejects assigning a complaint to the same administrator again', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: complaintId,
        },
        data: {
          assignedAdminId: administrator.id,
        },
      });

      const response = await updateAdminComplaintAssignmentRequest(adminAccessToken, complaintId, {
        assignedAdminId: administrator.id,
        reason: 'Attempting to assign the same administrator again.',
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_ASSIGNMENT_UNCHANGED');
    });

    it('rejects unassigning an already unassigned complaint', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintAssignmentRequest(adminAccessToken, complaintId, {
        assignedAdminId: null,
        reason: 'Attempting to unassign an already unassigned complaint.',
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_ASSIGNMENT_UNCHANGED');
    });

    it.each([ComplaintStatus.RESOLVED, ComplaintStatus.DISMISSED, ComplaintStatus.CLOSED])(
      'rejects assignment changes for final status %s',
      async (status) => {
        const customer = await registerCustomer();
        const adminAccessToken = await loginAdministrator();

        const administrator = await prisma.user.findUniqueOrThrow({
          where: {
            email: ADMIN_EMAIL,
          },
        });

        const createResponse = await createPlatformComplaintRequest(customer.accessToken);

        expect(createResponse.status).toBe(201);

        const complaintId = createResponse.body.data.id as string;

        await prisma.complaint.update({
          where: {
            id: complaintId,
          },
          data: {
            status,
            resolvedAt:
              status === ComplaintStatus.RESOLVED || status === ComplaintStatus.DISMISSED
                ? new Date()
                : null,
            closedAt: status === ComplaintStatus.CLOSED ? new Date() : null,
          },
        });

        const response = await updateAdminComplaintAssignmentRequest(
          adminAccessToken,
          complaintId,
          {
            assignedAdminId: administrator.id,
            reason: 'Attempting to assign a completed complaint.',
          },
        );

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('COMPLAINT_ASSIGNMENT_NOT_ALLOWED');

        const assignmentActionCount = await prisma.complaintAction.count({
          where: {
            complaintId,
            action: {
              in: [ComplaintActionType.ASSIGNED, ComplaintActionType.UNASSIGNED],
            },
          },
        });

        expect(assignmentActionCount).toBe(0);
      },
    );

    it('returns not found when the complaint does not exist', async () => {
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const response = await updateAdminComplaintAssignmentRequest(
        adminAccessToken,
        'clx0000000000000000000000',
        {
          assignedAdminId: administrator.id,
          reason: 'Assigned for administrator investigation.',
        },
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_NOT_FOUND');
    });

    it('rejects invalid assignment request values', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintAssignmentRequest(adminAccessToken, complaintId, {
        assignedAdminId: 'not-a-valid-cuid',
        reason: 'No',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects unexpected assignment fields', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintAssignmentRequest(adminAccessToken, complaintId, {
        assignedAdminId: administrator.id,
        reason: 'Assigned for administrator investigation.',
        status: ComplaintStatus.UNDER_REVIEW,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('validates the complaint ID format', async () => {
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const response = await updateAdminComplaintAssignmentRequest(
        adminAccessToken,
        'not-a-valid-cuid',
        {
          assignedAdminId: administrator.id,
          reason: 'Assigned for administrator investigation.',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/admin/complaints/:complaintId/priority', () => {
    it('rejects unauthenticated requests', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await request(app)
        .patch(`/api/v1/admin/complaints/${complaintId}/priority`)
        .send({
          priority: ComplaintPriority.HIGH,
          reason: 'This complaint requires quicker administrator review.',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-administrators', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintPriorityRequest(
        customer.accessToken,
        complaintId,
        {
          priority: ComplaintPriority.HIGH,
          reason: 'This complaint requires quicker administrator review.',
        },
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('changes the complaint priority and records an administrator audit action', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const complaintBeforeUpdate = await prisma.complaint.findUniqueOrThrow({
        where: {
          id: complaintId,
        },
      });

      const reason = 'Payment-related risk requires quicker administrator investigation.';

      const response = await updateAdminComplaintPriorityRequest(adminAccessToken, complaintId, {
        priority: ComplaintPriority.HIGH,
        reason,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Complaint priority updated successfully');

      expect(response.body.data).toMatchObject({
        id: complaintId,
        priority: ComplaintPriority.HIGH,
      });

      const storedComplaint = await prisma.complaint.findUniqueOrThrow({
        where: {
          id: complaintId,
        },
      });

      expect(storedComplaint.priority).toBe(ComplaintPriority.HIGH);

      const priorityAction = response.body.data.actions.find(
        (item: { action: ComplaintActionType }) =>
          item.action === ComplaintActionType.PRIORITY_CHANGED,
      );

      expect(priorityAction).toMatchObject({
        complaintId,
        performedById: administrator.id,
        action: ComplaintActionType.PRIORITY_CHANGED,
        reason,
        performedBy: {
          id: administrator.id,
          email: ADMIN_EMAIL,
          role: UserRole.ADMIN,
        },
      });

      expect(priorityAction.metadata).toEqual({
        previousPriority: complaintBeforeUpdate.priority,
        newPriority: ComplaintPriority.HIGH,
      });
    });

    it('rejects changing a complaint to its current priority', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const complaint = await prisma.complaint.findUniqueOrThrow({
        where: {
          id: complaintId,
        },
      });

      const response = await updateAdminComplaintPriorityRequest(adminAccessToken, complaintId, {
        priority: complaint.priority,
        reason: 'Attempting to apply the same complaint priority again.',
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_PRIORITY_UNCHANGED');

      const priorityActionCount = await prisma.complaintAction.count({
        where: {
          complaintId,
          action: ComplaintActionType.PRIORITY_CHANGED,
        },
      });

      expect(priorityActionCount).toBe(0);
    });

    it.each([ComplaintStatus.RESOLVED, ComplaintStatus.DISMISSED, ComplaintStatus.CLOSED])(
      'rejects priority changes for final status %s',
      async (status) => {
        const customer = await registerCustomer();
        const adminAccessToken = await loginAdministrator();

        const createResponse = await createPlatformComplaintRequest(customer.accessToken);

        expect(createResponse.status).toBe(201);

        const complaintId = createResponse.body.data.id as string;

        await prisma.complaint.update({
          where: {
            id: complaintId,
          },

          data: {
            status,
            resolvedAt:
              status === ComplaintStatus.RESOLVED || status === ComplaintStatus.DISMISSED
                ? new Date()
                : null,
            closedAt: status === ComplaintStatus.CLOSED ? new Date() : null,
          },
        });

        const response = await updateAdminComplaintPriorityRequest(adminAccessToken, complaintId, {
          priority: ComplaintPriority.HIGH,
          reason: 'Attempting to reprioritize a completed complaint.',
        });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('COMPLAINT_PRIORITY_CHANGE_NOT_ALLOWED');

        const priorityActionCount = await prisma.complaintAction.count({
          where: {
            complaintId,
            action: ComplaintActionType.PRIORITY_CHANGED,
          },
        });

        expect(priorityActionCount).toBe(0);
      },
    );

    it('returns not found when the complaint does not exist', async () => {
      const adminAccessToken = await loginAdministrator();

      const response = await updateAdminComplaintPriorityRequest(
        adminAccessToken,
        'clx0000000000000000000000',
        {
          priority: ComplaintPriority.HIGH,
          reason: 'This complaint requires quicker administrator review.',
        },
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_NOT_FOUND');
    });

    it('rejects invalid priority request values', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintPriorityRequest(adminAccessToken, complaintId, {
        priority: 'CRITICAL',
        reason: 'No',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects unexpected priority request fields', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await updateAdminComplaintPriorityRequest(adminAccessToken, complaintId, {
        priority: ComplaintPriority.HIGH,
        reason: 'This complaint requires quicker administrator review.',
        assignedAdminId: null,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('validates the complaint ID format', async () => {
      const adminAccessToken = await loginAdministrator();

      const response = await updateAdminComplaintPriorityRequest(
        adminAccessToken,
        'not-a-valid-cuid',
        {
          priority: ComplaintPriority.HIGH,
          reason: 'This complaint requires quicker administrator review.',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/admin/complaints/:complaintId/reopen', () => {
    it('rejects unauthenticated requests', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await request(app)
        .patch(`/api/v1/admin/complaints/${complaintId}/reopen`)
        .send({
          reason: 'New evidence requires another administrator investigation.',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-administrators', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await reopenAdminComplaintRequest(customer.accessToken, complaintId, {
        reason: 'New evidence requires another administrator investigation.',
      });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it.each([ComplaintStatus.RESOLVED, ComplaintStatus.DISMISSED, ComplaintStatus.CLOSED])(
      'reopens a complaint from final status %s',
      async (status) => {
        const customer = await registerCustomer();
        const adminAccessToken = await loginAdministrator();

        const createResponse = await createPlatformComplaintRequest(customer.accessToken);

        expect(createResponse.status).toBe(201);

        const complaintId = createResponse.body.data.id as string;

        await prisma.complaint.update({
          where: {
            id: complaintId,
          },

          data: {
            status,
            resolutionSummary:
              status === ComplaintStatus.RESOLVED ? 'The complaint was previously resolved.' : null,
            resolvedAt:
              status === ComplaintStatus.RESOLVED || status === ComplaintStatus.DISMISSED
                ? new Date()
                : null,
            closedAt: status === ComplaintStatus.CLOSED ? new Date() : null,
          },
        });

        const response = await reopenAdminComplaintRequest(adminAccessToken, complaintId, {
          reason: 'New evidence requires another administrator investigation.',
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Complaint reopened successfully');

        expect(response.body.data).toMatchObject({
          id: complaintId,
          status: ComplaintStatus.UNDER_REVIEW,
          resolutionSummary: null,
          resolvedAt: null,
          closedAt: null,
        });

        const storedComplaint = await prisma.complaint.findUniqueOrThrow({
          where: {
            id: complaintId,
          },
        });

        expect(storedComplaint.status).toBe(ComplaintStatus.UNDER_REVIEW);
        expect(storedComplaint.resolutionSummary).toBeNull();
        expect(storedComplaint.resolvedAt).toBeNull();
        expect(storedComplaint.closedAt).toBeNull();
      },
    );

    it('records a REOPENED administrator audit action', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const administrator = await prisma.user.findUniqueOrThrow({
        where: {
          email: ADMIN_EMAIL,
        },
      });

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: complaintId,
        },

        data: {
          status: ComplaintStatus.RESOLVED,
          resolutionSummary: 'The complaint was previously resolved.',
          resolvedAt: new Date(),
        },
      });

      const reason = 'Previously unavailable transaction records require reinvestigation.';

      const response = await reopenAdminComplaintRequest(adminAccessToken, complaintId, {
        reason,
      });

      expect(response.status).toBe(200);

      const reopenAction = response.body.data.actions.find(
        (item: { action: ComplaintActionType }) => item.action === ComplaintActionType.REOPENED,
      );

      expect(reopenAction).toMatchObject({
        complaintId,
        performedById: administrator.id,
        action: ComplaintActionType.REOPENED,
        reason,
        performedBy: {
          id: administrator.id,
          email: ADMIN_EMAIL,
          role: UserRole.ADMIN,
        },
      });

      expect(reopenAction.metadata).toEqual({
        previousStatus: ComplaintStatus.RESOLVED,
        newStatus: ComplaintStatus.UNDER_REVIEW,
      });
    });

    it('notifies both complaint participants when reopening a complaint', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: complaintId,
        },

        data: {
          respondentId: vendor.userId,
          status: ComplaintStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      await prisma.notification.deleteMany({
        where: {
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
      });

      const response = await reopenAdminComplaintRequest(adminAccessToken, complaintId, {
        reason: 'Both participants must respond to newly discovered evidence.',
      });

      expect(response.status).toBe(200);

      const notifications = await prisma.notification.findMany({
        where: {
          entityType: 'COMPLAINT',
          entityId: complaintId,
          type: NotificationType.COMPLAINT_STATUS_CHANGED,
        },

        orderBy: {
          recipientId: 'asc',
        },
      });

      expect(notifications).toHaveLength(2);

      expect(notifications.map((notification) => notification.recipientId).sort()).toEqual(
        [customer.userId, vendor.userId].sort(),
      );

      for (const notification of notifications) {
        expect(notification.title).toBe('Complaint reopened');

        expect(notification.metadata).toMatchObject({
          complaintId,
          previousStatus: ComplaintStatus.CLOSED,
          newStatus: ComplaintStatus.UNDER_REVIEW,
        });
      }
    });

    it.each([
      ComplaintStatus.OPEN,
      ComplaintStatus.UNDER_REVIEW,
      ComplaintStatus.UNDER_INVESTIGATION,
      ComplaintStatus.AWAITING_CUSTOMER_RESPONSE,
      ComplaintStatus.AWAITING_VENDOR_RESPONSE,
    ])('rejects reopening an active complaint with status %s', async (status) => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: complaintId,
        },

        data: {
          status,
        },
      });

      const response = await reopenAdminComplaintRequest(adminAccessToken, complaintId, {
        reason: 'Attempting to reopen a complaint that is already active.',
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_REOPEN_NOT_ALLOWED');

      const reopenActionCount = await prisma.complaintAction.count({
        where: {
          complaintId,
          action: ComplaintActionType.REOPENED,
        },
      });

      expect(reopenActionCount).toBe(0);
    });

    it('returns not found when the complaint does not exist', async () => {
      const adminAccessToken = await loginAdministrator();

      const response = await reopenAdminComplaintRequest(
        adminAccessToken,
        'clx0000000000000000000000',
        {
          reason: 'New evidence requires another administrator investigation.',
        },
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_NOT_FOUND');
    });

    it('rejects a reopening reason shorter than the minimum length', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: complaintId,
        },

        data: {
          status: ComplaintStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      const response = await reopenAdminComplaintRequest(adminAccessToken, complaintId, {
        reason: 'No',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects unexpected reopen request fields', async () => {
      const customer = await registerCustomer();
      const adminAccessToken = await loginAdministrator();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: complaintId,
        },

        data: {
          status: ComplaintStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      const response = await reopenAdminComplaintRequest(adminAccessToken, complaintId, {
        reason: 'New evidence requires another administrator investigation.',
        status: ComplaintStatus.OPEN,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('validates the complaint ID format', async () => {
      const adminAccessToken = await loginAdministrator();

      const response = await reopenAdminComplaintRequest(adminAccessToken, 'not-a-valid-cuid', {
        reason: 'New evidence requires another administrator investigation.',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/complaints/:complaintId/messages', () => {
    it('allows the complainant to add a public complaint message', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await addComplaintMessageRequest(customer.accessToken, complaintId, {
        body: 'I am providing additional details about the reported interaction.',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        complaintId,
        authorId: customer.userId,
        body: 'I am providing additional details about the reported interaction.',
        isInternal: false,
        author: {
          id: customer.userId,
          firstName: 'Maya',
          lastName: 'Fernando',
          role: UserRole.CUSTOMER,
        },
      });

      const storedMessage = await prisma.complaintMessage.findUnique({
        where: {
          id: response.body.data.id as string,
        },
      });

      expect(storedMessage).not.toBeNull();
      expect(storedMessage).toMatchObject({
        complaintId,
        authorId: customer.userId,
        body: 'I am providing additional details about the reported interaction.',
        isInternal: false,
      });
    });

    it('notifies the respondent when the complainant adds a message', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.notification.deleteMany({
        where: {
          recipientId: vendor.userId,
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
      });

      const response = await addComplaintMessageRequest(customer.accessToken, complaintId);

      expect(response.status).toBe(201);

      const notification = await prisma.notification.findFirst({
        where: {
          recipientId: vendor.userId,
          type: NotificationType.COMPLAINT_MESSAGE_RECEIVED,
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
      });

      expect(notification).not.toBeNull();
      expect(notification).toMatchObject({
        recipientId: vendor.userId,
        type: NotificationType.COMPLAINT_MESSAGE_RECEIVED,
        title: 'New complaint message',
        entityType: 'COMPLAINT',
        entityId: complaintId,
        isRead: false,
      });

      expect(notification?.metadata).toEqual({
        complaintId,
        complaintType: ComplaintType.USER_CONDUCT,
        messageId: response.body.data.id,
        authorId: customer.userId,
      });
    });

    it('allows the respondent to reply and notifies the complainant', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.notification.deleteMany({
        where: {
          recipientId: customer.userId,
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
      });

      const response = await addComplaintMessageRequest(vendor.accessToken, complaintId, {
        body: 'I would like to clarify my side of the reported interaction.',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        complaintId,
        authorId: vendor.userId,
        body: 'I would like to clarify my side of the reported interaction.',
        isInternal: false,
        author: {
          id: vendor.userId,
          firstName: 'Ravi',
          lastName: 'Perera',
          role: UserRole.VENDOR,
        },
      });

      const notification = await prisma.notification.findFirst({
        where: {
          recipientId: customer.userId,
          type: NotificationType.COMPLAINT_MESSAGE_RECEIVED,
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
      });

      expect(notification).not.toBeNull();
      expect(notification?.metadata).toEqual({
        complaintId,
        complaintType: ComplaintType.USER_CONDUCT,
        messageId: response.body.data.id,
        authorId: vendor.userId,
      });
    });

    it('returns not found when an unrelated user attempts to add a message', async () => {
      const customer = await registerCustomer();
      const secondCustomer = await registerCustomer(secondCustomerPayload);
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await addComplaintMessageRequest(secondCustomer.accessToken, complaintId);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_NOT_FOUND');

      const messageCount = await prisma.complaintMessage.count({
        where: {
          complaintId,
          authorId: secondCustomer.userId,
        },
      });

      expect(messageCount).toBe(0);
    });

    it.each([ComplaintStatus.RESOLVED, ComplaintStatus.DISMISSED, ComplaintStatus.CLOSED])(
      'rejects messages when the complaint status is %s',
      async (status) => {
        const customer = await registerCustomer();
        const vendor = await registerVendor();

        const createResponse = await createUserConductComplaintRequest(
          customer.accessToken,
          vendor.userId,
        );

        expect(createResponse.status).toBe(201);

        const complaintId = createResponse.body.data.id as string;

        await prisma.complaint.update({
          where: {
            id: complaintId,
          },
          data: {
            status,
          },
        });

        const response = await addComplaintMessageRequest(customer.accessToken, complaintId);

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('COMPLAINT_MESSAGES_CLOSED');

        const messageCount = await prisma.complaintMessage.count({
          where: {
            complaintId,
          },
        });

        expect(messageCount).toBe(0);
      },
    );

    it('allows messages while the complaint is under investigation', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: complaintId,
        },
        data: {
          status: ComplaintStatus.UNDER_INVESTIGATION,
        },
      });

      const response = await addComplaintMessageRequest(customer.accessToken, complaintId);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.complaintId).toBe(complaintId);
    });

    it('stores a platform complaint message without creating a participant notification', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await addComplaintMessageRequest(customer.accessToken, complaintId, {
        body: 'This is additional technical information about the platform issue.',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        complaintId,
        authorId: customer.userId,
        body: 'This is additional technical information about the platform issue.',
        isInternal: false,
      });

      const messageNotifications = await prisma.notification.findMany({
        where: {
          type: NotificationType.COMPLAINT_MESSAGE_RECEIVED,
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
      });

      expect(messageNotifications).toHaveLength(0);
    });

    it('rejects an empty complaint message', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await addComplaintMessageRequest(customer.accessToken, complaintId, {
        body: '   ',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');

      const messageCount = await prisma.complaintMessage.count({
        where: {
          complaintId,
        },
      });

      expect(messageCount).toBe(0);
    });

    it('rejects unexpected message fields', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await addComplaintMessageRequest(customer.accessToken, complaintId, {
        isInternal: true,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('validates the complaint ID format for message creation', async () => {
      const customer = await registerCustomer();

      const response = await addComplaintMessageRequest(customer.accessToken, 'not-a-valid-cuid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/complaints/:complaintId/close', () => {
    it('allows the complainant to close an active complaint with a reason', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await closeComplaintRequest(customer.accessToken, complaintId, {
        reason: 'The issue has now been settled directly.',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: complaintId,
        complainantId: customer.userId,
        respondentId: vendor.userId,
        status: ComplaintStatus.CLOSED,
      });

      expect(response.body.data.closedAt).not.toBeNull();

      const storedComplaint = await prisma.complaint.findUnique({
        where: {
          id: complaintId,
        },
      });

      expect(storedComplaint).not.toBeNull();
      expect(storedComplaint?.status).toBe(ComplaintStatus.CLOSED);
      expect(storedComplaint?.closedAt).not.toBeNull();
    });

    it('creates a CLOSED audit action using the supplied reason', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await closeComplaintRequest(customer.accessToken, complaintId, {
        reason: 'The matter has been resolved outside the platform.',
      });

      expect(response.status).toBe(200);

      const action = await prisma.complaintAction.findFirst({
        where: {
          complaintId,
          action: ComplaintActionType.CLOSED,
        },
      });

      expect(action).not.toBeNull();
      expect(action).toMatchObject({
        complaintId,
        performedById: customer.userId,
        action: ComplaintActionType.CLOSED,
        reason: 'The matter has been resolved outside the platform.',
      });

      expect(action?.metadata).toEqual({
        previousStatus: ComplaintStatus.OPEN,
        newStatus: ComplaintStatus.CLOSED,
      });
    });

    it('uses the default audit reason when no reason is supplied', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await closeComplaintRequest(customer.accessToken, complaintId);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(ComplaintStatus.CLOSED);

      const action = await prisma.complaintAction.findFirst({
        where: {
          complaintId,
          action: ComplaintActionType.CLOSED,
        },
      });

      expect(action).not.toBeNull();
      expect(action?.reason).toBe('Complaint closed by complainant');
    });

    it('notifies the respondent when the complainant closes the complaint', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.notification.deleteMany({
        where: {
          recipientId: vendor.userId,
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
      });

      const response = await closeComplaintRequest(customer.accessToken, complaintId, {
        reason: 'The issue has been settled.',
      });

      expect(response.status).toBe(200);

      const notification = await prisma.notification.findFirst({
        where: {
          recipientId: vendor.userId,
          type: NotificationType.COMPLAINT_STATUS_CHANGED,
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
      });

      expect(notification).not.toBeNull();

      expect(notification).toMatchObject({
        recipientId: vendor.userId,
        type: NotificationType.COMPLAINT_STATUS_CHANGED,
        title: 'Complaint closed',
        entityType: 'COMPLAINT',
        entityId: complaintId,
        isRead: false,
      });

      expect(notification?.metadata).toEqual({
        complaintId,
        complaintType: ComplaintType.USER_CONDUCT,
        previousStatus: ComplaintStatus.OPEN,
        newStatus: ComplaintStatus.CLOSED,
        closedById: customer.userId,
      });
    });

    it('allows a vendor complainant to close a complaint they submitted', async () => {
      const vendor = await registerVendor();

      const createResponse = await createPlatformComplaintRequest(vendor.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await closeComplaintRequest(vendor.accessToken, complaintId, {
        reason: 'The platform issue is no longer occurring.',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: complaintId,
        complainantId: vendor.userId,
        respondentId: null,
        status: ComplaintStatus.CLOSED,
      });
    });

    it('does not create a participant notification when closing a platform complaint', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await closeComplaintRequest(customer.accessToken, complaintId);

      expect(response.status).toBe(200);

      const statusNotifications = await prisma.notification.findMany({
        where: {
          type: NotificationType.COMPLAINT_STATUS_CHANGED,
          entityType: 'COMPLAINT',
          entityId: complaintId,
        },
      });

      expect(statusNotifications).toHaveLength(0);
    });

    it('returns not found when the respondent attempts to close the complaint', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await closeComplaintRequest(vendor.accessToken, complaintId, {
        reason: 'The respondent should not be able to close this complaint.',
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_NOT_FOUND');

      const complaint = await prisma.complaint.findUnique({
        where: {
          id: complaintId,
        },
      });

      expect(complaint?.status).toBe(ComplaintStatus.OPEN);
      expect(complaint?.closedAt).toBeNull();
    });

    it('returns not found when an unrelated user attempts to close the complaint', async () => {
      const customer = await registerCustomer();
      const secondCustomer = await registerCustomer(secondCustomerPayload);
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await closeComplaintRequest(secondCustomer.accessToken, complaintId, {
        reason: 'This user is unrelated to the complaint.',
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLAINT_NOT_FOUND');
    });

    it.each([ComplaintStatus.RESOLVED, ComplaintStatus.DISMISSED, ComplaintStatus.CLOSED])(
      'rejects complainant closure when the complaint status is %s',
      async (status) => {
        const customer = await registerCustomer();
        const vendor = await registerVendor();

        const createResponse = await createUserConductComplaintRequest(
          customer.accessToken,
          vendor.userId,
        );

        expect(createResponse.status).toBe(201);

        const complaintId = createResponse.body.data.id as string;

        const existingClosedAt = status === ComplaintStatus.CLOSED ? new Date() : null;

        await prisma.complaint.update({
          where: {
            id: complaintId,
          },
          data: {
            status,
            closedAt: existingClosedAt,
          },
        });

        const response = await closeComplaintRequest(customer.accessToken, complaintId, {
          reason: 'Attempting to close an already completed complaint.',
        });

        expect(response.status).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('COMPLAINT_CLOSE_NOT_ALLOWED');

        const closeActionCount = await prisma.complaintAction.count({
          where: {
            complaintId,
            action: ComplaintActionType.CLOSED,
          },
        });

        expect(closeActionCount).toBe(0);
      },
    );

    it('allows closure while the complaint is under investigation', async () => {
      const customer = await registerCustomer();
      const vendor = await registerVendor();

      const createResponse = await createUserConductComplaintRequest(
        customer.accessToken,
        vendor.userId,
      );

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      await prisma.complaint.update({
        where: {
          id: complaintId,
        },
        data: {
          status: ComplaintStatus.UNDER_INVESTIGATION,
        },
      });

      const response = await closeComplaintRequest(customer.accessToken, complaintId, {
        reason: 'The complainant no longer wishes to continue.',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(ComplaintStatus.CLOSED);

      const action = await prisma.complaintAction.findFirst({
        where: {
          complaintId,
          action: ComplaintActionType.CLOSED,
        },
      });

      expect(action?.metadata).toEqual({
        previousStatus: ComplaintStatus.UNDER_INVESTIGATION,
        newStatus: ComplaintStatus.CLOSED,
      });
    });

    it('rejects a close reason shorter than the minimum length', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await closeComplaintRequest(customer.accessToken, complaintId, {
        reason: 'No',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');

      const complaint = await prisma.complaint.findUnique({
        where: {
          id: complaintId,
        },
      });

      expect(complaint?.status).toBe(ComplaintStatus.OPEN);
    });

    it('rejects unexpected close-request fields', async () => {
      const customer = await registerCustomer();

      const createResponse = await createPlatformComplaintRequest(customer.accessToken);

      expect(createResponse.status).toBe(201);

      const complaintId = createResponse.body.data.id as string;

      const response = await closeComplaintRequest(customer.accessToken, complaintId, {
        reason: 'The complaint no longer needs investigation.',
        status: ComplaintStatus.RESOLVED,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('validates the complaint ID format for complaint closure', async () => {
      const customer = await registerCustomer();

      const response = await closeComplaintRequest(customer.accessToken, 'not-a-valid-cuid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
