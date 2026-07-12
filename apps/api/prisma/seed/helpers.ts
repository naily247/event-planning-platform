import type { PrismaClient } from '@prisma/client';

export const getRequiredCategoryBySlug = async (prisma: PrismaClient, slug: string) => {
  const category = await prisma.serviceCategory.findUnique({
    where: {
      slug,
    },
  });

  if (!category) {
    throw new Error(`Required service category "${slug}" was not found. Seed categories first.`);
  }

  return category;
};

export const getRequiredUserByEmail = async (prisma: PrismaClient, email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error(`Required development user "${email}" was not found. Seed users first.`);
  }

  return user;
};

export const getRequiredVendorBySlug = async (prisma: PrismaClient, slug: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      slug,
    },
    include: {
      user: true,
    },
  });

  if (!vendor) {
    throw new Error(`Required development vendor "${slug}" was not found. Seed vendors first.`);
  }

  return vendor;
};

export const getRequiredEventByNameAndOwner = async (
  prisma: PrismaClient,
  name: string,
  ownerId: string,
) => {
  const event = await prisma.event.findFirst({
    where: {
      name,
      ownerId,
    },
  });

  if (!event) {
    throw new Error(
      `Required development event "${name}" was not found for owner "${ownerId}". Seed events first.`,
    );
  }

  return event;
};
