import bcrypt from 'bcryptjs';
import {
  AccountStatus,
  BookingStatus,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintType,
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

const app = createApp();

const adminEmail = 'admin-review-test@example.com';
const secondAdminEmail = 'admin-second-test@example.com';
const vendorEmail = 'admin-pending-vendor@example.com';
const draftVendorEmail = 'admin-draft-vendor@example.com';
const customerEmail = 'admin-user-customer@example.com';
const secondCustomerEmail = 'admin-user-second-customer@example.com';
const suspendedCustomerEmail = 'admin-user-suspended@example.com';

const adminPassword = 'Admin@2026';
const vendorPassword = 'Vendor@2026';
const userPassword = 'User@2026';

const testEmails = [
  adminEmail,
  secondAdminEmail,
  vendorEmail,
  draftVendorEmail,
  customerEmail,
  secondCustomerEmail,
  suspendedCustomerEmail,
];

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

  expect(response.status).toBe(200);

  return response.body.data.accessToken as string;
};

const createManagedUser = async ({
  email,
  firstName,
  lastName,
  role,
  status = AccountStatus.ACTIVE,
  createdAt,
}: {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status?: AccountStatus;
  createdAt?: Date;
}) => {
  const passwordHash = await bcrypt.hash(userPassword, 12);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      status,
      ...(createdAt && {
        createdAt,
      }),
    },
  });
};

const loginUser = async (email: string, password: string) => {
  const response = await request(app).post('/api/v1/auth/login').send({
    email,
    password,
  });

  expect(response.status).toBe(200);

  return response.body.data.accessToken as string;
};

const getAdminUsersRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/admin/users${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getAdminUserByIdRequest = (accessToken: string, userId: string) => {
  return request(app)
    .get(`/api/v1/admin/users/${userId}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const updateAdminUserStatusRequest = (
  accessToken: string,
  userId: string,
  body: {
    status: string;
    reason?: string;
  },
) => {
  return request(app)
    .patch(`/api/v1/admin/users/${userId}/status`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

const getAdminDashboardSummaryRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/admin/dashboard/summary${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const registerVendor = async (payload: typeof vendorPayload) => {
  return request(app).post('/api/v1/auth/register/vendor').send(payload);
};

const getAdminUserReportRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/admin/reports/users${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getAdminEventReportRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/admin/reports/events${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getAdminVendorReportRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/admin/reports/vendors${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getAdminBookingReportRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/admin/reports/bookings${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getAdminPaymentReportRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/admin/reports/payments${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getAdminComplaintReportRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/admin/reports/complaints${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
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

const createAdminEventReportFixture = async () => {
  const customer = await createManagedUser({
    email: customerEmail,
    firstName: 'Maya',
    lastName: 'Fernando',
    role: UserRole.CUSTOMER,
  });

  const secondCustomer = await createManagedUser({
    email: secondCustomerEmail,
    firstName: 'Nila',
    lastName: 'Perera',
    role: UserRole.CUSTOMER,
  });

  const weddingEvent = await prisma.event.create({
    data: {
      ownerId: customer.id,
      name: 'Admin Event Report Wedding',
      eventType: 'Wedding',
      eventDate: new Date('2030-06-20T09:00:00.000Z'),
      location: 'Colombo',
      guestCount: 150,
      plannedBudget: 1200000,
      theme: 'Classic',
      requirements: 'Wedding planning requirements.',
      status: EventStatus.PLANNING,
      createdAt: new Date('2030-01-10T10:00:00.000Z'),
    },
  });

  const birthdayEvent = await prisma.event.create({
    data: {
      ownerId: secondCustomer.id,
      name: 'Admin Event Report Birthday',
      eventType: 'Birthday',
      eventDate: new Date('2030-07-10T09:00:00.000Z'),
      location: 'Kandy',
      guestCount: 80,
      plannedBudget: 600000,
      theme: 'Garden',
      requirements: 'Birthday event requirements.',
      status: EventStatus.COMPLETED,
      createdAt: new Date('2030-02-10T10:00:00.000Z'),
    },
  });

  const corporateEvent = await prisma.event.create({
    data: {
      ownerId: customer.id,
      name: 'Admin Event Report Corporate Meetup',
      eventType: 'Corporate',
      eventDate: new Date('2030-08-15T09:00:00.000Z'),
      location: 'Colombo',
      guestCount: 200,
      plannedBudget: 2000000,
      theme: 'Modern',
      requirements: 'Corporate event requirements.',
      status: EventStatus.CANCELLED,
      createdAt: new Date('2030-02-15T10:00:00.000Z'),
    },
  });

  return {
    customer,
    secondCustomer,
    weddingEvent,
    birthdayEvent,
    corporateEvent,
  };
};

const createAdminComplaintReportFixture = async () => {
  const customer = await createManagedUser({
    email: customerEmail,
    firstName: 'Maya',
    lastName: 'Fernando',
    role: UserRole.CUSTOMER,
  });

  const secondCustomer = await createManagedUser({
    email: secondCustomerEmail,
    firstName: 'Nila',
    lastName: 'Perera',
    role: UserRole.CUSTOMER,
  });

  const adminUser = await prisma.user.findUniqueOrThrow({
    where: {
      email: adminEmail,
    },
    select: {
      id: true,
    },
  });

  const openComplaint = await prisma.complaint.create({
    data: {
      complainantId: customer.id,
      respondentId: secondCustomer.id,
      assignedAdminId: adminUser.id,
      type: ComplaintType.BOOKING,
      subject: 'Admin complaint report booking issue',
      description: 'The booking complaint was created for admin complaint report testing.',
      status: ComplaintStatus.OPEN,
      priority: ComplaintPriority.URGENT,
      createdAt: new Date('2030-01-10T10:00:00.000Z'),
    },
  });

  const resolvedComplaint = await prisma.complaint.create({
    data: {
      complainantId: customer.id,
      respondentId: secondCustomer.id,
      type: ComplaintType.PAYMENT,
      subject: 'Admin complaint report payment issue',
      description: 'The payment complaint was created for admin complaint report testing.',
      status: ComplaintStatus.RESOLVED,
      priority: ComplaintPriority.HIGH,
      resolutionSummary: 'The payment complaint was resolved by the administrator.',
      resolvedAt: new Date('2030-02-11T10:00:00.000Z'),
      createdAt: new Date('2030-02-10T10:00:00.000Z'),
    },
  });

  const platformComplaint = await prisma.complaint.create({
    data: {
      complainantId: secondCustomer.id,
      assignedAdminId: adminUser.id,
      type: ComplaintType.PLATFORM,
      subject: 'Admin complaint report platform issue',
      description: 'The platform complaint was created for admin complaint report testing.',
      status: ComplaintStatus.UNDER_REVIEW,
      priority: ComplaintPriority.LOW,
      createdAt: new Date('2030-02-15T10:00:00.000Z'),
    },
  });

  return {
    customer,
    secondCustomer,
    adminUser,
    openComplaint,
    resolvedComplaint,
    platformComplaint,
  };
};

const createAdminBookingReportFixture = async () => {
  const category = await prisma.serviceCategory.findUnique({
    where: {
      slug: 'photography',
    },
  });

  expect(category).not.toBeNull();

  if (!category) {
    throw new Error('Photography service category must exist in the test database');
  }

  const customer = await createManagedUser({
    email: customerEmail,
    firstName: 'Maya',
    lastName: 'Fernando',
    role: UserRole.CUSTOMER,
  });

  const secondCustomer = await createManagedUser({
    email: secondCustomerEmail,
    firstName: 'Nila',
    lastName: 'Perera',
    role: UserRole.CUSTOMER,
  });

  const vendorRegistration = await registerVendor(vendorPayload);

  expect(vendorRegistration.status).toBe(201);

  const secondVendorRegistration = await registerVendor(draftVendorPayload);

  expect(secondVendorRegistration.status).toBe(201);

  const vendor = await prisma.vendorProfile.update({
    where: {
      userId: vendorRegistration.body.data.user.id,
    },
    data: {
      verificationStatus: VendorVerificationStatus.APPROVED,
      reviewedAt: new Date('2030-01-01T08:00:00.000Z'),
    },
  });

  const secondVendor = await prisma.vendorProfile.update({
    where: {
      userId: secondVendorRegistration.body.data.user.id,
    },
    data: {
      verificationStatus: VendorVerificationStatus.APPROVED,
      reviewedAt: new Date('2030-01-01T08:30:00.000Z'),
    },
  });

  const firstPackage = await prisma.servicePackage.create({
    data: {
      vendorId: vendor.id,
      categoryId: category.id,
      title: 'Admin Booking Report Photography Package',
      description: 'Photography package used for admin booking report testing.',
      basePrice: 150000,
      isActive: true,
    },
  });

  const secondPackage = await prisma.servicePackage.create({
    data: {
      vendorId: secondVendor.id,
      categoryId: category.id,
      title: 'Admin Booking Report Premium Package',
      description: 'Premium photography package used for admin booking report testing.',
      basePrice: 250000,
      isActive: true,
    },
  });

  const firstEvent = await prisma.event.create({
    data: {
      ownerId: customer.id,
      name: 'Admin Booking Report Wedding',
      eventType: 'Wedding',
      eventDate: new Date('2030-06-20T09:00:00.000Z'),
      location: 'Colombo',
      guestCount: 150,
      plannedBudget: 1200000,
      theme: 'Classic',
      requirements: 'Photography and event coverage.',
      status: EventStatus.PLANNING,
    },
  });

  const secondEvent = await prisma.event.create({
    data: {
      ownerId: secondCustomer.id,
      name: 'Admin Booking Report Birthday',
      eventType: 'Birthday',
      eventDate: new Date('2030-07-10T09:00:00.000Z'),
      location: 'Kandy',
      guestCount: 80,
      plannedBudget: 600000,
      theme: 'Garden',
      requirements: 'Photography for a private birthday event.',
      status: EventStatus.PLANNING,
    },
  });

  const firstQuotationRequest = await prisma.quotationRequest.create({
    data: {
      eventId: firstEvent.id,
      vendorId: vendor.id,
      packageId: firstPackage.id,
      requirements: 'Full-day wedding photography coverage.',
      status: QuotationRequestStatus.ACCEPTED,
    },
  });

  const secondQuotationRequest = await prisma.quotationRequest.create({
    data: {
      eventId: secondEvent.id,
      vendorId: secondVendor.id,
      packageId: secondPackage.id,
      requirements: 'Birthday event photography coverage.',
      status: QuotationRequestStatus.ACCEPTED,
    },
  });

  const firstQuotation = await prisma.quotation.create({
    data: {
      quotationRequestId: firstQuotationRequest.id,
      version: 1,
      status: QuotationStatus.ACCEPTED,
      proposedPrice: 150000,
      depositAmount: 50000,
      inclusions: 'Full-day coverage and edited photographs.',
      exclusions: 'Printed albums are not included.',
      terms: 'Deposit is required before the event.',
      expiresAt: new Date('2030-06-01T09:00:00.000Z'),
    },
  });

  const secondQuotation = await prisma.quotation.create({
    data: {
      quotationRequestId: secondQuotationRequest.id,
      version: 1,
      status: QuotationStatus.ACCEPTED,
      proposedPrice: 250000,
      depositAmount: 75000,
      inclusions: 'Premium photography coverage and edited photographs.',
      exclusions: 'Printed albums are not included.',
      terms: 'Deposit is required before the event.',
      expiresAt: new Date('2030-07-01T09:00:00.000Z'),
    },
  });

  const completedBooking = await prisma.booking.create({
    data: {
      eventId: firstEvent.id,
      vendorId: vendor.id,
      acceptedQuotationId: firstQuotation.id,
      agreedCost: 150000,
      serviceStart: new Date('2030-06-20T08:00:00.000Z'),
      serviceEnd: new Date('2030-06-20T18:00:00.000Z'),
      status: BookingStatus.COMPLETED,
      vendorRespondedAt: new Date('2030-01-01T10:00:00.000Z'),
      vendorCompletedAt: new Date('2030-06-20T18:30:00.000Z'),
      createdAt: new Date('2030-01-10T10:00:00.000Z'),
    },
  });

  const confirmedBooking = await prisma.booking.create({
    data: {
      eventId: secondEvent.id,
      vendorId: secondVendor.id,
      acceptedQuotationId: secondQuotation.id,
      agreedCost: 250000,
      serviceStart: new Date('2030-07-10T08:00:00.000Z'),
      serviceEnd: new Date('2030-07-10T18:00:00.000Z'),
      status: BookingStatus.CONFIRMED,
      vendorRespondedAt: new Date('2030-02-01T10:00:00.000Z'),
      createdAt: new Date('2030-02-10T10:00:00.000Z'),
    },
  });

  const adminUser = await prisma.user.findUniqueOrThrow({
    where: {
      email: adminEmail,
    },
    select: {
      id: true,
    },
  });

  const verifiedPayment = await prisma.payment.create({
    data: {
      bookingId: completedBooking.id,
      submittedById: customer.id,
      amount: 50000,
      status: PaymentStatus.VERIFIED,
      method: PaymentMethod.BANK_TRANSFER,
      referenceNumber: 'ADMIN-BOOKING-REPORT-001',
      reviewedAt: new Date('2030-01-11T10:00:00.000Z'),
      reviewedById: adminUser.id,
      createdAt: new Date('2030-01-11T09:00:00.000Z'),
    },
  });

  const pendingPayment = await prisma.payment.create({
    data: {
      bookingId: confirmedBooking.id,
      submittedById: secondCustomer.id,
      amount: 75000,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.BANK_TRANSFER,
      referenceNumber: 'ADMIN-PAYMENT-REPORT-002',
      createdAt: new Date('2030-02-11T09:00:00.000Z'),
    },
  });

  return {
    category,
    customer,
    secondCustomer,
    vendor,
    secondVendor,
    firstEvent,
    secondEvent,
    completedBooking,
    confirmedBooking,
    verifiedPayment,
    pendingPayment,
  };
};

const cleanupAdminTestData = async () => {
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
      booking: {
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
};

beforeEach(async () => {
  await cleanupAdminTestData();

  await prisma.user.deleteMany({
    where: {
      email: {
        in: testEmails,
      },
    },
  });

  await createTestAdmin();
});

afterAll(async () => {
  await cleanupAdminTestData();

  await prisma.user.deleteMany({
    where: {
      email: {
        in: testEmails,
      },
    },
  });

  await prisma.$disconnect();
});

describe('Admin user management API', () => {
  describe('GET /api/v1/admin/users', () => {
    it('rejects requests without an access token', async () => {
      const response = await request(app).get('/api/v1/admin/users');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-admin users', async () => {
      await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const customerAccessToken = await loginUser(customerEmail, userPassword);

      const response = await getAdminUsersRequest(customerAccessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('returns safe user summaries with pagination metadata', async () => {
      const customer = await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminUsersRequest(
        adminAccessToken,
        `?search=${encodeURIComponent(customerEmail)}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        id: customer.id,
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        vendorProfile: null,
      });

      expect(response.body.data[0].passwordHash).toBeUndefined();
      expect(response.body.data[0].refreshToken).toBeUndefined();

      expect(response.body.meta.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('searches users by email, first name and last name', async () => {
      const expectedUser = await createManagedUser({
        email: customerEmail,
        firstName: 'UniqueMaya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      await createManagedUser({
        email: secondCustomerEmail,
        firstName: 'Nila',
        lastName: 'Perera',
        role: UserRole.CUSTOMER,
      });

      const adminAccessToken = await loginTestAdmin();

      const emailResponse = await getAdminUsersRequest(
        adminAccessToken,
        '?search=admin-user-customer',
      );

      expect(emailResponse.status).toBe(200);
      expect(emailResponse.body.data).toHaveLength(1);
      expect(emailResponse.body.data[0].id).toBe(expectedUser.id);

      const firstNameResponse = await getAdminUsersRequest(adminAccessToken, '?search=uniquemaya');

      expect(firstNameResponse.status).toBe(200);
      expect(firstNameResponse.body.data).toHaveLength(1);
      expect(firstNameResponse.body.data[0].id).toBe(expectedUser.id);

      const lastNameResponse = await getAdminUsersRequest(adminAccessToken, '?search=fernando');

      expect(lastNameResponse.status).toBe(200);
      expect(lastNameResponse.body.data).toHaveLength(1);
      expect(lastNameResponse.body.data[0].id).toBe(expectedUser.id);
    });

    it('filters users by role', async () => {
      await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const vendorRegistration = await registerVendor(vendorPayload);

      expect(vendorRegistration.status).toBe(201);

      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminUsersRequest(
        adminAccessToken,
        `?search=${encodeURIComponent(vendorEmail)}&role=VENDOR`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        email: vendorEmail,
        role: 'VENDOR',
        vendorProfile: {
          businessName: 'Pending Moments Photography',
          verificationStatus: 'DRAFT',
        },
      });
    });

    it('filters users by account status', async () => {
      await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const suspendedUser = await createManagedUser({
        email: suspendedCustomerEmail,
        firstName: 'Suspended',
        lastName: 'Customer',
        role: UserRole.CUSTOMER,
        status: AccountStatus.SUSPENDED,
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminUsersRequest(adminAccessToken, '?status=SUSPENDED');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        id: suspendedUser.id,
        email: suspendedCustomerEmail,
        status: 'SUSPENDED',
      });
    });

    it('supports pagination', async () => {
      await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2030-01-01T10:00:00.000Z'),
      });

      const secondUser = await createManagedUser({
        email: secondCustomerEmail,
        firstName: 'Nila',
        lastName: 'Perera',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2030-01-02T10:00:00.000Z'),
      });

      await createManagedUser({
        email: suspendedCustomerEmail,
        firstName: 'Ravi',
        lastName: 'Silva',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2030-01-03T10:00:00.000Z'),
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminUsersRequest(
        adminAccessToken,
        '?role=CUSTOMER&page=2&limit=1&sort=newest',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(secondUser.id);

      expect(response.body.meta.pagination).toEqual({
        page: 2,
        limit: 1,
        total: 3,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('supports name, email, newest and oldest sorting', async () => {
      const maya = await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2030-01-01T10:00:00.000Z'),
      });

      const nila = await createManagedUser({
        email: secondCustomerEmail,
        firstName: 'Nila',
        lastName: 'Perera',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2030-01-02T10:00:00.000Z'),
      });

      const ravi = await createManagedUser({
        email: suspendedCustomerEmail,
        firstName: 'Ravi',
        lastName: 'Silva',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2030-01-03T10:00:00.000Z'),
      });

      const adminAccessToken = await loginTestAdmin();

      const nameAscendingResponse = await getAdminUsersRequest(
        adminAccessToken,
        '?role=CUSTOMER&sort=name_asc',
      );

      expect(nameAscendingResponse.status).toBe(200);

      expect(nameAscendingResponse.body.data.map((user: { id: string }) => user.id)).toEqual([
        maya.id,
        nila.id,
        ravi.id,
      ]);

      const nameDescendingResponse = await getAdminUsersRequest(
        adminAccessToken,
        '?role=CUSTOMER&sort=name_desc',
      );

      expect(nameDescendingResponse.body.data.map((user: { id: string }) => user.id)).toEqual([
        ravi.id,
        nila.id,
        maya.id,
      ]);

      const emailAscendingResponse = await getAdminUsersRequest(
        adminAccessToken,
        '?role=CUSTOMER&sort=email_asc',
      );

      const ascendingEmails = emailAscendingResponse.body.data.map(
        (user: { email: string }) => user.email,
      );

      expect(ascendingEmails).toEqual([...ascendingEmails].sort());

      const emailDescendingResponse = await getAdminUsersRequest(
        adminAccessToken,
        '?role=CUSTOMER&sort=email_desc',
      );

      const descendingEmails = emailDescendingResponse.body.data.map(
        (user: { email: string }) => user.email,
      );

      expect(descendingEmails).toEqual([...descendingEmails].sort().reverse());

      const newestResponse = await getAdminUsersRequest(
        adminAccessToken,
        '?role=CUSTOMER&sort=newest',
      );

      expect(newestResponse.body.data[0].id).toBe(ravi.id);

      const oldestResponse = await getAdminUsersRequest(
        adminAccessToken,
        '?role=CUSTOMER&sort=oldest',
      );

      expect(oldestResponse.body.data[0].id).toBe(maya.id);
    });

    it('rejects invalid list query values', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminUsersRequest(
        adminAccessToken,
        '?page=0&limit=101&role=INVALID&status=INVALID&sort=invalid',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects unexpected query parameters', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminUsersRequest(adminAccessToken, '?unknownFilter=value');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/admin/users/:userId', () => {
    it('rejects requests without an access token', async () => {
      const customer = await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const response = await request(app).get(`/api/v1/admin/users/${customer.id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-admin users', async () => {
      const customer = await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const secondCustomer = await createManagedUser({
        email: secondCustomerEmail,
        firstName: 'Nila',
        lastName: 'Perera',
        role: UserRole.CUSTOMER,
      });

      const customerAccessToken = await loginUser(customerEmail, userPassword);

      const response = await getAdminUserByIdRequest(customerAccessToken, secondCustomer.id);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects an invalid user ID', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminUserByIdRequest(adminAccessToken, 'invalid-user-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when the user does not exist', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminUserByIdRequest(adminAccessToken, 'cly0000000000000000000000');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADMIN_USER_NOT_FOUND');
    });

    it('returns safe customer account details to an admin', async () => {
      const customer = await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminUserByIdRequest(adminAccessToken, customer.id);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: customer.id,
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        customer: null,
        vendorProfile: null,
      });

      expect(response.body.data.createdAt).toEqual(expect.any(String));
      expect(response.body.data.updatedAt).toEqual(expect.any(String));

      expect(response.body.data._count).toEqual({
        createdEvents: 0,
        customerReviews: 0,
        moderatedReviews: 0,
        reviewModerationActions: 0,
        submittedPayments: 0,
        reviewedPayments: 0,
        notifications: 0,
        submittedComplaints: 0,
        receivedComplaints: 0,
        assignedComplaints: 0,
        complaintMessages: 0,
        performedComplaintActions: 0,
      });

      expect(response.body.data.passwordHash).toBeUndefined();
      expect(response.body.data.refreshToken).toBeUndefined();
      expect(response.body.data.vendor).toBeUndefined();
    });

    it('returns detailed vendor profile information with flattened categories', async () => {
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

      expect(registrationResponse.status).toBe(201);

      const vendorAccessToken = registrationResponse.body.data.accessToken as string;
      const vendorUserId = registrationResponse.body.data.user.id as string;

      const submissionResponse = await completeAndSubmitVendor(vendorAccessToken, category.id);

      expect(submissionResponse.status).toBe(200);

      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminUserByIdRequest(adminAccessToken, vendorUserId);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: vendorUserId,
        email: vendorEmail,
        firstName: 'Pending',
        lastName: 'Vendor',
        role: 'VENDOR',
        status: 'ACTIVE',
        customer: null,

        vendorProfile: {
          businessName: 'Pending Moments Photography',
          description: 'Professional photography services for weddings and private events.',
          contactPhone: '+94771234567',
          website: 'https://pending-moments.example.com',
          baseLocation: 'Kandy',
          serviceAreas: ['Kandy', 'Colombo'],
          verificationStatus: 'PENDING',

          categories: [
            {
              id: category.id,
              name: 'Photography',
              slug: 'photography',
            },
          ],
        },
      });

      expect(response.body.data.vendorProfile.id).toEqual(expect.any(String));
      expect(response.body.data.vendorProfile.slug).toEqual(expect.any(String));
      expect(response.body.data.vendorProfile.submittedAt).toEqual(expect.any(String));

      expect(response.body.data.passwordHash).toBeUndefined();
      expect(response.body.data.vendor).toBeUndefined();
    });
  });

  describe('GET /api/v1/admin/dashboard/summary', () => {
    it('rejects requests without an access token', async () => {
      const response = await request(app).get('/api/v1/admin/dashboard/summary');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-admin users', async () => {
      await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const customerAccessToken = await loginUser(customerEmail, userPassword);

      const response = await getAdminDashboardSummaryRequest(customerAccessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects invalid dashboard query values', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminDashboardSummaryRequest(
        adminAccessToken,
        '?recentLimit=0&unknown=value',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns platform-wide dashboard summary metrics to an admin', async () => {
      await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      await createManagedUser({
        email: suspendedCustomerEmail,
        firstName: 'Suspended',
        lastName: 'Customer',
        role: UserRole.CUSTOMER,
        status: AccountStatus.SUSPENDED,
      });

      const vendorRegistration = await registerVendor(vendorPayload);

      expect(vendorRegistration.status).toBe(201);

      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminDashboardSummaryRequest(adminAccessToken, '?recentLimit=2');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.generatedAt).toEqual(expect.any(String));

      expect(response.body.data.users).toMatchObject({
        total: expect.any(Number),

        byRole: {
          customers: expect.any(Number),
          vendors: expect.any(Number),
          admins: expect.any(Number),
        },

        byStatus: {
          active: expect.any(Number),
          pendingVerification: expect.any(Number),
          suspended: expect.any(Number),
          deactivated: expect.any(Number),
        },

        newThisMonth: expect.any(Number),
      });

      expect(response.body.data.users.byRole.customers).toBeGreaterThanOrEqual(2);
      expect(response.body.data.users.byRole.vendors).toBeGreaterThanOrEqual(1);
      expect(response.body.data.users.byRole.admins).toBeGreaterThanOrEqual(1);
      expect(response.body.data.users.byStatus.suspended).toBeGreaterThanOrEqual(1);

      expect(response.body.data.vendors).toMatchObject({
        total: expect.any(Number),
        draft: expect.any(Number),
        pending: expect.any(Number),
        approved: expect.any(Number),
        rejected: expect.any(Number),
      });

      expect(response.body.data.vendors.draft).toBeGreaterThanOrEqual(1);

      expect(response.body.data.events).toMatchObject({
        total: expect.any(Number),
        draft: expect.any(Number),
        planning: expect.any(Number),
        active: expect.any(Number),
        completed: expect.any(Number),
        cancelled: expect.any(Number),
      });

      expect(response.body.data.bookings).toMatchObject({
        total: expect.any(Number),
        awaitingVendorConfirmation: expect.any(Number),
        confirmed: expect.any(Number),
        depositPending: expect.any(Number),
        active: expect.any(Number),
        completed: expect.any(Number),
        cancelled: expect.any(Number),
        rejected: expect.any(Number),
        disputed: expect.any(Number),
      });

      expect(response.body.data.payments).toMatchObject({
        total: expect.any(Number),
        pending: expect.any(Number),
        verified: expect.any(Number),
        rejected: expect.any(Number),
        cancelled: expect.any(Number),
        refunded: expect.any(Number),
        partiallyRefunded: expect.any(Number),
        totalVerifiedAmount: expect.any(String),
      });

      expect(response.body.data.complaints).toMatchObject({
        total: expect.any(Number),
        open: expect.any(Number),
        underReview: expect.any(Number),
        underInvestigation: expect.any(Number),
        awaitingResponse: expect.any(Number),
        awaitingCustomerResponse: expect.any(Number),
        awaitingVendorResponse: expect.any(Number),
        resolved: expect.any(Number),
        dismissed: expect.any(Number),
        closed: expect.any(Number),
        urgent: expect.any(Number),
        unassigned: expect.any(Number),
      });

      expect(response.body.data.reviews).toMatchObject({
        total: expect.any(Number),
        visible: expect.any(Number),
        hidden: expect.any(Number),
      });

      expect(
        typeof response.body.data.reviews.averageRating === 'number' ||
          response.body.data.reviews.averageRating === null,
      ).toBe(true);

      expect(response.body.data.activity.recentUsers.length).toBeLessThanOrEqual(2);
      expect(response.body.data.activity.recentBookings.length).toBeLessThanOrEqual(2);
      expect(response.body.data.activity.recentPayments.length).toBeLessThanOrEqual(2);
      expect(response.body.data.activity.recentComplaints.length).toBeLessThanOrEqual(2);

      expect(
        response.body.data.activity.recentUsers.some(
          (user: { email: string }) => user.email === vendorEmail,
        ),
      ).toBe(true);
    });
  });

  describe('GET /api/v1/admin/reports/users', () => {
    it('rejects requests without an access token', async () => {
      const response = await request(app).get('/api/v1/admin/reports/users');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-admin users', async () => {
      await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const customerAccessToken = await loginUser(customerEmail, userPassword);

      const response = await getAdminUserReportRequest(customerAccessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects invalid report query values', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminUserReportRequest(
        adminAccessToken,
        '?from=2030-02-01&to=2030-01-01&role=INVALID&status=INVALID&groupBy=year&recentLimit=0&unknown=value',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns user report totals, breakdowns, growth and recent users to an admin', async () => {
      await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2030-01-01T10:00:00.000Z'),
      });

      await createManagedUser({
        email: secondCustomerEmail,
        firstName: 'Nila',
        lastName: 'Perera',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2030-01-01T12:00:00.000Z'),
      });

      await createManagedUser({
        email: suspendedCustomerEmail,
        firstName: 'Suspended',
        lastName: 'Customer',
        role: UserRole.CUSTOMER,
        status: AccountStatus.SUSPENDED,
        createdAt: new Date('2030-01-02T10:00:00.000Z'),
      });

      const vendorRegistration = await registerVendor(vendorPayload);

      expect(vendorRegistration.status).toBe(201);

      await prisma.user.update({
        where: {
          email: vendorEmail,
        },
        data: {
          createdAt: new Date('2030-01-03T10:00:00.000Z'),
        },
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminUserReportRequest(
        adminAccessToken,
        '?from=2030-01-01&to=2030-01-03&groupBy=day&recentLimit=2',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.generatedAt).toEqual(expect.any(String));

      expect(response.body.data.filters).toMatchObject({
        from: expect.any(String),
        to: expect.any(String),
        role: null,
        status: null,
        groupBy: 'day',
        recentLimit: 2,
      });

      expect(response.body.data.totals).toMatchObject({
        users: 4,

        byRole: {
          customers: 3,
          vendors: 1,
          admins: 0,
        },

        byStatus: {
          active: 3,
          pendingVerification: 0,
          suspended: 1,
          deactivated: 0,
        },
      });

      expect(response.body.data.growth).toEqual([
        {
          period: '2030-01-01',
          count: 2,
        },
        {
          period: '2030-01-02',
          count: 1,
        },
        {
          period: '2030-01-03',
          count: 1,
        },
      ]);

      expect(response.body.data.recentUsers).toHaveLength(2);

      expect(response.body.data.recentUsers[0]).toMatchObject({
        email: vendorEmail,
        role: 'VENDOR',
        vendorProfile: {
          businessName: 'Pending Moments Photography',
          verificationStatus: 'DRAFT',
        },
      });

      expect(response.body.data.recentUsers[1]).toMatchObject({
        email: suspendedCustomerEmail,
        role: 'CUSTOMER',
        status: 'SUSPENDED',
        vendorProfile: null,
      });

      expect(response.body.data.recentUsers[0].passwordHash).toBeUndefined();
      expect(response.body.data.recentUsers[0].vendor).toBeUndefined();
    });

    it('supports role, status and month grouping filters', async () => {
      await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2030-01-10T10:00:00.000Z'),
      });

      await createManagedUser({
        email: secondCustomerEmail,
        firstName: 'Nila',
        lastName: 'Perera',
        role: UserRole.CUSTOMER,
        status: AccountStatus.SUSPENDED,
        createdAt: new Date('2030-02-10T10:00:00.000Z'),
      });

      await createManagedUser({
        email: suspendedCustomerEmail,
        firstName: 'Ravi',
        lastName: 'Silva',
        role: UserRole.CUSTOMER,
        status: AccountStatus.SUSPENDED,
        createdAt: new Date('2030-02-15T10:00:00.000Z'),
      });

      const vendorRegistration = await registerVendor(vendorPayload);

      expect(vendorRegistration.status).toBe(201);

      await prisma.user.update({
        where: {
          email: vendorEmail,
        },
        data: {
          createdAt: new Date('2030-02-20T10:00:00.000Z'),
        },
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminUserReportRequest(
        adminAccessToken,
        '?from=2030-01-01&to=2030-02-28&role=CUSTOMER&status=SUSPENDED&groupBy=month&recentLimit=5',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.filters).toMatchObject({
        role: 'CUSTOMER',
        status: 'SUSPENDED',
        groupBy: 'month',
        recentLimit: 5,
      });

      expect(response.body.data.totals).toMatchObject({
        users: 2,

        byRole: {
          customers: 2,
          vendors: 0,
          admins: 0,
        },

        byStatus: {
          active: 1,
          pendingVerification: 0,
          suspended: 2,
          deactivated: 0,
        },
      });

      expect(response.body.data.growth).toEqual([
        {
          period: '2030-02',
          count: 2,
        },
      ]);

      expect(response.body.data.recentUsers).toHaveLength(2);

      expect(
        response.body.data.recentUsers.every(
          (user: { role: string; status: string }) =>
            user.role === 'CUSTOMER' && user.status === 'SUSPENDED',
        ),
      ).toBe(true);
    });
  });

  describe('GET /api/v1/admin/reports/events', () => {
    it('rejects requests without an access token', async () => {
      const response = await request(app).get('/api/v1/admin/reports/events');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-admin users', async () => {
      await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const customerAccessToken = await loginUser(customerEmail, userPassword);

      const response = await getAdminEventReportRequest(customerAccessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects invalid report query values', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminEventReportRequest(
        adminAccessToken,
        '?from=2030-02-01&to=2030-01-01&status=INVALID&ownerId=invalid-owner&eventType=&location=&groupBy=year&recentLimit=0&unknown=value',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns event report totals, planning summary, growth, top groups and recent events to an admin', async () => {
      const fixture = await createAdminEventReportFixture();
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminEventReportRequest(
        adminAccessToken,
        '?from=2030-01-01&to=2030-02-28&groupBy=month&recentLimit=2',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.generatedAt).toEqual(expect.any(String));

      expect(response.body.data.filters).toMatchObject({
        from: expect.any(String),
        to: expect.any(String),
        status: null,
        ownerId: null,
        eventType: null,
        location: null,
        groupBy: 'month',
        recentLimit: 2,
      });

      expect(response.body.data.totals).toEqual({
        events: 3,

        byStatus: {
          draft: 0,
          planning: 1,
          active: 0,
          completed: 1,
          cancelled: 1,
        },
      });

      expect(response.body.data.planning).toEqual({
        totalPlannedBudget: '3800000',
        totalGuestCount: 430,
        averageGuestCount: expect.any(Number),
      });

      expect(response.body.data.planning.averageGuestCount).toBeCloseTo(143.33333333333334);

      expect(response.body.data.growth).toEqual([
        {
          period: '2030-01',
          count: 1,
        },
        {
          period: '2030-02',
          count: 2,
        },
      ]);

      expect(response.body.data.topEventTypes).toEqual(
        expect.arrayContaining([
          {
            eventType: 'Wedding',
            eventCount: 1,
          },
          {
            eventType: 'Birthday',
            eventCount: 1,
          },
          {
            eventType: 'Corporate',
            eventCount: 1,
          },
        ]),
      );

      expect(response.body.data.topLocations).toEqual(
        expect.arrayContaining([
          {
            location: 'Colombo',
            eventCount: 2,
          },
          {
            location: 'Kandy',
            eventCount: 1,
          },
        ]),
      );

      expect(response.body.data.topCustomers).toEqual(
        expect.arrayContaining([
          {
            customer: {
              id: fixture.customer.id,
              email: customerEmail,
              firstName: 'Maya',
              lastName: 'Fernando',
              status: 'ACTIVE',
            },
            eventCount: 2,
            plannedBudget: '3200000',
            guestCount: 350,
          },
          {
            customer: {
              id: fixture.secondCustomer.id,
              email: secondCustomerEmail,
              firstName: 'Nila',
              lastName: 'Perera',
              status: 'ACTIVE',
            },
            eventCount: 1,
            plannedBudget: '600000',
            guestCount: 80,
          },
        ]),
      );

      expect(response.body.data.recentEvents).toHaveLength(2);

      expect(response.body.data.recentEvents[0]).toMatchObject({
        id: fixture.corporateEvent.id,
        name: 'Admin Event Report Corporate Meetup',
        eventType: 'Corporate',
        location: 'Colombo',
        guestCount: 200,
        plannedBudget: '2000000',
        theme: 'Modern',
        requirements: 'Corporate event requirements.',
        status: 'CANCELLED',
        owner: {
          id: fixture.customer.id,
          email: customerEmail,
        },
        _count: {
          bookings: 0,
          guests: 0,
        },
      });

      expect(response.body.data.recentEvents[1]).toMatchObject({
        id: fixture.birthdayEvent.id,
        name: 'Admin Event Report Birthday',
        eventType: 'Birthday',
        location: 'Kandy',
        guestCount: 80,
        plannedBudget: '600000',
        status: 'COMPLETED',
        owner: {
          id: fixture.secondCustomer.id,
          email: secondCustomerEmail,
        },
        _count: {
          bookings: 0,
          guests: 0,
        },
      });

      expect(response.body.data.recentEvents[0].owner.passwordHash).toBeUndefined();
    });

    it('supports status, owner, event type, location and day grouping filters', async () => {
      const fixture = await createAdminEventReportFixture();
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminEventReportRequest(
        adminAccessToken,
        `?from=2030-01-01&to=2030-01-31&status=PLANNING&ownerId=${fixture.customer.id}&eventType=wedding&location=colombo&groupBy=day&recentLimit=5`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.filters).toMatchObject({
        status: 'PLANNING',
        ownerId: fixture.customer.id,
        eventType: 'wedding',
        location: 'colombo',
        groupBy: 'day',
        recentLimit: 5,
      });

      expect(response.body.data.totals).toEqual({
        events: 1,

        byStatus: {
          draft: 0,
          planning: 1,
          active: 0,
          completed: 0,
          cancelled: 0,
        },
      });

      expect(response.body.data.planning).toEqual({
        totalPlannedBudget: '1200000',
        totalGuestCount: 150,
        averageGuestCount: 150,
      });

      expect(response.body.data.growth).toEqual([
        {
          period: '2030-01-10',
          count: 1,
        },
      ]);

      expect(response.body.data.topEventTypes).toEqual([
        {
          eventType: 'Wedding',
          eventCount: 1,
        },
      ]);

      expect(response.body.data.topLocations).toEqual([
        {
          location: 'Colombo',
          eventCount: 1,
        },
      ]);

      expect(response.body.data.topCustomers).toEqual([
        {
          customer: {
            id: fixture.customer.id,
            email: customerEmail,
            firstName: 'Maya',
            lastName: 'Fernando',
            status: 'ACTIVE',
          },
          eventCount: 1,
          plannedBudget: '1200000',
          guestCount: 150,
        },
      ]);

      expect(response.body.data.recentEvents).toHaveLength(1);
      expect(response.body.data.recentEvents[0]).toMatchObject({
        id: fixture.weddingEvent.id,
        name: 'Admin Event Report Wedding',
        eventType: 'Wedding',
        location: 'Colombo',
        plannedBudget: '1200000',
        status: 'PLANNING',
        owner: {
          id: fixture.customer.id,
        },
      });
    });
  });

  describe('GET /api/v1/admin/reports/vendors', () => {
    it('rejects requests without an access token', async () => {
      const response = await request(app).get('/api/v1/admin/reports/vendors');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-admin users', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      expect(registrationResponse.status).toBe(201);

      const vendorAccessToken = registrationResponse.body.data.accessToken as string;

      const response = await getAdminVendorReportRequest(vendorAccessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects invalid report query values', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminVendorReportRequest(
        adminAccessToken,
        '?from=2030-02-01&to=2030-01-01&verificationStatus=INVALID&accountStatus=INVALID&categoryId=invalid-category&groupBy=year&recentLimit=0&unknown=value',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns vendor report totals, breakdowns, growth, top categories and recent vendors to an admin', async () => {
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

      expect(pendingVendorRegistration.status).toBe(201);

      const pendingVendorAccessToken = pendingVendorRegistration.body.data.accessToken as string;

      const submissionResponse = await completeAndSubmitVendor(
        pendingVendorAccessToken,
        category.id,
      );

      expect(submissionResponse.status).toBe(200);

      const draftVendorRegistration = await registerVendor(draftVendorPayload);

      expect(draftVendorRegistration.status).toBe(201);

      await prisma.vendorProfile.update({
        where: {
          userId: pendingVendorRegistration.body.data.user.id,
        },
        data: {
          createdAt: new Date('2030-01-01T10:00:00.000Z'),
        },
      });

      await prisma.vendorProfile.update({
        where: {
          userId: draftVendorRegistration.body.data.user.id,
        },
        data: {
          createdAt: new Date('2030-01-02T10:00:00.000Z'),
        },
      });

      await prisma.user.update({
        where: {
          email: draftVendorEmail,
        },
        data: {
          status: AccountStatus.SUSPENDED,
        },
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminVendorReportRequest(
        adminAccessToken,
        '?from=2030-01-01&to=2030-01-02&groupBy=day&recentLimit=2',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.generatedAt).toEqual(expect.any(String));

      expect(response.body.data.filters).toMatchObject({
        from: expect.any(String),
        to: expect.any(String),
        verificationStatus: null,
        accountStatus: null,
        categoryId: null,
        groupBy: 'day',
        recentLimit: 2,
      });

      expect(response.body.data.totals).toMatchObject({
        vendors: 2,

        byVerificationStatus: {
          draft: 1,
          pending: 1,
          approved: 0,
          rejected: 0,
        },

        byAccountStatus: {
          active: 1,
          pendingVerification: 0,
          suspended: 1,
          deactivated: 0,
        },
      });

      expect(response.body.data.growth).toEqual([
        {
          period: '2030-01-01',
          count: 1,
        },
        {
          period: '2030-01-02',
          count: 1,
        },
      ]);

      expect(response.body.data.topCategories).toEqual([
        {
          category: {
            id: category.id,
            name: 'Photography',
            slug: 'photography',
          },
          vendorCount: 1,
        },
      ]);

      expect(response.body.data.recentVendors).toHaveLength(2);

      expect(response.body.data.recentVendors[0]).toMatchObject({
        businessName: 'Draft Events Studio',
        verificationStatus: 'DRAFT',
        user: {
          email: draftVendorEmail,
          status: 'SUSPENDED',
        },
        categories: [],
        _count: {
          packages: 0,
          bookings: 0,
          reviews: 0,
        },
      });

      expect(response.body.data.recentVendors[1]).toMatchObject({
        businessName: 'Pending Moments Photography',
        verificationStatus: 'PENDING',
        baseLocation: 'Kandy',
        serviceAreas: ['Kandy', 'Colombo'],
        user: {
          email: vendorEmail,
          status: 'ACTIVE',
        },
        categories: [
          {
            id: category.id,
            name: 'Photography',
            slug: 'photography',
          },
        ],
        _count: {
          packages: 0,
          bookings: 0,
          reviews: 0,
        },
      });

      expect(response.body.data.recentVendors[0].user.passwordHash).toBeUndefined();
      expect(response.body.data.recentVendors[0].user.refreshToken).toBeUndefined();
    });

    it('supports verification status, account status, category and month grouping filters', async () => {
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

      expect(pendingVendorRegistration.status).toBe(201);

      const pendingVendorAccessToken = pendingVendorRegistration.body.data.accessToken as string;

      await completeAndSubmitVendor(pendingVendorAccessToken, category.id);

      const draftVendorRegistration = await registerVendor(draftVendorPayload);

      expect(draftVendorRegistration.status).toBe(201);

      await prisma.vendorProfile.update({
        where: {
          userId: pendingVendorRegistration.body.data.user.id,
        },
        data: {
          verificationStatus: VendorVerificationStatus.APPROVED,
          reviewedAt: new Date('2030-02-15T10:00:00.000Z'),
          createdAt: new Date('2030-02-10T10:00:00.000Z'),
        },
      });

      await prisma.vendorProfile.update({
        where: {
          userId: draftVendorRegistration.body.data.user.id,
        },
        data: {
          createdAt: new Date('2030-02-20T10:00:00.000Z'),
        },
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminVendorReportRequest(
        adminAccessToken,
        `?from=2030-02-01&to=2030-02-28&verificationStatus=APPROVED&accountStatus=ACTIVE&categoryId=${category.id}&groupBy=month&recentLimit=5`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.filters).toMatchObject({
        verificationStatus: 'APPROVED',
        accountStatus: 'ACTIVE',
        categoryId: category.id,
        groupBy: 'month',
        recentLimit: 5,
      });

      expect(response.body.data.totals).toMatchObject({
        vendors: 1,

        byVerificationStatus: {
          draft: 0,
          pending: 0,
          approved: 1,
          rejected: 0,
        },

        byAccountStatus: {
          active: 1,
          pendingVerification: 0,
          suspended: 0,
          deactivated: 0,
        },
      });

      expect(response.body.data.growth).toEqual([
        {
          period: '2030-02',
          count: 1,
        },
      ]);

      expect(response.body.data.topCategories).toEqual([
        {
          category: {
            id: category.id,
            name: 'Photography',
            slug: 'photography',
          },
          vendorCount: 1,
        },
      ]);

      expect(response.body.data.recentVendors).toHaveLength(1);

      expect(response.body.data.recentVendors[0]).toMatchObject({
        businessName: 'Pending Moments Photography',
        verificationStatus: 'APPROVED',
        user: {
          email: vendorEmail,
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
    });
  });

  describe('GET /api/v1/admin/reports/bookings', () => {
    it('rejects requests without an access token', async () => {
      const response = await request(app).get('/api/v1/admin/reports/bookings');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-admin users', async () => {
      await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const customerAccessToken = await loginUser(customerEmail, userPassword);

      const response = await getAdminBookingReportRequest(customerAccessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects invalid report query values', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminBookingReportRequest(
        adminAccessToken,
        '?from=2030-02-01&to=2030-01-01&status=INVALID&vendorId=invalid-vendor&customerId=invalid-customer&eventId=invalid-event&groupBy=year&recentLimit=0&unknown=value',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns booking report totals, financials, growth, top vendors and recent bookings to an admin', async () => {
      const fixture = await createAdminBookingReportFixture();
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminBookingReportRequest(
        adminAccessToken,
        '?from=2030-01-01&to=2030-02-28&groupBy=month&recentLimit=2',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.generatedAt).toEqual(expect.any(String));

      expect(response.body.data.filters).toMatchObject({
        from: expect.any(String),
        to: expect.any(String),
        status: null,
        vendorId: null,
        customerId: null,
        eventId: null,
        groupBy: 'month',
        recentLimit: 2,
      });

      expect(response.body.data.totals).toMatchObject({
        bookings: 2,

        byStatus: {
          awaitingVendorConfirmation: 0,
          confirmed: 1,
          depositPending: 0,
          active: 0,
          completed: 1,
          cancelled: 0,
          rejected: 0,
          disputed: 0,
        },
      });

      expect(response.body.data.financials).toEqual({
        totalAgreedCost: '400000',
        completedAgreedCost: '150000',
        verifiedPaymentAmount: '50000',
      });

      expect(response.body.data.growth).toEqual([
        {
          period: '2030-01',
          count: 1,
        },
        {
          period: '2030-02',
          count: 1,
        },
      ]);

      expect(response.body.data.topVendors).toHaveLength(2);

      expect(response.body.data.topVendors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            vendor: expect.objectContaining({
              id: fixture.vendor.id,
              businessName: 'Pending Moments Photography',
              verificationStatus: 'APPROVED',
            }),
            bookingCount: 1,
            agreedCost: '150000',
          }),
          expect.objectContaining({
            vendor: expect.objectContaining({
              id: fixture.secondVendor.id,
              businessName: 'Draft Events Studio',
              verificationStatus: 'APPROVED',
            }),
            bookingCount: 1,
            agreedCost: '250000',
          }),
        ]),
      );

      expect(response.body.data.recentBookings).toHaveLength(2);

      expect(response.body.data.recentBookings[0]).toMatchObject({
        id: fixture.confirmedBooking.id,
        status: 'CONFIRMED',
        agreedCost: '250000',
        event: {
          id: fixture.secondEvent.id,
          name: 'Admin Booking Report Birthday',
          eventType: 'Birthday',
          location: 'Kandy',
          owner: {
            id: fixture.secondCustomer.id,
            email: secondCustomerEmail,
          },
        },
        vendor: {
          id: fixture.secondVendor.id,
          businessName: 'Draft Events Studio',
          verificationStatus: 'APPROVED',
        },
        _count: {
          payments: 1,
          complaints: 0,
        },
      });

      expect(response.body.data.recentBookings[1]).toMatchObject({
        id: fixture.completedBooking.id,
        status: 'COMPLETED',
        agreedCost: '150000',
        event: {
          id: fixture.firstEvent.id,
          name: 'Admin Booking Report Wedding',
          eventType: 'Wedding',
          location: 'Colombo',
          owner: {
            id: fixture.customer.id,
            email: customerEmail,
          },
        },
        vendor: {
          id: fixture.vendor.id,
          businessName: 'Pending Moments Photography',
          verificationStatus: 'APPROVED',
        },
        _count: {
          payments: 1,
          complaints: 0,
        },
      });

      expect(response.body.data.recentBookings[0].vendor.user.passwordHash).toBeUndefined();
      expect(response.body.data.recentBookings[0].event.owner.passwordHash).toBeUndefined();
    });

    it('supports status, vendor, customer, event and day grouping filters', async () => {
      const fixture = await createAdminBookingReportFixture();
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminBookingReportRequest(
        adminAccessToken,
        `?from=2030-01-01&to=2030-01-31&status=COMPLETED&vendorId=${fixture.vendor.id}&customerId=${fixture.customer.id}&eventId=${fixture.firstEvent.id}&groupBy=day&recentLimit=5`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.filters).toMatchObject({
        status: 'COMPLETED',
        vendorId: fixture.vendor.id,
        customerId: fixture.customer.id,
        eventId: fixture.firstEvent.id,
        groupBy: 'day',
        recentLimit: 5,
      });

      expect(response.body.data.totals).toMatchObject({
        bookings: 1,

        byStatus: {
          awaitingVendorConfirmation: 0,
          confirmed: 0,
          depositPending: 0,
          active: 0,
          completed: 1,
          cancelled: 0,
          rejected: 0,
          disputed: 0,
        },
      });

      expect(response.body.data.financials).toEqual({
        totalAgreedCost: '150000',
        completedAgreedCost: '150000',
        verifiedPaymentAmount: '50000',
      });

      expect(response.body.data.growth).toEqual([
        {
          period: '2030-01-10',
          count: 1,
        },
      ]);

      expect(response.body.data.topVendors).toEqual([
        {
          vendor: {
            id: fixture.vendor.id,
            businessName: 'Pending Moments Photography',
            slug: expect.any(String),
            verificationStatus: 'APPROVED',
          },
          bookingCount: 1,
          agreedCost: '150000',
        },
      ]);

      expect(response.body.data.recentBookings).toHaveLength(1);
      expect(response.body.data.recentBookings[0]).toMatchObject({
        id: fixture.completedBooking.id,
        status: 'COMPLETED',
        agreedCost: '150000',
        event: {
          id: fixture.firstEvent.id,
          owner: {
            id: fixture.customer.id,
          },
        },
        vendor: {
          id: fixture.vendor.id,
        },
      });
    });
  });

  describe('GET /api/v1/admin/reports/payments', () => {
    it('rejects requests without an access token', async () => {
      const response = await request(app).get('/api/v1/admin/reports/payments');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-admin users', async () => {
      await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const customerAccessToken = await loginUser(customerEmail, userPassword);

      const response = await getAdminPaymentReportRequest(customerAccessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects invalid report query values', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminPaymentReportRequest(
        adminAccessToken,
        '?from=2030-02-01&to=2030-01-01&status=INVALID&method=INVALID&vendorId=invalid-vendor&customerId=invalid-customer&bookingId=invalid-booking&groupBy=year&recentLimit=0&unknown=value',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns payment report totals, financials, growth, top vendors, top customers and recent payments to an admin', async () => {
      const fixture = await createAdminBookingReportFixture();
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminPaymentReportRequest(
        adminAccessToken,
        '?from=2030-01-01&to=2030-02-28&groupBy=month&recentLimit=2',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.generatedAt).toEqual(expect.any(String));

      expect(response.body.data.filters).toMatchObject({
        from: expect.any(String),
        to: expect.any(String),
        status: null,
        method: null,
        vendorId: null,
        customerId: null,
        bookingId: null,
        groupBy: 'month',
        recentLimit: 2,
      });

      expect(response.body.data.totals).toEqual({
        payments: 2,

        byStatus: {
          pending: 1,
          verified: 1,
          rejected: 0,
          cancelled: 0,
          refunded: 0,
          partiallyRefunded: 0,
        },

        byMethod: {
          bankTransfer: 2,
        },
      });

      expect(response.body.data.financials).toEqual({
        totalAmount: '125000',
        pendingAmount: '75000',
        verifiedAmount: '50000',
        rejectedAmount: '0',
        refundedAmount: '0',
      });

      expect(response.body.data.growth).toEqual([
        {
          period: '2030-01',
          count: 1,
        },
        {
          period: '2030-02',
          count: 1,
        },
      ]);

      expect(response.body.data.topVendors).toEqual([
        {
          vendor: {
            id: fixture.vendor.id,
            businessName: 'Pending Moments Photography',
            slug: expect.any(String),
            verificationStatus: 'APPROVED',
          },
          paymentCount: 1,
          verifiedAmount: '50000',
        },
      ]);

      expect(response.body.data.topCustomers).toEqual(
        expect.arrayContaining([
          {
            customer: {
              id: fixture.secondCustomer.id,
              email: secondCustomerEmail,
              firstName: 'Nila',
              lastName: 'Perera',
              status: 'ACTIVE',
            },
            paymentCount: 1,
            totalAmount: '75000',
          },
          {
            customer: {
              id: fixture.customer.id,
              email: customerEmail,
              firstName: 'Maya',
              lastName: 'Fernando',
              status: 'ACTIVE',
            },
            paymentCount: 1,
            totalAmount: '50000',
          },
        ]),
      );

      expect(response.body.data.recentPayments).toHaveLength(2);

      expect(response.body.data.recentPayments[0]).toMatchObject({
        id: fixture.pendingPayment.id,
        amount: '75000',
        status: 'PENDING',
        method: 'BANK_TRANSFER',
        referenceNumber: 'ADMIN-PAYMENT-REPORT-002',
        booking: {
          id: fixture.confirmedBooking.id,
          status: 'CONFIRMED',
          agreedCost: '250000',
          event: {
            id: fixture.secondEvent.id,
            name: 'Admin Booking Report Birthday',
            owner: {
              id: fixture.secondCustomer.id,
              email: secondCustomerEmail,
            },
          },
          vendor: {
            id: fixture.secondVendor.id,
            businessName: 'Draft Events Studio',
            verificationStatus: 'APPROVED',
          },
        },
        submittedBy: {
          id: fixture.secondCustomer.id,
          email: secondCustomerEmail,
        },
        reviewedBy: null,
      });

      expect(response.body.data.recentPayments[1]).toMatchObject({
        id: fixture.verifiedPayment.id,
        amount: '50000',
        status: 'VERIFIED',
        method: 'BANK_TRANSFER',
        referenceNumber: 'ADMIN-BOOKING-REPORT-001',
        booking: {
          id: fixture.completedBooking.id,
          status: 'COMPLETED',
          agreedCost: '150000',
          event: {
            id: fixture.firstEvent.id,
            name: 'Admin Booking Report Wedding',
            owner: {
              id: fixture.customer.id,
              email: customerEmail,
            },
          },
          vendor: {
            id: fixture.vendor.id,
            businessName: 'Pending Moments Photography',
            verificationStatus: 'APPROVED',
          },
        },
        submittedBy: {
          id: fixture.customer.id,
          email: customerEmail,
        },
        reviewedBy: {
          email: adminEmail,
        },
      });

      expect(response.body.data.recentPayments[0].submittedBy.passwordHash).toBeUndefined();
      expect(response.body.data.recentPayments[0].booking.event.owner.passwordHash).toBeUndefined();
    });

    it('supports status, method, vendor, customer, booking and day grouping filters', async () => {
      const fixture = await createAdminBookingReportFixture();
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminPaymentReportRequest(
        adminAccessToken,
        `?from=2030-01-01&to=2030-01-31&status=VERIFIED&method=BANK_TRANSFER&vendorId=${fixture.vendor.id}&customerId=${fixture.customer.id}&bookingId=${fixture.completedBooking.id}&groupBy=day&recentLimit=5`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.filters).toMatchObject({
        status: 'VERIFIED',
        method: 'BANK_TRANSFER',
        vendorId: fixture.vendor.id,
        customerId: fixture.customer.id,
        bookingId: fixture.completedBooking.id,
        groupBy: 'day',
        recentLimit: 5,
      });

      expect(response.body.data.totals).toEqual({
        payments: 1,

        byStatus: {
          pending: 0,
          verified: 1,
          rejected: 0,
          cancelled: 0,
          refunded: 0,
          partiallyRefunded: 0,
        },

        byMethod: {
          bankTransfer: 1,
        },
      });

      expect(response.body.data.financials).toEqual({
        totalAmount: '50000',
        pendingAmount: '0',
        verifiedAmount: '50000',
        rejectedAmount: '0',
        refundedAmount: '0',
      });

      expect(response.body.data.growth).toEqual([
        {
          period: '2030-01-11',
          count: 1,
        },
      ]);

      expect(response.body.data.topVendors).toEqual([
        {
          vendor: {
            id: fixture.vendor.id,
            businessName: 'Pending Moments Photography',
            slug: expect.any(String),
            verificationStatus: 'APPROVED',
          },
          paymentCount: 1,
          verifiedAmount: '50000',
        },
      ]);

      expect(response.body.data.topCustomers).toEqual([
        {
          customer: {
            id: fixture.customer.id,
            email: customerEmail,
            firstName: 'Maya',
            lastName: 'Fernando',
            status: 'ACTIVE',
          },
          paymentCount: 1,
          totalAmount: '50000',
        },
      ]);

      expect(response.body.data.recentPayments).toHaveLength(1);
      expect(response.body.data.recentPayments[0]).toMatchObject({
        id: fixture.verifiedPayment.id,
        amount: '50000',
        status: 'VERIFIED',
        booking: {
          id: fixture.completedBooking.id,
          vendor: {
            id: fixture.vendor.id,
          },
        },
        submittedBy: {
          id: fixture.customer.id,
        },
      });
    });
  });

  describe('GET /api/v1/admin/reports/complaints', () => {
    it('rejects requests without an access token', async () => {
      const response = await request(app).get('/api/v1/admin/reports/complaints');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-admin users', async () => {
      await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const customerAccessToken = await loginUser(customerEmail, userPassword);

      const response = await getAdminComplaintReportRequest(customerAccessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects invalid report query values', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminComplaintReportRequest(
        adminAccessToken,
        '?from=2030-02-01&to=2030-01-01&status=INVALID&type=INVALID&priority=INVALID&complainantId=invalid-complainant&respondentId=invalid-respondent&assignedAdminId=invalid-admin&assignment=maybe&groupBy=year&recentLimit=0&unknown=value',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns complaint report totals, growth, breakdowns, top users and recent complaints to an admin', async () => {
      const fixture = await createAdminComplaintReportFixture();
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminComplaintReportRequest(
        adminAccessToken,
        '?from=2030-01-01&to=2030-02-28&groupBy=month&recentLimit=2',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.generatedAt).toEqual(expect.any(String));

      expect(response.body.data.filters).toMatchObject({
        from: expect.any(String),
        to: expect.any(String),
        status: null,
        type: null,
        priority: null,
        complainantId: null,
        respondentId: null,
        assignedAdminId: null,
        assignment: 'all',
        groupBy: 'month',
        recentLimit: 2,
      });

      expect(response.body.data.totals).toEqual({
        complaints: 3,

        byStatus: {
          open: 1,
          underReview: 1,
          awaitingCustomerResponse: 0,
          awaitingVendorResponse: 0,
          underInvestigation: 0,
          resolved: 1,
          dismissed: 0,
          closed: 0,
        },

        byAssignment: {
          assigned: 2,
          unassigned: 1,
        },
      });

      expect(response.body.data.growth).toEqual([
        {
          period: '2030-01',
          count: 1,
        },
        {
          period: '2030-02',
          count: 2,
        },
      ]);

      expect(response.body.data.byType).toEqual(
        expect.arrayContaining([
          {
            type: 'BOOKING',
            complaintCount: 1,
          },
          {
            type: 'PAYMENT',
            complaintCount: 1,
          },
          {
            type: 'PLATFORM',
            complaintCount: 1,
          },
        ]),
      );

      expect(response.body.data.byPriority).toEqual(
        expect.arrayContaining([
          {
            priority: 'URGENT',
            complaintCount: 1,
          },
          {
            priority: 'HIGH',
            complaintCount: 1,
          },
          {
            priority: 'LOW',
            complaintCount: 1,
          },
        ]),
      );

      expect(response.body.data.topComplainants).toEqual(
        expect.arrayContaining([
          {
            complainant: {
              id: fixture.customer.id,
              email: customerEmail,
              firstName: 'Maya',
              lastName: 'Fernando',
              role: 'CUSTOMER',
              status: 'ACTIVE',
            },
            complaintCount: 2,
          },
          {
            complainant: {
              id: fixture.secondCustomer.id,
              email: secondCustomerEmail,
              firstName: 'Nila',
              lastName: 'Perera',
              role: 'CUSTOMER',
              status: 'ACTIVE',
            },
            complaintCount: 1,
          },
        ]),
      );

      expect(response.body.data.topRespondents).toEqual(
        expect.arrayContaining([
          {
            respondent: {
              id: fixture.secondCustomer.id,
              email: secondCustomerEmail,
              firstName: 'Nila',
              lastName: 'Perera',
              role: 'CUSTOMER',
              status: 'ACTIVE',
            },
            complaintCount: 2,
          },
        ]),
      );

      expect(response.body.data.recentComplaints).toHaveLength(2);

      expect(response.body.data.recentComplaints[0]).toMatchObject({
        id: fixture.platformComplaint.id,
        type: 'PLATFORM',
        subject: 'Admin complaint report platform issue',
        description: 'The platform complaint was created for admin complaint report testing.',
        status: 'UNDER_REVIEW',
        priority: 'LOW',
        complainant: {
          id: fixture.secondCustomer.id,
          email: secondCustomerEmail,
        },
        respondent: null,
        assignedAdmin: {
          id: fixture.adminUser.id,
          email: adminEmail,
        },
        booking: null,
        payment: null,
        review: null,
        quotationRequest: null,
        _count: {
          messages: 0,
          actions: 0,
        },
      });

      expect(response.body.data.recentComplaints[1]).toMatchObject({
        id: fixture.resolvedComplaint.id,
        type: 'PAYMENT',
        subject: 'Admin complaint report payment issue',
        status: 'RESOLVED',
        priority: 'HIGH',
        resolutionSummary: 'The payment complaint was resolved by the administrator.',
        complainant: {
          id: fixture.customer.id,
          email: customerEmail,
        },
        respondent: {
          id: fixture.secondCustomer.id,
          email: secondCustomerEmail,
        },
        assignedAdmin: null,
        _count: {
          messages: 0,
          actions: 0,
        },
      });

      expect(response.body.data.recentComplaints[0].complainant.passwordHash).toBeUndefined();
      expect(response.body.data.recentComplaints[0].assignedAdmin.passwordHash).toBeUndefined();
    });

    it('supports status, type, priority, participant, assignment and day grouping filters', async () => {
      const fixture = await createAdminComplaintReportFixture();
      const adminAccessToken = await loginTestAdmin();

      const response = await getAdminComplaintReportRequest(
        adminAccessToken,
        `?from=2030-01-01&to=2030-01-31&status=OPEN&type=BOOKING&priority=URGENT&complainantId=${fixture.customer.id}&respondentId=${fixture.secondCustomer.id}&assignedAdminId=${fixture.adminUser.id}&assignment=assigned&groupBy=day&recentLimit=5`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data.filters).toMatchObject({
        status: 'OPEN',
        type: 'BOOKING',
        priority: 'URGENT',
        complainantId: fixture.customer.id,
        respondentId: fixture.secondCustomer.id,
        assignedAdminId: fixture.adminUser.id,
        assignment: 'assigned',
        groupBy: 'day',
        recentLimit: 5,
      });

      expect(response.body.data.totals).toEqual({
        complaints: 1,

        byStatus: {
          open: 1,
          underReview: 0,
          awaitingCustomerResponse: 0,
          awaitingVendorResponse: 0,
          underInvestigation: 0,
          resolved: 0,
          dismissed: 0,
          closed: 0,
        },

        byAssignment: {
          assigned: 1,
          unassigned: 0,
        },
      });

      expect(response.body.data.growth).toEqual([
        {
          period: '2030-01-10',
          count: 1,
        },
      ]);

      expect(response.body.data.byType).toEqual([
        {
          type: 'BOOKING',
          complaintCount: 1,
        },
      ]);

      expect(response.body.data.byPriority).toEqual([
        {
          priority: 'URGENT',
          complaintCount: 1,
        },
      ]);

      expect(response.body.data.topComplainants).toEqual([
        {
          complainant: {
            id: fixture.customer.id,
            email: customerEmail,
            firstName: 'Maya',
            lastName: 'Fernando',
            role: 'CUSTOMER',
            status: 'ACTIVE',
          },
          complaintCount: 1,
        },
      ]);

      expect(response.body.data.topRespondents).toEqual([
        {
          respondent: {
            id: fixture.secondCustomer.id,
            email: secondCustomerEmail,
            firstName: 'Nila',
            lastName: 'Perera',
            role: 'CUSTOMER',
            status: 'ACTIVE',
          },
          complaintCount: 1,
        },
      ]);

      expect(response.body.data.recentComplaints).toHaveLength(1);
      expect(response.body.data.recentComplaints[0]).toMatchObject({
        id: fixture.openComplaint.id,
        type: 'BOOKING',
        subject: 'Admin complaint report booking issue',
        status: 'OPEN',
        priority: 'URGENT',
        complainant: {
          id: fixture.customer.id,
        },
        respondent: {
          id: fixture.secondCustomer.id,
        },
        assignedAdmin: {
          id: fixture.adminUser.id,
        },
      });
    });
  });

  describe('PATCH /api/v1/admin/users/:userId/status', () => {
    const suspensionReason =
      'The account has been temporarily suspended following a policy review.';

    it('rejects requests without an access token', async () => {
      const customer = await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const response = await request(app).patch(`/api/v1/admin/users/${customer.id}/status`).send({
        status: 'SUSPENDED',
        reason: suspensionReason,
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated non-admin users', async () => {
      const customer = await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const secondCustomer = await createManagedUser({
        email: secondCustomerEmail,
        firstName: 'Nila',
        lastName: 'Perera',
        role: UserRole.CUSTOMER,
      });

      const customerAccessToken = await loginUser(customerEmail, userPassword);

      const response = await updateAdminUserStatusRequest(customerAccessToken, secondCustomer.id, {
        status: 'SUSPENDED',
        reason: suspensionReason,
      });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects an invalid user ID', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await updateAdminUserStatusRequest(adminAccessToken, 'invalid-user-id', {
        status: 'SUSPENDED',
        reason: suspensionReason,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects unsupported account statuses', async () => {
      const customer = await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await updateAdminUserStatusRequest(adminAccessToken, customer.id, {
        status: 'PENDING',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('requires a reason when suspending an account', async () => {
      const customer = await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await updateAdminUserStatusRequest(adminAccessToken, customer.id, {
        status: 'SUSPENDED',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects unexpected request body fields', async () => {
      const customer = await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await request(app)
        .patch(`/api/v1/admin/users/${customer.id}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          status: 'SUSPENDED',
          reason: suspensionReason,
          role: 'ADMIN',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when the user does not exist', async () => {
      const adminAccessToken = await loginTestAdmin();

      const response = await updateAdminUserStatusRequest(
        adminAccessToken,
        'cly0000000000000000000000',
        {
          status: 'SUSPENDED',
          reason: suspensionReason,
        },
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADMIN_USER_NOT_FOUND');
    });

    it('prevents an administrator from changing their own account status', async () => {
      const admin = await prisma.user.findUnique({
        where: {
          email: adminEmail,
        },
        select: {
          id: true,
        },
      });

      expect(admin).not.toBeNull();

      if (!admin) {
        throw new Error('Test administrator must exist');
      }

      const adminAccessToken = await loginTestAdmin();

      const response = await updateAdminUserStatusRequest(adminAccessToken, admin.id, {
        status: 'SUSPENDED',
        reason: suspensionReason,
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADMIN_SELF_STATUS_CHANGE_NOT_ALLOWED');
    });

    it('prevents changing another administrator account status', async () => {
      const secondAdmin = await createManagedUser({
        email: secondAdminEmail,
        firstName: 'Second',
        lastName: 'Admin',
        role: UserRole.ADMIN,
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await updateAdminUserStatusRequest(adminAccessToken, secondAdmin.id, {
        status: 'SUSPENDED',
        reason: suspensionReason,
      });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADMIN_ACCOUNT_STATUS_CHANGE_FORBIDDEN');
    });

    it('rejects a status transition when the requested status is already set', async () => {
      const customer = await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
        status: AccountStatus.ACTIVE,
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await updateAdminUserStatusRequest(adminAccessToken, customer.id, {
        status: 'ACTIVE',
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_STATUS_ALREADY_SET');
    });

    it('allows an admin to suspend an active customer account', async () => {
      const customer = await createManagedUser({
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: UserRole.CUSTOMER,
        status: AccountStatus.ACTIVE,
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await updateAdminUserStatusRequest(adminAccessToken, customer.id, {
        status: 'SUSPENDED',
        reason: suspensionReason,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User account suspended successfully');

      expect(response.body.data).toMatchObject({
        id: customer.id,
        email: customerEmail,
        firstName: 'Maya',
        lastName: 'Fernando',
        role: 'CUSTOMER',
        status: 'SUSPENDED',
        vendorProfile: null,
      });

      expect(response.body.data.passwordHash).toBeUndefined();
      expect(response.body.data.vendor).toBeUndefined();

      const storedCustomer = await prisma.user.findUnique({
        where: {
          id: customer.id,
        },
        select: {
          status: true,
        },
      });

      expect(storedCustomer?.status).toBe(AccountStatus.SUSPENDED);
    });

    it('allows an admin to suspend an active vendor account', async () => {
      const registrationResponse = await registerVendor(vendorPayload);

      expect(registrationResponse.status).toBe(201);

      const vendorUserId = registrationResponse.body.data.user.id as string;
      const adminAccessToken = await loginTestAdmin();

      const response = await updateAdminUserStatusRequest(adminAccessToken, vendorUserId, {
        status: 'SUSPENDED',
        reason: suspensionReason,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: vendorUserId,
        email: vendorEmail,
        role: 'VENDOR',
        status: 'SUSPENDED',

        vendorProfile: {
          businessName: 'Pending Moments Photography',
          verificationStatus: 'DRAFT',
        },
      });

      const storedVendorUser = await prisma.user.findUnique({
        where: {
          id: vendorUserId,
        },
        select: {
          status: true,
        },
      });

      expect(storedVendorUser?.status).toBe(AccountStatus.SUSPENDED);
    });

    it('allows an admin to reactivate a suspended account', async () => {
      const suspendedCustomer = await createManagedUser({
        email: suspendedCustomerEmail,
        firstName: 'Suspended',
        lastName: 'Customer',
        role: UserRole.CUSTOMER,
        status: AccountStatus.SUSPENDED,
      });

      const adminAccessToken = await loginTestAdmin();

      const response = await updateAdminUserStatusRequest(adminAccessToken, suspendedCustomer.id, {
        status: 'ACTIVE',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User account reactivated successfully');

      expect(response.body.data).toMatchObject({
        id: suspendedCustomer.id,
        email: suspendedCustomerEmail,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        vendorProfile: null,
      });

      const storedCustomer = await prisma.user.findUnique({
        where: {
          id: suspendedCustomer.id,
        },
        select: {
          status: true,
        },
      });

      expect(storedCustomer?.status).toBe(AccountStatus.ACTIVE);
    });
  });
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
