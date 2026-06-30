/// <reference types="node" />

import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { z } from 'zod';
import { AccountStatus, PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const seedEnvSchema = z.object({
  ADMIN_SEED_EMAIL: z.string().email(),
  ADMIN_SEED_PASSWORD: z.string().min(12),
});

const seedEnv = seedEnvSchema.parse(process.env);

const PASSWORD_SALT_ROUNDS = 12;

const serviceCategories = [
  {
    name: 'Photography',
    slug: 'photography',
  },
  {
    name: 'Videography',
    slug: 'videography',
  },
  {
    name: 'Catering',
    slug: 'catering',
  },
  {
    name: 'Decorations',
    slug: 'decorations',
  },
  {
    name: 'Music and DJ',
    slug: 'music-and-dj',
  },
  {
    name: 'Venues',
    slug: 'venues',
  },
  {
    name: 'Bridal and Beauty',
    slug: 'bridal-and-beauty',
  },
  {
    name: 'Event Planning',
    slug: 'event-planning',
  },
  {
    name: 'Invitations and Printing',
    slug: 'invitations-and-printing',
  },
  {
    name: 'Transport',
    slug: 'transport',
  },
];

const seedServiceCategories = async () => {
  for (const category of serviceCategories) {
    await prisma.serviceCategory.upsert({
      where: {
        slug: category.slug,
      },
      update: {
        name: category.name,
      },
      create: category,
    });
  }

  console.log(`${serviceCategories.length} service categories seeded successfully.`);
};

const seedAdminAccount = async () => {
  const passwordHash = await bcrypt.hash(seedEnv.ADMIN_SEED_PASSWORD, PASSWORD_SALT_ROUNDS);

  await prisma.user.upsert({
    where: {
      email: seedEnv.ADMIN_SEED_EMAIL,
    },
    update: {
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
    },
    create: {
      email: seedEnv.ADMIN_SEED_EMAIL,
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
    },
  });

  console.log('Development admin account seeded successfully.');
  console.log(`Admin email: ${seedEnv.ADMIN_SEED_EMAIL}`);
};

const seed = async () => {
  await seedServiceCategories();
  await seedAdminAccount();
};

seed()
  .catch((error) => {
    console.error('Failed to seed application data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
