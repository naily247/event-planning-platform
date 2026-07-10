import request from 'supertest';
import {
  AccountStatus,
  Prisma,
  UserRole,
  VendorVerificationStatus,
  BookingStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const testEmails = [
  'discovery-approved-one@example.com',
  'discovery-approved-two@example.com',
  'discovery-pending@example.com',
  'discovery-draft@example.com',
  'discovery-review-customer@example.com',
] as const;

const passwordHashPromise = bcrypt.hash('Vendor@2026', 12);

const clearDiscoveryVendors = async () => {
  const emails = [...testEmails];

  await prisma.vendorPortfolioItem.deleteMany({
    where: {
      vendor: {
        user: {
          email: {
            in: emails,
          },
        },
      },
    },
  });
  await prisma.review.deleteMany({
    where: {
      OR: [
        {
          customer: {
            email: {
              in: emails,
            },
          },
        },
        {
          vendor: {
            user: {
              email: {
                in: emails,
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
                in: emails,
              },
            },
          },
        },
        {
          vendor: {
            user: {
              email: {
                in: emails,
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
                  in: emails,
                },
              },
            },
          },
          {
            vendor: {
              user: {
                email: {
                  in: emails,
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
                in: emails,
              },
            },
          },
        },
        {
          vendor: {
            user: {
              email: {
                in: emails,
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
          in: emails,
        },
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: emails,
      },
    },
  });
};

const createDiscoveryVendor = async ({
  email,
  businessName,
  slug,
  description,
  baseLocation,
  serviceAreas,
  verificationStatus,
  categorySlug,
  packages = [],
}: {
  email: string;
  businessName: string;
  slug: string;
  description: string;
  baseLocation: string;
  serviceAreas: string[];
  verificationStatus: VendorVerificationStatus;
  categorySlug: string;
  packages?: Array<{
    title: string;
    description: string;
    basePrice: string;
    isActive: boolean;
  }>;
}) => {
  const category = await prisma.serviceCategory.findUnique({
    where: {
      slug: categorySlug,
    },
  });

  if (!category) {
    throw new Error(`Seeded category "${categorySlug}" was not found`);
  }

  const passwordHash = await passwordHashPromise;

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Discovery',
      lastName: 'Vendor',
      role: UserRole.VENDOR,
      status: AccountStatus.ACTIVE,
      vendor: {
        create: {
          businessName,
          slug,
          description,
          contactPhone: '+94771234567',
          website: `https://${slug}.example.com`,
          baseLocation,
          serviceAreas,
          verificationStatus,
          submittedAt: verificationStatus === VendorVerificationStatus.DRAFT ? null : new Date(),
          reviewedAt: verificationStatus === VendorVerificationStatus.APPROVED ? new Date() : null,
          categories: {
            create: {
              categoryId: category.id,
            },
          },
          packages: {
            create: packages.map((servicePackage) => ({
              categoryId: category.id,
              title: servicePackage.title,
              description: servicePackage.description,
              basePrice: new Prisma.Decimal(servicePackage.basePrice),
              isActive: servicePackage.isActive,
            })),
          },
        },
      },
    },
    include: {
      vendor: true,
    },
  });
};

const createPublicVendorPortfolioItem = async ({
  vendorSlug,
  title,
  description,
  displayOrder,
  isFeatured = false,
}: {
  vendorSlug: string;
  title: string;
  description: string;
  displayOrder: number;
  isFeatured?: boolean;
}) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      slug: vendorSlug,
    },
    select: {
      id: true,
    },
  });

  if (!vendor) {
    throw new Error(`Vendor "${vendorSlug}" was not found`);
  }

  return prisma.vendorPortfolioItem.create({
    data: {
      vendorId: vendor.id,
      title,
      description,
      imageUrl: `https://res.cloudinary.com/demo/image/upload/${vendorSlug}-${displayOrder}.jpg`,
      imagePublicId: `event-platform/vendors/${vendor.id}/portfolio/${vendorSlug}-${displayOrder}`,
      originalName: `${vendorSlug}-${displayOrder}.jpg`,
      mimeType: 'image/jpeg',
      fileSize: 2048,
      displayOrder,
      isFeatured,
    },
  });
};

