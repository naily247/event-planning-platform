import {
  BookingStatus,
  EventStatus,
  QuotationRequestStatus,
  QuotationStatus,
} from '@prisma/client';
import request from 'supertest';

import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const CUSTOMER_EMAIL = 'reviews-customer@example.com';
const SECOND_CUSTOMER_EMAIL = 'reviews-second-customer@example.com';
const VENDOR_EMAIL = 'reviews-vendor@example.com';
const SECOND_VENDOR_EMAIL = 'reviews-second-vendor@example.com';

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
  businessName: 'Reviews Photography Studio',
};

const secondVendorPayload = {
  email: SECOND_VENDOR_EMAIL,
  password: 'Vendor@2026',
  firstName: 'Arun',
  lastName: 'Silva',
  businessName: 'Second Reviews Studio',
};

const testEmails = [CUSTOMER_EMAIL, SECOND_CUSTOMER_EMAIL, VENDOR_EMAIL, SECOND_VENDOR_EMAIL];

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
      eventDate: new Date('2032-08-20T09:00:00.000Z'),
      location: 'Colombo',
      guestCount: 200,
      plannedBudget: 2000000,
      theme: 'Classic Garden',
      requirements: 'Photography, catering, decorations, and entertainment.',
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
      description: 'Professional event photography with edited digital photographs.',
      basePrice: 150000,
      isActive: true,
    },
  });
};

type ReviewFixtureBase = {
  customerAccessToken: string;
  customerUserId: string;
  secondCustomerAccessToken: string;
  secondCustomerUserId: string;
  vendorAccessToken: string;
  vendorId: string;
  secondVendorId: string;
  customerEventId: string;
  secondCustomerEventId: string;
  vendorPackageId: string;
  secondVendorPackageId: string;
};

