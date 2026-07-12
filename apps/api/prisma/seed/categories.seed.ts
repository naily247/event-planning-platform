import type { PrismaClient } from '@prisma/client';
import { DEVELOPMENT_SERVICE_CATEGORIES } from './constants.js';

export const seedServiceCategories = async (prisma: PrismaClient) => {
  for (const category of DEVELOPMENT_SERVICE_CATEGORIES) {
    await prisma.serviceCategory.upsert({
      where: {
        slug: category.slug,
      },
      update: {
        name: category.name,
      },
      create: {
        name: category.name,
        slug: category.slug,
      },
    });
  }

  console.log(`${DEVELOPMENT_SERVICE_CATEGORIES.length} service categories seeded successfully.`);
};
