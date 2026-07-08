import bcrypt from 'bcryptjs';
import { AccountStatus, UserRole } from '@prisma/client';
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
        in: testEmails,
      },
    },
  });

  await createTestAdmin();
});

afterAll(async () => {
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