const prepareBaseFixture = async (): Promise<ReviewFixtureBase> => {
  const customer = await registerCustomer();
  const secondCustomer = await registerCustomer(secondCustomerPayload);

  const vendor = await registerVendor();
  const secondVendor = await registerVendor(secondVendorPayload);

  const category = await getPhotographyCategory();

  const vendorPackage = await createPackage(
    vendor.vendorId,
    category.id,
    'Reviews Wedding Photography Package',
  );

  const secondVendorPackage = await createPackage(
    secondVendor.vendorId,
    category.id,
    'Second Reviews Photography Package',
  );

  const customerEvent = await createEvent(customer.userId, 'Customer Review Wedding');

  const secondCustomerEvent = await createEvent(
    secondCustomer.userId,
    'Second Customer Review Wedding',
  );

  return {
    customerAccessToken: customer.accessToken,
    customerUserId: customer.userId,
    secondCustomerAccessToken: secondCustomer.accessToken,
    secondCustomerUserId: secondCustomer.userId,
    vendorAccessToken: vendor.accessToken,
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
}: CreateReviewFixtureInput) => {
  const quotationRequest = await prisma.quotationRequest.create({
    data: {
      eventId,
      vendorId,
      packageId,
      requirements: `Review fixture requirements ${suffix}`,
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
      expiresAt: new Date('2032-07-20T09:00:00.000Z'),
    },
  });

  const booking = await prisma.booking.create({
    data: {
      eventId,
      vendorId,
      acceptedQuotationId: quotation.id,
      agreedCost: 175000,
      serviceStart: new Date('2032-08-20T08:00:00.000Z'),
      serviceEnd: new Date('2032-08-20T18:00:00.000Z'),
      status: BookingStatus.COMPLETED,
      vendorCompletedAt: new Date('2032-08-20T18:30:00.000Z'),
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

const getCustomerReviewsRequest = (accessToken: string, query = '') => {
  return request(app)
    .get(`/api/v1/reviews/me${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const getCustomerReviewRequest = (accessToken: string, reviewId: string) => {
  return request(app)
    .get(`/api/v1/reviews/${reviewId}`)
    .set('Authorization', `Bearer ${accessToken}`);
};

const updateCustomerReviewRequest = (
  accessToken: string,
  reviewId: string,
  body: Record<string, unknown>,
) => {
  return request(app)
    .patch(`/api/v1/reviews/${reviewId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send(body);
};

const deleteCustomerReviewRequest = (accessToken: string, reviewId: string) => {
  return request(app)
    .delete(`/api/v1/reviews/${reviewId}`)
    .set('Authorization', `Bearer ${accessToken}`);
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

describe('Customer review management API', () => {
  describe('authorization', () => {
    it('rejects unauthenticated requests', async () => {
      const response = await request(app).get('/api/v1/reviews/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects authenticated vendors', async () => {
      const fixture = await prepareBaseFixture();

      const response = await getCustomerReviewsRequest(fixture.vendorAccessToken);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/reviews/me', () => {
    it('lists only reviews belonging to the authenticated customer', async () => {
      const fixture = await prepareBaseFixture();

      const customerReview = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'customer-review',
      });

      await createReviewFixture({
        customerId: fixture.secondCustomerUserId,
        eventId: fixture.secondCustomerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'second-customer-review',
      });

      const response = await getCustomerReviewsRequest(fixture.customerAccessToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        id: customerReview.review.id,
        customerId: fixture.customerUserId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        overallRating: 5,
        vendor: {
          id: fixture.vendorId,
          businessName: 'Reviews Photography Studio',
        },
        package: {
          id: fixture.vendorPackageId,
          title: 'Reviews Wedding Photography Package',
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

    it('supports pagination', async () => {
      const fixture = await prepareBaseFixture();

      await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'pagination-one',
        createdAt: new Date('2032-01-01T10:00:00.000Z'),
      });

      await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'pagination-two',
        createdAt: new Date('2032-01-02T10:00:00.000Z'),
      });

      await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'pagination-three',
        createdAt: new Date('2032-01-03T10:00:00.000Z'),
      });

      const response = await getCustomerReviewsRequest(
        fixture.customerAccessToken,
        '?page=2&limit=2',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.meta.pagination).toEqual({
        page: 2,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('filters reviews by vendor and overall rating', async () => {
      const fixture = await prepareBaseFixture();

      const expectedReview = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'matching-review',
        overallRating: 5,
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
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.secondVendorId,
        packageId: fixture.secondVendorPackageId,
        suffix: 'wrong-vendor',
        overallRating: 5,
      });

      const response = await getCustomerReviewsRequest(
        fixture.customerAccessToken,
        `?vendorId=${fixture.vendorId}&overallRating=5`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(expectedReview.review.id);
    });

    it('supports every review sorting option', async () => {
      const fixture = await prepareBaseFixture();

      const oldest = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'oldest',
        overallRating: 2,
        createdAt: new Date('2032-01-01T10:00:00.000Z'),
      });

      const middle = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'middle',
        overallRating: 5,
        createdAt: new Date('2032-01-02T10:00:00.000Z'),
      });

      const newest = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'newest',
        overallRating: 3,
        createdAt: new Date('2032-01-03T10:00:00.000Z'),
      });

      const newestResponse = await getCustomerReviewsRequest(
        fixture.customerAccessToken,
        '?sort=newest',
      );

      expect(newestResponse.body.data.map((review: { id: string }) => review.id)).toEqual([
        newest.review.id,
        middle.review.id,
        oldest.review.id,
      ]);

      const oldestResponse = await getCustomerReviewsRequest(
        fixture.customerAccessToken,
        '?sort=oldest',
      );

      expect(oldestResponse.body.data.map((review: { id: string }) => review.id)).toEqual([
        oldest.review.id,
        middle.review.id,
        newest.review.id,
      ]);

      const highestResponse = await getCustomerReviewsRequest(
        fixture.customerAccessToken,
        '?sort=rating_highest',
      );

      expect(highestResponse.body.data.map((review: { id: string }) => review.id)).toEqual([
        middle.review.id,
        newest.review.id,
        oldest.review.id,
      ]);

      const lowestResponse = await getCustomerReviewsRequest(
        fixture.customerAccessToken,
        '?sort=rating_lowest',
      );

      expect(lowestResponse.body.data.map((review: { id: string }) => review.id)).toEqual([
        oldest.review.id,
        newest.review.id,
        middle.review.id,
      ]);
    });

    it('rejects invalid list query values', async () => {
      const fixture = await prepareBaseFixture();

      const response = await getCustomerReviewsRequest(
        fixture.customerAccessToken,
        '?page=0&limit=101&overallRating=6&sort=invalid',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/reviews/:reviewId', () => {
    it('returns an owned review', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'review-detail',
      });

      const response = await getCustomerReviewRequest(
        fixture.customerAccessToken,
        created.review.id,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: created.review.id,
        bookingId: created.booking.id,
        customerId: fixture.customerUserId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
      });
    });

    it('hides another customer review behind a 404 response', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'private-review',
      });

      const response = await getCustomerReviewRequest(
        fixture.secondCustomerAccessToken,
        created.review.id,
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CUSTOMER_REVIEW_NOT_FOUND');
    });

    it('rejects an invalid review ID', async () => {
      const fixture = await prepareBaseFixture();

      const response = await getCustomerReviewRequest(fixture.customerAccessToken, 'invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/reviews/:reviewId', () => {
    it('updates the owned review and trims its comment', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'update-review',
        overallRating: 3,
      });

      const comment = 'The vendor improved communication and delivered excellent results.';

      const response = await updateCustomerReviewRequest(
        fixture.customerAccessToken,
        created.review.id,
        {
          overallRating: 5,
          serviceRating: 4,
          communicationRating: 5,
          comment: `   ${comment}   `,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: created.review.id,
        overallRating: 5,
        serviceRating: 4,
        communicationRating: 5,
        comment,
      });

      const savedReview = await prisma.review.findUnique({
        where: {
          id: created.review.id,
        },
      });

      expect(savedReview?.overallRating).toBe(5);
      expect(savedReview?.comment).toBe(comment);
    });

    it('allows nullable review fields to be cleared', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'clear-review-fields',
      });

      const response = await updateCustomerReviewRequest(
        fixture.customerAccessToken,
        created.review.id,
        {
          serviceRating: null,
          communicationRating: null,
          comment: null,
        },
      );

      expect(response.status).toBe(200);

      expect(response.body.data).toMatchObject({
        serviceRating: null,
        communicationRating: null,
        comment: null,
      });
    });

    it('rejects an empty update body', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'empty-update',
      });

      const response = await updateCustomerReviewRequest(
        fixture.customerAccessToken,
        created.review.id,
        {},
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid ratings and comments', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'invalid-update',
      });

      const response = await updateCustomerReviewRequest(
        fixture.customerAccessToken,
        created.review.id,
        {
          overallRating: 6,
          serviceRating: 0,
          communicationRating: 4.5,
          comment: 'Ok',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('does not allow overall rating to become null', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'null-overall-rating',
      });

      const response = await updateCustomerReviewRequest(
        fixture.customerAccessToken,
        created.review.id,
        {
          overallRating: null,
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('does not allow another customer to update the review', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'unauthorized-update',
      });

      const response = await updateCustomerReviewRequest(
        fixture.secondCustomerAccessToken,
        created.review.id,
        {
          overallRating: 1,
        },
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('CUSTOMER_REVIEW_NOT_FOUND');

      const savedReview = await prisma.review.findUnique({
        where: {
          id: created.review.id,
        },
      });

      expect(savedReview?.overallRating).toBe(5);
    });
  });

  describe('DELETE /api/v1/reviews/:reviewId', () => {
    it('permanently deletes an owned review', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'delete-review',
      });

      const response = await deleteCustomerReviewRequest(
        fixture.customerAccessToken,
        created.review.id,
      );

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});

      const savedReview = await prisma.review.findUnique({
        where: {
          id: created.review.id,
        },
      });

      expect(savedReview).toBeNull();

      const listResponse = await getCustomerReviewsRequest(fixture.customerAccessToken);

      expect(listResponse.body.data).toHaveLength(0);
    });

    it('does not allow another customer to delete the review', async () => {
      const fixture = await prepareBaseFixture();

      const created = await createReviewFixture({
        customerId: fixture.customerUserId,
        eventId: fixture.customerEventId,
        vendorId: fixture.vendorId,
        packageId: fixture.vendorPackageId,
        suffix: 'unauthorized-delete',
      });

      const response = await deleteCustomerReviewRequest(
        fixture.secondCustomerAccessToken,
        created.review.id,
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('CUSTOMER_REVIEW_NOT_FOUND');

      const savedReview = await prisma.review.findUnique({
        where: {
          id: created.review.id,
        },
      });

      expect(savedReview).not.toBeNull();
    });
  });
});
