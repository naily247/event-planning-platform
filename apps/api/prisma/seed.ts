/// <reference types="node" />

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

const seed = async () => {
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

  console.log(
    `${serviceCategories.length} service categories seeded successfully.`,
  );
};

seed()
  .catch((error) => {
    console.error('Failed to seed service categories:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });