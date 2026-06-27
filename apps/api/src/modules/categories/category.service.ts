import { prisma } from '../../config/prisma.js';

export const getServiceCategories = async () => {
  return prisma.serviceCategory.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
};