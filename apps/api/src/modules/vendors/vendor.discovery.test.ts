import request from 'supertest';
import { AccountStatus, Prisma, UserRole, VendorVerificationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const testEmails = [
  'discovery-approved-one@example.com',
  'discovery-approved-two@example.com',
  'discovery-pending@example.com',
  'discovery-draft@example.com',
] as const;

const passwordHashPromise = bcrypt.hash('Vendor@2026', 12);

const clearDiscoveryVendors = async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [...testEmails],
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
});