const createPublicVendorReview = async ({
  vendorSlug,
  overallRating,
  serviceRating,
  communicationRating,
  comment,
  createdAt,
  isHidden = false,
}: {
  vendorSlug: string;
  overallRating: number;
  serviceRating?: number;
  communicationRating?: number;
  comment?: string;
  createdAt: Date;
  isHidden?: boolean;
}) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      slug: vendorSlug,
    },
    include: {
      packages: {
        where: {
          isActive: true,
        },
        take: 1,
      },
    },
  });

  if (!vendor) {
    throw new Error(`Vendor "${vendorSlug}" was not found`);
  }

  const servicePackage = vendor.packages[0];

  if (!servicePackage) {
    throw new Error(`Vendor "${vendorSlug}" has no active package`);
  }

  const passwordHash = await passwordHashPromise;

  const customer = await prisma.user.upsert({
    where: {
      email: testEmails[4],
    },
    update: {},
    create: {
      email: testEmails[4],
      passwordHash,
      firstName: 'Maya',
      lastName: 'Fernando',
      role: UserRole.CUSTOMER,
      status: AccountStatus.ACTIVE,
      customer: {
        create: {
          phone: '+94771234567',
        },
      },
    },
  });

  const event = await prisma.event.create({
    data: {
      ownerId: customer.id,
      name: `Reviewed Event ${createdAt.getTime()}`,
      eventType: 'Wedding',
      eventDate: new Date('2027-01-15T09:00:00.000Z'),
      location: 'Colombo',
    },
  });

  const quotationRequest = await prisma.quotationRequest.create({
    data: {
      eventId: event.id,
      vendorId: vendor.id,
      packageId: servicePackage.id,
      requirements: 'Provide professional event services for the customer event.',
    },
  });

  const quotation = await prisma.quotation.create({
    data: {
      quotationRequestId: quotationRequest.id,
      version: 1,
      proposedPrice: new Prisma.Decimal('100000.00'),
      inclusions: 'Complete event service package.',
    },
  });

  const booking = await prisma.booking.create({
    data: {
      eventId: event.id,
      vendorId: vendor.id,
      acceptedQuotationId: quotation.id,
      agreedCost: new Prisma.Decimal('100000.00'),
      serviceStart: new Date('2027-01-15T09:00:00.000Z'),
      serviceEnd: new Date('2027-01-15T18:00:00.000Z'),
      status: BookingStatus.COMPLETED,
      vendorCompletedAt: new Date('2027-01-15T18:30:00.000Z'),
    },
  });

  return prisma.review.create({
    data: {
      bookingId: booking.id,
      customerId: customer.id,
      vendorId: vendor.id,
      packageId: servicePackage.id,
      overallRating,
      serviceRating,
      communicationRating,
      comment,
      isHidden,
      createdAt,
    },
  });
};

beforeEach(async () => {
  await clearDiscoveryVendors();

  await createDiscoveryVendor({
    email: testEmails[0],
    businessName: 'Golden Lens Photography',
    slug: 'golden-lens-photography',
    description: 'Wedding and event photography services across Colombo and Kandy.',
    baseLocation: 'Colombo',
    serviceAreas: ['Colombo', 'Kandy'],
    verificationStatus: VendorVerificationStatus.APPROVED,
    categorySlug: 'photography',
    packages: [
      {
        title: 'Classic Wedding Photography',
        description: 'Complete wedding photography coverage with edited digital photographs.',
        basePrice: '85000.00',
        isActive: true,
      },
      {
        title: 'Private Draft Photography Package',
        description: 'This inactive package must not appear on the public vendor page.',
        basePrice: '45000.00',
        isActive: false,
      },
    ],
  });

  await createDiscoveryVendor({
    email: testEmails[1],
    businessName: 'Royal Feast Catering',
    slug: 'royal-feast-catering',
    description: 'Premium catering services for weddings, parties, and corporate events.',
    baseLocation: 'Kandy',
    serviceAreas: ['Kandy', 'Matale'],
    verificationStatus: VendorVerificationStatus.APPROVED,
    categorySlug: 'catering',
    packages: [
      {
        title: 'Premium Wedding Buffet',
        description:
          'Premium wedding buffet service with a customizable menu and professional staff.',
        basePrice: '150000.00',
        isActive: true,
      },
    ],
  });

  await createDiscoveryVendor({
    email: testEmails[2],
    businessName: 'Pending Event Studio',
    slug: 'pending-event-studio',
    description: 'A pending vendor profile that must never appear publicly.',
    baseLocation: 'Colombo',
    serviceAreas: ['Colombo'],
    verificationStatus: VendorVerificationStatus.PENDING,
    categorySlug: 'photography',
    packages: [
      {
        title: 'Pending Vendor Photography Package',
        description: 'This package belongs to a pending vendor and must remain hidden.',
        basePrice: '65000.00',
        isActive: true,
      },
    ],
  });

  await createDiscoveryVendor({
    email: testEmails[3],
    businessName: 'Draft Event Studio',
    slug: 'draft-event-studio',
    description: 'A draft vendor profile that must never appear publicly.',
    baseLocation: 'Galle',
    serviceAreas: ['Galle'],
    verificationStatus: VendorVerificationStatus.DRAFT,
    categorySlug: 'catering',
  });
});

