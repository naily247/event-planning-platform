import bcrypt from 'bcryptjs';
import {
  AccountStatus,
  BookingStatus,
  EventStatus,
  QuotationRequestStatus,
  QuotationStatus,
  ReviewModerationActionType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';

import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const ADMIN_EMAIL = 'admin-review-moderation@example.com';
const CUSTOMER_EMAIL = 'admin-review-customer@example.com';
const SECOND_CUSTOMER_EMAIL = 'admin-review-second-customer@example.com';
const VENDOR_EMAIL = 'admin-review-vendor@example.com';
const SECOND_VENDOR_EMAIL = 'admin-review-second-vendor@example.com';

const ADMIN_PASSWORD = 'Admin@2026';
const REVIEW_TEST_RUN_ID = `${process.pid}-${Date.now()}`;

const customerPayload = {
  email: CUSTOMER_EMAIL,
  password: 'Customer@2026',
  firstName: 'Maya',
  lastName: 'Fernando',
  phone: {
    country: 'LK',
    number: '0771234567',
  },
};

const secondCustomerPayload = {
  email: SECOND_CUSTOMER_EMAIL,
  password: 'Customer@2026',
  firstName: 'Nila',
  lastName: 'Perera',
  phone: {
    country: 'LK',
    number: '0777654321',
  },
};

const vendorPayload = {
  email: VENDOR_EMAIL,
  password: 'Vendor@2026',
  firstName: 'Ravi',
  lastName: 'Perera',
  businessName: `Admin Review Photography ${REVIEW_TEST_RUN_ID}`,
};

const secondVendorPayload = {
  email: SECOND_VENDOR_EMAIL,
  password: 'Vendor@2026',
  firstName: 'Arun',
  lastName: 'Silva',
  businessName: `Second Admin Review Studio ${REVIEW_TEST_RUN_ID}`,
};

const testEmails = [
  ADMIN_EMAIL,
  CUSTOMER_EMAIL,
  SECOND_CUSTOMER_EMAIL,
  VENDOR_EMAIL,
  SECOND_VENDOR_EMAIL,
];

const clearTestData = async () => {
  await prisma.reviewModerationAction.deleteMany({
    where: {
      OR: [
        {
          review: {
            customer: {
              email: {
                in: testEmails,
              },
            },
          },
        },
        {
          moderator: {
            email: {
              in: testEmails,
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

const createTestAdmin = async () => {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  return prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: 'Review',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
    },
  });
};

const loginTestAdmin = async () => {
  const response = await request(app).post('/api/v1/auth/login').send({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  expect(response.status).toBe(200);

  return response.body.data.accessToken as string;
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

const registerVendor = async (
  payload: typeof vendorPayload | typeof secondVendorPayload = vendorPayload,
) => {
  const response = await request(app)
    .post('/api/v1/auth/register/vendor')
    .send(payload)
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

const createEvent = async (customerId: string, name: string) => {
  return prisma.event.create({
    data: {
      ownerId: customerId,
      name,
      eventType: 'Wedding',
      eventDate: new Date('2034-08-20T09:00:00.000Z'),
      location: 'Colombo',
      guestCount: 200,
      plannedBudget: 2000000,
      theme: 'Classic Garden',
      requirements: 'Photography and event coordination services.',
      status: EventStatus.PLANNING,
    },
  });
};

const createPackage = async (vendorId: string, categoryId: string, title: string) => {
  return prisma.servicePackage.create({
    data: {
      vendorId,
      categoryId,
      title,
      description: 'Professional event photography package.',
      basePrice: 150000,
      isActive: true,
    },
  });
};

type AdminReviewFixtureBase = {
  adminId: string;
  adminAccessToken: string;
  customerAccessToken: string;
  customerUserId: string;
  secondCustomerUserId: string;
  vendorId: string;
  secondVendorId: string;
  customerEventId: string;
  secondCustomerEventId: string;
  vendorPackageId: string;
  secondVendorPackageId: string;
};

const prepareBaseFixture = async (): Promise<AdminReviewFixtureBase> => {
  const admin = await createTestAdmin();
  const adminAccessToken = await loginTestAdmin();

  const customer = await registerCustomer();
  const secondCustomer = await registerCustomer(secondCustomerPayload);

  const vendor = await registerVendor();
  const secondVendor = await registerVendor(secondVendorPayload);

  const category = await getPhotographyCategory();

  const vendorPackage = await createPackage(
    vendor.vendorId,
    category.id,
    'Admin Review Wedding Photography',
  );

  const secondVendorPackage = await createPackage(
    secondVendor.vendorId,
    category.id,
    'Second Admin Review Photography',
  );

  const customerEvent = await createEvent(customer.userId, 'Admin Review Customer Wedding');

  const secondCustomerEvent = await createEvent(
    secondCustomer.userId,
    'Second Admin Review Customer Wedding',
  );

  return {
    adminId: admin.id,
    adminAccessToken,
    customerAccessToken: customer.accessToken,
    customerUserId: customer.userId,
    secondCustomerUserId: secondCustomer.userId,
    vendorId: vendor.vendorId,
    secondVendorId: secondVendor.vendorId,
    customerEventId: customerEvent.id,
    secondCustomerEventId: secondCustomerEvent.id,
    vendorPackageId: vendorPackage.id,
    secondVendorPackageId: secondVendorPackage.id,
  };
};

type CreateReviewFixtureInput = {
  customerId: string;
  eventId: string;
  vendorId: string;
  packageId: string;
  suffix: string;
  overallRating?: number;
  serviceRating?: number | null;
  communicationRating?: number | null;
  comment?: string | null;
  createdAt?: Date;
  isHidden?: boolean;
  moderationReason?: string | null;
  moderatedAt?: Date | null;
  moderatedById?: string | null;
};

const createReviewFixture = async ({
  customerId,
  eventId,
  vendorId,
  packageId,
  suffix,
  overallRating = 5,
  serviceRating = 5,
  communicationRating = 5,
  comment = 'The vendor provided a professional and reliable service.',
  createdAt,
  isHidden = false,
  moderationReason = null,
  moderatedAt = null,
  moderatedById = null,
}: CreateReviewFixtureInput) => {
  const quotationRequest = await prisma.quotationRequest.create({
    data: {
      eventId,
      vendorId,
      packageId,
      requirements: `Admin moderation fixture ${suffix}`,
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
      inclusions: `Photography coverage ${suffix}`,
      exclusions: 'Printed albums are not included.',
      terms: 'A deposit is required.',
      expiresAt: new Date('2034-07-20T09:00:00.000Z'),
    },
  });

  const booking = await prisma.booking.create({
    data: {
      eventId,
      vendorId,
      acceptedQuotationId: quotation.id,
      agreedCost: 175000,
      serviceStart: new Date('2034-08-20T08:00:00.000Z'),
      serviceEnd: new Date('2034-08-20T18:00:00.000Z'),
      status: BookingStatus.COMPLETED,
      vendorCompletedAt: new Date('2034-08-20T18:30:00.000Z'),
    },
  });

  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      customerId,
      vendorId,
      packageId,
      overallRating,
      serviceRating,
      communicationRating,
      comment,
      isHidden,
      moderationReason,
      moderatedAt,
      moderatedById,
      ...(createdAt && {
        createdAt,
      }),
    },
  });

  return {
    booking,
    review,
  };
};

const getAdminReviewsRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/admin/reviews${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getAdminReviewRequest = (accessToken: string, reviewId: string) => {
  return request(app)
    .get(`/api/v1/admin/reviews/${reviewId}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const moderateAdminReviewRequest = (
  accessToken: string,
  reviewId: string,
  body: Record<string, unknown>,
) => {
  return request(app)
    .patch(`/api/v1/admin/reviews/${reviewId}/moderation`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

beforeEach(async () => {
  await clearTestData();
});

afterEach(async () => {
  await clearTestData();
});

afterAll(async () => {
  await clearTestData();
  await prisma.$disconnect();
});

describe('Administrator review moderation API', () => {
  describe('authorization', () => {
    it('rejects unauthenticated requests', async () => {
      const response = await request(app).get('/api/v1/admin/reviews');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated customers', async () => {
      const fixture = await prepareBaseFixture();

      const response = await getAdminReviewsRequest(fixture.customerAccessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/admin/reviews', () => {
    it('returns reviews with customer, vendor, package and moderation context', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'list-context',
        overallRating: 4,
        serviceRating: 5,
        communicationRating: 4,
        comment: 'Professional service with good communication.',
      });

      const response = await getAdminReviewsRequest(fixture.adminAccessToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        id: created.review.id,
        bookingId: created.booking.id,
        customerId: fixture.customerUserId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        overallRating: 4,
        serviceRating: 5,
        communicationRating: 4,
        comment: 'Professional service with good communication.',
        isHidden: false,
        moderationReason: null,
        moderatedAt: null,
        moderatedBy: null,
        customer: {
          email: CUSTOMER_EMAIL,
          firstName: 'Maya',
          lastName: 'Fernando',
        },
        vendor: {
          id: fixture.vendorId,
          businessName: vendorPayload.businessName,
        },
        package: {
          id: fixture.vendorPackageId,
          title: 'Admin Review Wedding Photography',
        },
      });

      expect(response.body.meta.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('filters reviews by vendor, customer, rating and visibility', async () => {
      const fixture = await prepareBaseFixture();

      const expected = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'matching-hidden-review',
        overallRating: 5,
        isHidden: true,
        moderationReason: 'Hidden because the review requires administrator moderation.',
        moderatedAt: new Date('2034-09-01T10:00:00.000Z'),
        moderatedById: fixture.adminId,
      });

      await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'wrong-rating',
        overallRating: 3,
      });

      await createReviewFixture({
        customerId: fixture.secondCustomerUserId,
        eventId: fixture.secondCustomerEventId,
        vendorId: fixture.secondVendorId,
        packageId: fixture.secondVendorPackageId,
        suffix: 'wrong-customer-vendor',
        overallRating: 5,
        isHidden: true,
        moderationReason: 'Hidden because the review requires administrator moderation.',
        moderatedAt: new Date('2034-09-02T10:00:00.000Z'),
        moderatedById: fixture.adminId,
      });

      const response = await getAdminReviewsRequest(
        fixture.adminAccessToken,
        `?vendorId=${fixture.vendorId}&customerId=${fixture.customerUserId}&overallRating=5&visibility=hidden`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(expected.review.id);
      expect(response.body.data[0].isHidden).toBe(true);
    });

    it('supports pagination', async () => {
      const fixture = await prepareBaseFixture();

      await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'pagination-one',
        createdAt: new Date('2034-01-01T10:00:00.000Z'),
      });

      const second = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'pagination-two',
        createdAt: new Date('2034-01-02T10:00:00.000Z'),
      });

      await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'pagination-three',
        createdAt: new Date('2034-01-03T10:00:00.000Z'),
      });

      const response = await getAdminReviewsRequest(
        fixture.adminAccessToken,
        '?page=2&limit=1&sort=newest',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(second.review.id);

      expect(response.body.meta.pagination).toEqual({
        page: 2,
        limit: 1,
        total: 3,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('supports rating and moderation sorting options', async () => {
      const fixture = await prepareBaseFixture();

      const lowRated = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'low-rated',
        overallRating: 1,
        createdAt: new Date('2034-01-03T10:00:00.000Z'),
      });

      const highRated = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'high-rated',
        overallRating: 5,
        createdAt: new Date('2034-01-01T10:00:00.000Z'),
      });

      const recentlyModerated = await createReviewFixture({
        customerId: fixture.secondCustomerUserId,
        eventId: fixture.secondCustomerEventId,
        vendorId: fixture.secondVendorId,
        packageId: fixture.secondVendorPackageId,
        suffix: 'recently-moderated',
        overallRating: 3,
        isHidden: true,
        moderationReason: 'Recently moderated review for sorting verification.',
        moderatedAt: new Date('2034-09-10T10:00:00.000Z'),
        moderatedById: fixture.adminId,
      });

      const highestResponse = await getAdminReviewsRequest(
        fixture.adminAccessToken,
        '?sort=rating_highest',
      );

      expect(highestResponse.body.data[0].id).toBe(highRated.review.id);

      const lowestResponse = await getAdminReviewsRequest(
        fixture.adminAccessToken,
        '?sort=rating_lowest',
      );

      expect(lowestResponse.body.data[0].id).toBe(lowRated.review.id);

      const moderatedResponse = await getAdminReviewsRequest(
        fixture.adminAccessToken,
        '?sort=recently_moderated',
      );

      expect(moderatedResponse.body.data[0].id).toBe(recentlyModerated.review.id);
    });

    it('rejects invalid list query values', async () => {
      const fixture = await prepareBaseFixture();

      const response = await getAdminReviewsRequest(
        fixture.adminAccessToken,
        '?page=0&limit=101&overallRating=6&visibility=invalid&sort=invalid',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/admin/reviews/:reviewId', () => {
    it('returns review detail with booking context and moderation history', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'detail-history',
      });

      const hideReason = 'The review contains content that violates the platform review policy.';

      await moderateAdminReviewRequest(fixture.adminAccessToken, created.review.id, {
        action: 'HIDE',
        reason: hideReason,
      }).expect(200);

      const response = await getAdminReviewRequest(fixture.adminAccessToken, created.review.id);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: created.review.id,
        booking: {
          id: created.booking.id,
          status: 'COMPLETED',
        },
        isHidden: true,
        moderationReason: hideReason,
        moderatedBy: {
          id: fixture.adminId,
          email: ADMIN_EMAIL,
          firstName: 'Review',
          lastName: 'Administrator',
        },
      });

      expect(response.body.data.moderatedAt).toEqual(expect.any(String));
      expect(response.body.data.moderationActions).toHaveLength(1);

      expect(response.body.data.moderationActions[0]).toMatchObject({
        action: 'HIDDEN',
        reason: hideReason,
        moderator: {
          id: fixture.adminId,
          email: ADMIN_EMAIL,
        },
      });

      expect(response.body.data.moderationActions[0].createdAt).toEqual(expect.any(String));
    });

    it('returns 404 when the review does not exist', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'deleted-review',
      });

      await prisma.review.delete({
        where: {
          id: created.review.id,
        },
      });

      const response = await getAdminReviewRequest(fixture.adminAccessToken, created.review.id);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADMIN_REVIEW_NOT_FOUND');
    });

    it('rejects an invalid review ID', async () => {
      const fixture = await prepareBaseFixture();

      const response = await getAdminReviewRequest(fixture.adminAccessToken, 'invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/admin/reviews/:reviewId/moderation', () => {
    it('allows an admin to hide a visible review and creates an audit action', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'hide-review',
      });

      const reason =
        'The review contains inappropriate content requiring administrator moderation.';

      const response = await moderateAdminReviewRequest(
        fixture.adminAccessToken,
        created.review.id,
        {
          action: 'HIDE',
          reason: `   ${reason}   `,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Review hidden successfully');

      expect(response.body.data).toMatchObject({
        id: created.review.id,
        isHidden: true,
        moderationReason: reason,
        moderatedBy: {
          id: fixture.adminId,
          email: ADMIN_EMAIL,
        },
      });

      expect(response.body.data.moderatedAt).toEqual(expect.any(String));
      expect(response.body.data.moderationActions).toHaveLength(1);

      const storedReview = await prisma.review.findUnique({
        where: {
          id: created.review.id,
        },
        select: {
          isHidden: true,
          moderationReason: true,
          moderatedAt: true,
          moderatedById: true,
        },
      });

      expect(storedReview).toMatchObject({
        isHidden: true,
        moderationReason: reason,
        moderatedById: fixture.adminId,
      });

      expect(storedReview?.moderatedAt).toBeInstanceOf(Date);

      const auditAction = await prisma.reviewModerationAction.findFirst({
        where: {
          reviewId: created.review.id,
        },
      });

      expect(auditAction).toMatchObject({
        reviewId: created.review.id,
        moderatorId: fixture.adminId,
        action: ReviewModerationActionType.HIDDEN,
        reason,
      });

      expect(auditAction?.createdAt).toBeInstanceOf(Date);
    });

    it('rejects hiding a review that is already hidden', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'duplicate-hide',
      });

      const reason =
        'The review contains inappropriate content requiring administrator moderation.';

      await moderateAdminReviewRequest(fixture.adminAccessToken, created.review.id, {
        action: 'HIDE',
        reason,
      }).expect(200);

      const response = await moderateAdminReviewRequest(
        fixture.adminAccessToken,
        created.review.id,
        {
          action: 'HIDE',
          reason: 'The review remains unsuitable for public display.',
        },
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REVIEW_ALREADY_HIDDEN');

      const actionCount = await prisma.reviewModerationAction.count({
        where: {
          reviewId: created.review.id,
        },
      });

      expect(actionCount).toBe(1);
    });

    it('rejects restoring a review that is already visible', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'already-visible',
      });

      const response = await moderateAdminReviewRequest(
        fixture.adminAccessToken,
        created.review.id,
        {
          action: 'RESTORE',
          reason: 'The review has been checked and is suitable for public display.',
        },
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REVIEW_ALREADY_VISIBLE');

      const actionCount = await prisma.reviewModerationAction.count({
        where: {
          reviewId: created.review.id,
        },
      });

      expect(actionCount).toBe(0);
    });

    it('restores a hidden review while preserving immutable moderation history', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'restore-review',
      });

      const hideReason = 'The review requires administrator investigation before public display.';

      const restoreReason = 'The review was investigated and can now be displayed publicly.';

      await moderateAdminReviewRequest(fixture.adminAccessToken, created.review.id, {
        action: 'HIDE',
        reason: hideReason,
      }).expect(200);

      const response = await moderateAdminReviewRequest(
        fixture.adminAccessToken,
        created.review.id,
        {
          action: 'RESTORE',
          reason: restoreReason,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Review restored successfully');

      expect(response.body.data).toMatchObject({
        id: created.review.id,
        isHidden: false,
        moderationReason: restoreReason,
        moderatedBy: {
          id: fixture.adminId,
          email: ADMIN_EMAIL,
        },
      });

      expect(response.body.data.moderationActions).toHaveLength(2);

      expect(response.body.data.moderationActions[0]).toMatchObject({
        action: 'RESTORED',
        reason: restoreReason,
      });

      expect(response.body.data.moderationActions[1]).toMatchObject({
        action: 'HIDDEN',
        reason: hideReason,
      });

      const storedActions = await prisma.reviewModerationAction.findMany({
        where: {
          reviewId: created.review.id,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      expect(storedActions).toHaveLength(2);

      expect(storedActions[0]).toMatchObject({
        action: ReviewModerationActionType.HIDDEN,
        reason: hideReason,
      });

      expect(storedActions[1]).toMatchObject({
        action: ReviewModerationActionType.RESTORED,
        reason: restoreReason,
      });
    });

    it('rejects invalid moderation bodies', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'invalid-body',
      });

      const response = await moderateAdminReviewRequest(
        fixture.adminAccessToken,
        created.review.id,
        {
          action: 'DELETE',
          reason: 'Too short',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when moderating a review that does not exist', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'deleted-before-moderation',
      });

      await prisma.review.delete({
        where: {
          id: created.review.id,
        },
      });

      const response = await moderateAdminReviewRequest(
        fixture.adminAccessToken,
        created.review.id,
        {
          action: 'HIDE',
          reason: 'The missing review cannot be moderated by an administrator.',
        },
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADMIN_REVIEW_NOT_FOUND');
    });
  });
});
