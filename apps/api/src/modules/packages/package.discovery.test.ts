import request from 'supertest';
import { AccountStatus, Prisma, UserRole, VendorVerificationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app.js';
import { prisma } from '../../config/prisma.js';

const app = createApp();

const testEmails = [
  'package-discovery-approved-one@example.com',
  'package-discovery-approved-two@example.com',
  'package-discovery-pending@example.com',
] as const;

const passwordHashPromise = bcrypt.hash('Vendor@2026', 12);

let approvedPhotographyPackageId = '';
let approvedCateringPackageId = '';
let inactivePackageId = '';
let pendingVendorPackageId = '';

const clearDiscoveryPackages = async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [...testEmails],
      },
    },
  });
};

const createVendorWithPackages = async ({
  email,
  businessName,
  slug,
  baseLocation,
  serviceAreas,
  verificationStatus,
  categorySlug,
  packages,
}: {
  email: string;
  businessName: string;
  slug: string;
  baseLocation: string;
  serviceAreas: string[];
  verificationStatus: VendorVerificationStatus;
  categorySlug: string;
  packages: Array<{
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
      firstName: 'Package',
      lastName: 'Discovery',
      role: UserRole.VENDOR,
      status: AccountStatus.ACTIVE,
      vendor: {
        create: {
          businessName,
          slug,
          description: `${businessName} provides reliable event services.`,
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
      vendor: {
        include: {
          packages: true,
        },
      },
    },
  });
};

beforeEach(async () => {
  await clearDiscoveryPackages();

  const photographyVendor = await createVendorWithPackages({
    email: testEmails[0],
    businessName: 'Golden Lens Photography',
    slug: 'golden-lens-package-discovery',
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
        description: 'This inactive photography package must never appear in public discovery.',
        basePrice: '45000.00',
        isActive: false,
      },
    ],
  });

  const photographyPackage = photographyVendor.vendor?.packages.find(
    (servicePackage) => servicePackage.title === 'Classic Wedding Photography',
  );

  if (!photographyPackage) {
    throw new Error('Expected the approved photography package to be created');
  }

  approvedPhotographyPackageId = photographyPackage.id;

  const inactivePhotographyPackage = photographyVendor.vendor?.packages.find(
    (servicePackage) => servicePackage.title === 'Private Draft Photography Package',
  );

  if (!inactivePhotographyPackage) {
    throw new Error('Expected the inactive photography package to be created');
  }

  inactivePackageId = inactivePhotographyPackage.id;

  const cateringVendor = await createVendorWithPackages({
    email: testEmails[1],
    businessName: 'Royal Feast Catering',
    slug: 'royal-feast-package-discovery',
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

  const cateringPackage = cateringVendor.vendor?.packages[0];

  if (!cateringPackage) {
    throw new Error('Expected the approved catering package to be created');
  }

  approvedCateringPackageId = cateringPackage.id;

  const pendingVendor = await createVendorWithPackages({
    email: testEmails[2],
    businessName: 'Pending Event Studio',
    slug: 'pending-package-discovery',
    baseLocation: 'Colombo',
    serviceAreas: ['Colombo'],
    verificationStatus: VendorVerificationStatus.PENDING,
    categorySlug: 'photography',
    packages: [
      {
        title: 'Pending Vendor Package',
        description: 'This active package belongs to a pending vendor and must remain hidden.',
        basePrice: '65000.00',
        isActive: true,
      },
    ],
  });

  const pendingPackage = pendingVendor.vendor?.packages[0];

  if (!pendingPackage) {
    throw new Error('Expected the pending vendor package to be created');
  }

  pendingVendorPackageId = pendingPackage.id;
});

afterAll(async () => {
  await clearDiscoveryPackages();
  await prisma.$disconnect();
});

describe('Public service package discovery API', () => {
  describe('GET /api/v1/packages', () => {
    it('returns only active packages from approved vendors', async () => {
      const response = await request(app).get('/api/v1/packages');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      const packageIds = response.body.data.map(
        (servicePackage: { id: string }) => servicePackage.id,
      );

      expect(packageIds).toEqual(
        expect.arrayContaining([approvedPhotographyPackageId, approvedCateringPackageId]),
      );

      expect(packageIds).not.toContain(inactivePackageId);
      expect(packageIds).not.toContain(pendingVendorPackageId);

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 12,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('filters packages by search text', async () => {
      const response = await request(app).get('/api/v1/packages?search=classic');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Classic Wedding Photography');
    });

    it('searches packages by vendor business name', async () => {
      const response = await request(app).get('/api/v1/packages?search=royal');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].vendor.slug).toBe('royal-feast-package-discovery');
    });

    it('filters packages by category slug', async () => {
      const response = await request(app).get('/api/v1/packages?category=catering');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category.slug).toBe('catering');
    });

    it('filters packages by vendor location', async () => {
      const response = await request(app).get('/api/v1/packages?location=colombo');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].vendor.baseLocation).toBe('Colombo');
    });

    it('filters packages by vendor service area', async () => {
      const response = await request(app).get('/api/v1/packages?serviceArea=Matale');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].vendor.serviceAreas).toContain('Matale');
    });

    it('filters packages by price range', async () => {
      const response = await request(app).get('/api/v1/packages?minPrice=100000&maxPrice=200000');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].basePrice).toBe('150000.00');
    });

    it('sorts packages by price ascending', async () => {
      const response = await request(app).get('/api/v1/packages?sort=price_asc');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].basePrice).toBe('85000.00');
      expect(response.body.data[1].basePrice).toBe('150000.00');
    });

    it('supports pagination', async () => {
      const response = await request(app).get('/api/v1/packages?page=2&limit=1&sort=price_asc');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(approvedCateringPackageId);

      expect(response.body.meta.pagination).toMatchObject({
        page: 2,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('rejects an invalid price range', async () => {
      const response = await request(app).get('/api/v1/packages?minPrice=200000&maxPrice=100000');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid query parameters', async () => {
      const response = await request(app).get('/api/v1/packages?page=0&limit=100&sort=invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/packages/:packageId', () => {
    it('returns an active package from an approved vendor', async () => {
      const response = await request(app).get(`/api/v1/packages/${approvedPhotographyPackageId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(response.body.data).toMatchObject({
        id: approvedPhotographyPackageId,
        title: 'Classic Wedding Photography',
        basePrice: '85000.00',
        category: {
          slug: 'photography',
        },
        vendor: {
          businessName: 'Golden Lens Photography',
          slug: 'golden-lens-package-discovery',
          baseLocation: 'Colombo',
          serviceAreas: ['Colombo', 'Kandy'],
        },
      });
    });

    it('hides inactive packages', async () => {
      const response = await request(app).get(`/api/v1/packages/${inactivePackageId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PUBLIC_SERVICE_PACKAGE_NOT_FOUND');
    });

    it('hides packages owned by unapproved vendors', async () => {
      const response = await request(app).get(`/api/v1/packages/${pendingVendorPackageId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PUBLIC_SERVICE_PACKAGE_NOT_FOUND');
    });

    it('returns 404 for an unknown package ID', async () => {
      const response = await request(app).get('/api/v1/packages/cly0000000000000000000000');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PUBLIC_SERVICE_PACKAGE_NOT_FOUND');
    });
  });
});