afterAll(async () => {
  await clearDiscoveryVendors();
  await prisma.$disconnect();
});

describe('Public vendor discovery API', () => {
  describe('GET /api/v1/vendors', () => {
    it('returns only approved vendors', async () => {
      const response = await request(app).get('/api/v1/vendors');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      const slugs = response.body.data.map((vendor: { slug: string }) => vendor.slug);

      expect(slugs).toEqual(
        expect.arrayContaining(['golden-lens-photography', 'royal-feast-catering']),
      );

      expect(slugs).not.toContain('pending-event-studio');
      expect(slugs).not.toContain('draft-event-studio');

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 12,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('does not include packages in vendor list responses', async () => {
      const response = await request(app).get('/api/v1/vendors');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);

      for (const vendor of response.body.data) {
        expect(vendor).not.toHaveProperty('packages');
      }
    });

    it('includes average rating and review count in vendor list responses', async () => {
      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 5,
        serviceRating: 4,
        communicationRating: 5,
        comment: 'Excellent photography service.',
        createdAt: new Date('2027-02-01T10:00:00.000Z'),
      });

      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 3,
        serviceRating: 3,
        communicationRating: 4,
        comment: 'Good service overall.',
        createdAt: new Date('2027-02-02T10:00:00.000Z'),
      });

      const response = await request(app).get('/api/v1/vendors');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);

      const photographyVendor = response.body.data.find(
        (vendor: { slug: string }) => vendor.slug === 'golden-lens-photography',
      );

      const cateringVendor = response.body.data.find(
        (vendor: { slug: string }) => vendor.slug === 'royal-feast-catering',
      );

      expect(photographyVendor).toMatchObject({
        averageRating: 4,
        reviewCount: 2,
      });

      expect(cateringVendor).toMatchObject({
        averageRating: null,
        reviewCount: 0,
      });
    });

    it('excludes hidden reviews from vendor list rating summaries', async () => {
      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 5,
        serviceRating: 5,
        communicationRating: 5,
        comment: 'Visible five-star review.',
        createdAt: new Date('2027-02-01T10:00:00.000Z'),
      });

      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 1,
        serviceRating: 1,
        communicationRating: 1,
        comment: 'Hidden one-star review.',
        createdAt: new Date('2027-02-02T10:00:00.000Z'),
        isHidden: true,
      });

      const response = await request(app).get('/api/v1/vendors');

      expect(response.status).toBe(200);

      const photographyVendor = response.body.data.find(
        (vendor: { slug: string }) => vendor.slug === 'golden-lens-photography',
      );

      expect(photographyVendor).toMatchObject({
        averageRating: 5,
        reviewCount: 1,
      });
    });

    it('filters vendors by search text', async () => {
      const response = await request(app).get('/api/v1/vendors?search=golden');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].slug).toBe('golden-lens-photography');
    });

    it('filters vendors by category slug', async () => {
      const response = await request(app).get('/api/v1/vendors?category=catering');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].slug).toBe('royal-feast-catering');
    });

    it('filters vendors by base location', async () => {
      const response = await request(app).get('/api/v1/vendors?location=colombo');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].slug).toBe('golden-lens-photography');
    });

    it('filters vendors by service area', async () => {
      const response = await request(app).get('/api/v1/vendors?serviceArea=Matale');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].slug).toBe('royal-feast-catering');
    });

    it('supports pagination', async () => {
      const response = await request(app).get('/api/v1/vendors?page=2&limit=1&sort=name_asc');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].slug).toBe('royal-feast-catering');

      expect(response.body.meta.pagination).toMatchObject({
        page: 2,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('rejects invalid query parameters', async () => {
      const response = await request(app).get('/api/v1/vendors?page=0&limit=100&sort=invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/vendors/:slug', () => {
    it('returns an approved vendor by slug', async () => {
      const response = await request(app).get('/api/v1/vendors/golden-lens-photography');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        businessName: 'Golden Lens Photography',
        slug: 'golden-lens-photography',
        baseLocation: 'Colombo',
        serviceAreas: ['Colombo', 'Kandy'],
      });

      expect(response.body.data.categories).toEqual([
        expect.objectContaining({
          slug: 'photography',
        }),
      ]);

      expect(response.body.data).not.toHaveProperty('verificationStatus');
      expect(response.body.data).not.toHaveProperty('rejectionReason');
      expect(response.body.data).not.toHaveProperty('submittedAt');
      expect(response.body.data).not.toHaveProperty('reviewedAt');
    });

    it('includes only active service packages', async () => {
      const response = await request(app).get('/api/v1/vendors/golden-lens-photography');

      expect(response.status).toBe(200);
      expect(response.body.data.packages).toHaveLength(1);

      expect(response.body.data.packages[0]).toMatchObject({
        title: 'Classic Wedding Photography',
        description: 'Complete wedding photography coverage with edited digital photographs.',
        basePrice: '85000.00',
        category: {
          name: 'Photography',
          slug: 'photography',
        },
      });

      const packageTitles = response.body.data.packages.map(
        (servicePackage: { title: string }) => servicePackage.title,
      );

      expect(packageTitles).not.toContain('Private Draft Photography Package');
    });

    it('returns an empty package list when an approved vendor has no active packages', async () => {
      await prisma.servicePackage.updateMany({
        where: {
          vendor: {
            slug: 'royal-feast-catering',
          },
        },
        data: {
          isActive: false,
        },
      });

      const response = await request(app).get('/api/v1/vendors/royal-feast-catering');

      expect(response.status).toBe(200);
      expect(response.body.data.packages).toEqual([]);
    });

    it('includes a rating summary for a vendor with reviews', async () => {
      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 5,
        serviceRating: 5,
        communicationRating: 4,
        comment: 'Excellent photography service.',
        createdAt: new Date('2027-02-10T10:00:00.000Z'),
      });

      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 3,
        serviceRating: 4,
        communicationRating: 3,
        comment: 'Good service overall.',
        createdAt: new Date('2027-02-12T10:00:00.000Z'),
      });

      const response = await request(app).get('/api/v1/vendors/golden-lens-photography');

      expect(response.status).toBe(200);

      expect(response.body.data.ratingSummary).toEqual({
        overallAverage: 4,
        serviceAverage: 4.5,
        communicationAverage: 3.5,
        reviewCount: 2,
        breakdown: {
          1: 0,
          2: 0,
          3: 1,
          4: 0,
          5: 1,
        },
      });
    });

    it('excludes hidden reviews from vendor detail rating summaries', async () => {
      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 4,
        serviceRating: 4,
        communicationRating: 4,
        comment: 'Visible review.',
        createdAt: new Date('2027-02-10T10:00:00.000Z'),
      });

      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 1,
        serviceRating: 1,
        communicationRating: 1,
        comment: 'Hidden review.',
        createdAt: new Date('2027-02-12T10:00:00.000Z'),
        isHidden: true,
      });

      const response = await request(app).get('/api/v1/vendors/golden-lens-photography');

      expect(response.status).toBe(200);

      expect(response.body.data.ratingSummary).toEqual({
        overallAverage: 4,
        serviceAverage: 4,
        communicationAverage: 4,
        reviewCount: 1,
        breakdown: {
          1: 0,
          2: 0,
          3: 0,
          4: 1,
          5: 0,
        },
      });
    });

    it('includes an empty rating summary for a vendor without reviews', async () => {
      const response = await request(app).get('/api/v1/vendors/royal-feast-catering');

      expect(response.status).toBe(200);

      expect(response.body.data.ratingSummary).toEqual({
        overallAverage: null,
        serviceAverage: null,
        communicationAverage: null,
        reviewCount: 0,
        breakdown: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      });
    });

    it('hides pending vendors', async () => {
      const response = await request(app).get('/api/v1/vendors/pending-event-studio');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PUBLIC_VENDOR_NOT_FOUND');
    });

    it('returns 404 for an unknown vendor slug', async () => {
      const response = await request(app).get('/api/v1/vendors/vendor-that-does-not-exist');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PUBLIC_VENDOR_NOT_FOUND');
    });
  });

  describe('GET /api/v1/vendors/:slug/reviews', () => {
    it('returns public reviews with rating summary and safe customer details', async () => {
      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 5,
        serviceRating: 5,
        communicationRating: 4,
        comment: 'Excellent photography service and very professional communication.',
        createdAt: new Date('2027-02-10T10:00:00.000Z'),
      });

      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 3,
        serviceRating: 4,
        communicationRating: 3,
        comment: 'Good service overall, but the delivery could have been faster.',
        createdAt: new Date('2027-02-12T10:00:00.000Z'),
      });

      const response = await request(app).get('/api/v1/vendors/golden-lens-photography/reviews');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      expect(response.body.data[0]).toMatchObject({
        overallRating: 3,
        serviceRating: 4,
        communicationRating: 3,
        comment: 'Good service overall, but the delivery could have been faster.',
        customer: {
          firstName: 'Maya',
          lastNameInitial: 'F.',
        },
        package: {
          title: 'Classic Wedding Photography',
        },
      });

      expect(response.body.data[1]).toMatchObject({
        overallRating: 5,
        serviceRating: 5,
        communicationRating: 4,
        comment: 'Excellent photography service and very professional communication.',
      });

      expect(response.body.meta.summary).toEqual({
        totalReviews: 2,
        averageOverallRating: 4,
        averageServiceRating: 4.5,
        averageCommunicationRating: 3.5,
        ratingBreakdown: {
          1: 0,
          2: 0,
          3: 1,
          4: 0,
          5: 1,
        },
      });

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      for (const review of response.body.data) {
        expect(review).not.toHaveProperty('bookingId');
        expect(review).not.toHaveProperty('customerId');
        expect(review.customer).not.toHaveProperty('email');
        expect(review.customer).not.toHaveProperty('lastName');
        expect(review.customer).not.toHaveProperty('phone');
      }
    });

    it('hides reviews for a pending vendor', async () => {
      const response = await request(app).get('/api/v1/vendors/pending-event-studio/reviews');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'PUBLIC_VENDOR_NOT_FOUND',
          message: 'Vendor not found',
        },
      });
    });

    it('returns 404 for reviews of an unknown vendor slug', async () => {
      const response = await request(app).get('/api/v1/vendors/vendor-that-does-not-exist/reviews');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'PUBLIC_VENDOR_NOT_FOUND',
          message: 'Vendor not found',
        },
      });
    });

    it('returns an empty review list with a zeroed summary', async () => {
      const response = await request(app).get('/api/v1/vendors/royal-feast-catering/reviews');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);

      expect(response.body.meta.summary).toEqual({
        totalReviews: 0,
        averageOverallRating: null,
        averageServiceRating: null,
        averageCommunicationRating: null,
        ratingBreakdown: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      });

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('rejects invalid review query parameters', async () => {
      const response = await request(app).get(
        '/api/v1/vendors/golden-lens-photography/reviews?page=0&limit=100&sort=invalid',
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('supports review pagination', async () => {
      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 5,
        comment: 'First review',
        createdAt: new Date('2027-02-10T10:00:00.000Z'),
      });

      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 4,
        comment: 'Second review',
        createdAt: new Date('2027-02-11T10:00:00.000Z'),
      });

      const response = await request(app).get(
        '/api/v1/vendors/golden-lens-photography/reviews?page=2&limit=1',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        overallRating: 5,
        comment: 'First review',
      });

      expect(response.body.meta.pagination).toEqual({
        page: 2,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('sorts reviews from oldest to newest', async () => {
      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 2,
        comment: 'Older review',
        createdAt: new Date('2027-02-10T10:00:00.000Z'),
      });

      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 5,
        comment: 'Newer review',
        createdAt: new Date('2027-02-12T10:00:00.000Z'),
      });

      const response = await request(app).get(
        '/api/v1/vendors/golden-lens-photography/reviews?sort=oldest',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);

      expect(response.body.data[0]).toMatchObject({
        overallRating: 2,
        comment: 'Older review',
      });

      expect(response.body.data[1]).toMatchObject({
        overallRating: 5,
        comment: 'Newer review',
      });
    });

    it('sorts reviews from highest to lowest rating', async () => {
      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 2,
        comment: 'Lower-rated review',
        createdAt: new Date('2027-02-12T10:00:00.000Z'),
      });

      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 5,
        comment: 'Higher-rated review',
        createdAt: new Date('2027-02-10T10:00:00.000Z'),
      });

      const response = await request(app).get(
        '/api/v1/vendors/golden-lens-photography/reviews?sort=rating_highest',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);

      expect(response.body.data[0]).toMatchObject({
        overallRating: 5,
        comment: 'Higher-rated review',
      });

      expect(response.body.data[1]).toMatchObject({
        overallRating: 2,
        comment: 'Lower-rated review',
      });
    });

    it('sorts reviews from lowest to highest rating', async () => {
      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 5,
        comment: 'Higher-rated review',
        createdAt: new Date('2027-02-10T10:00:00.000Z'),
      });

      await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 2,
        comment: 'Lower-rated review',
        createdAt: new Date('2027-02-12T10:00:00.000Z'),
      });

      const response = await request(app).get(
        '/api/v1/vendors/golden-lens-photography/reviews?sort=rating_lowest',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);

      expect(response.body.data[0]).toMatchObject({
        overallRating: 2,
        comment: 'Lower-rated review',
      });

      expect(response.body.data[1]).toMatchObject({
        overallRating: 5,
        comment: 'Higher-rated review',
      });
    });

    it('excludes hidden reviews from the public review list and summary', async () => {
      const visibleReview = await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 5,
        serviceRating: 4,
        communicationRating: 5,
        comment: 'Visible public review.',
        createdAt: new Date('2027-02-10T10:00:00.000Z'),
      });

      const hiddenReview = await createPublicVendorReview({
        vendorSlug: 'golden-lens-photography',
        overallRating: 1,
        serviceRating: 1,
        communicationRating: 1,
        comment: 'Hidden moderated review.',
        createdAt: new Date('2027-02-12T10:00:00.000Z'),
        isHidden: true,
      });

      const response = await request(app).get('/api/v1/vendors/golden-lens-photography/reviews');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);

      expect(response.body.data[0]).toMatchObject({
        id: visibleReview.id,
        overallRating: 5,
        serviceRating: 4,
        communicationRating: 5,
        comment: 'Visible public review.',
      });

      expect(
        response.body.data.some((review: { id: string }) => review.id === hiddenReview.id),
      ).toBe(false);

      expect(response.body.meta.summary).toEqual({
        totalReviews: 1,
        averageOverallRating: 5,
        averageServiceRating: 4,
        averageCommunicationRating: 5,
        ratingBreakdown: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 1,
        },
      });

      expect(response.body.meta.pagination).toMatchObject({
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('GET /api/v1/vendors/:slug/portfolio', () => {
    it('returns portfolio items for an approved vendor', async () => {
      await createPublicVendorPortfolioItem({
        vendorSlug: 'golden-lens-photography',
        title: 'Featured wedding album',
        description: 'A featured wedding photography portfolio item.',
        displayOrder: 2,
        isFeatured: true,
      });

      await createPublicVendorPortfolioItem({
        vendorSlug: 'golden-lens-photography',
        title: 'Engagement shoot',
        description: 'An engagement photography portfolio item.',
        displayOrder: 1,
      });

      const response = await request(app).get('/api/v1/vendors/golden-lens-photography/portfolio');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      expect(response.body.data[0]).toMatchObject({
        title: 'Featured wedding album',
        description: 'A featured wedding photography portfolio item.',
        isFeatured: true,
        displayOrder: 2,
        mimeType: 'image/jpeg',
        fileSize: 2048,
      });

      expect(response.body.data[1]).toMatchObject({
        title: 'Engagement shoot',
        description: 'An engagement photography portfolio item.',
        isFeatured: false,
        displayOrder: 1,
      });

      for (const item of response.body.data) {
        expect(item.id).toEqual(expect.any(String));
        expect(item.imageUrl).toEqual(expect.any(String));
        expect(item.imagePublicId).toEqual(expect.any(String));
        expect(item.originalName).toEqual(expect.any(String));
        expect(item.createdAt).toEqual(expect.any(String));
        expect(item.updatedAt).toEqual(expect.any(String));
      }
    });

    it('returns an empty portfolio list for an approved vendor without portfolio items', async () => {
      const response = await request(app).get('/api/v1/vendors/royal-feast-catering/portfolio');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('hides portfolio items for a pending vendor', async () => {
      await createPublicVendorPortfolioItem({
        vendorSlug: 'pending-event-studio',
        title: 'Hidden pending vendor item',
        description: 'This portfolio item must not be visible publicly.',
        displayOrder: 1,
      });

      const response = await request(app).get('/api/v1/vendors/pending-event-studio/portfolio');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PUBLIC_VENDOR_NOT_FOUND');
    });

    it('returns 404 for an unknown vendor portfolio', async () => {
      const response = await request(app).get(
        '/api/v1/vendors/vendor-that-does-not-exist/portfolio',
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PUBLIC_VENDOR_NOT_FOUND');
    });
  });
});
