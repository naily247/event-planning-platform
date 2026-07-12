import type { PrismaClient } from '@prisma/client';
import { DEFAULT_VENDOR_VERIFICATION_STATUS, DEVELOPMENT_VENDORS } from './constants.js';
import { getRequiredCategoryBySlug, getRequiredUserByEmail } from './helpers.js';

export const seedVendorProfiles = async (prisma: PrismaClient) => {
  for (const vendorData of DEVELOPMENT_VENDORS) {
    const user = await getRequiredUserByEmail(prisma, vendorData.email);

    const category = await getRequiredCategoryBySlug(prisma, vendorData.categorySlug);

    const vendor = await prisma.vendorProfile.upsert({
      where: {
        userId: user.id,
      },
      update: {
        businessName: vendorData.businessName,
        slug: vendorData.slug,
        description: vendorData.description,
        contactPhone: null,
        website: null,
        baseLocation: vendorData.baseLocation,
        serviceAreas: [...vendorData.serviceAreas],
        verificationStatus: DEFAULT_VENDOR_VERIFICATION_STATUS,
        submittedAt: new Date('2026-01-10T09:00:00.000Z'),
        reviewedAt: new Date('2026-01-12T11:30:00.000Z'),
        rejectionReason: null,
      },
      create: {
        userId: user.id,
        businessName: vendorData.businessName,
        slug: vendorData.slug,
        description: vendorData.description,
        contactPhone: null,
        website: null,
        baseLocation: vendorData.baseLocation,
        serviceAreas: [...vendorData.serviceAreas],
        verificationStatus: DEFAULT_VENDOR_VERIFICATION_STATUS,
        submittedAt: new Date('2026-01-10T09:00:00.000Z'),
        reviewedAt: new Date('2026-01-12T11:30:00.000Z'),
        rejectionReason: null,
      },
    });

    await prisma.vendorCategory.upsert({
      where: {
        vendorId_categoryId: {
          vendorId: vendor.id,
          categoryId: category.id,
        },
      },
      update: {},
      create: {
        vendorId: vendor.id,
        categoryId: category.id,
      },
    });
  }

  console.log(`${DEVELOPMENT_VENDORS.length} vendor profiles seeded successfully.`);
};
