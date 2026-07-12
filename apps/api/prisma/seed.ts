/// <reference types="node" />

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { seedAdminAccount } from './seed/admin.seed.js';
import { seedBookings } from './seed/bookings.seed.js';
import { seedEventBudgetCategories } from './seed/budgets.seed.js';
import { seedServiceCategories } from './seed/categories.seed.js';
import { seedDevelopmentEvents } from './seed/events.seed.js';
import { seedDevelopmentExpenses } from './seed/expenses.seed.js';
import { seedEventGuests } from './seed/guests.seed.js';
import { seedHistoricalWorkflows } from './seed/historical.seed.js';
import { seedMoodBoardItems } from './seed/moodBoards.seed.js';
import { seedNotifications } from './seed/notifications.seed.js';
import { seedServicePackages } from './seed/packages.seed.js';
import { seedPayments } from './seed/payments.seed.js';
import { seedVendorPortfolioItems } from './seed/portfolios.seed.js';
import { seedQuotationWorkflows } from './seed/quotations.seed.js';
import { seedEventTasks } from './seed/tasks.seed.js';
import { seedDevelopmentUsers } from './seed/users.seed.js';
import { seedVendorProfiles } from './seed/vendors.seed.js';

const prisma = new PrismaClient();

const seedEnvSchema = z.object({
  ADMIN_SEED_EMAIL: z.string().email(),
  ADMIN_SEED_PASSWORD: z.string().min(12),
});

const seedEnv = seedEnvSchema.parse(process.env);

const seed = async () => {
  console.log('Starting Eventure development database seed...');

  await seedServiceCategories(prisma);

  await seedAdminAccount(prisma, {
    email: seedEnv.ADMIN_SEED_EMAIL,
    password: seedEnv.ADMIN_SEED_PASSWORD,
  });

  await seedDevelopmentUsers(prisma);
  await seedVendorProfiles(prisma);
  await seedServicePackages(prisma);
  await seedVendorPortfolioItems(prisma);

  await seedDevelopmentEvents(prisma);
  await seedEventBudgetCategories(prisma);
  await seedDevelopmentExpenses(prisma);
  await seedEventTasks(prisma);
  await seedEventGuests(prisma);
  await seedMoodBoardItems(prisma);

  await seedQuotationWorkflows(prisma);
  await seedBookings(prisma);

  await seedPayments(prisma, {
    adminEmail: seedEnv.ADMIN_SEED_EMAIL,
  });

  await seedHistoricalWorkflows(prisma, {
    adminEmail: seedEnv.ADMIN_SEED_EMAIL,
  });

  await seedNotifications(prisma, {
    adminEmail: seedEnv.ADMIN_SEED_EMAIL,
  });

  console.log('Eventure development database seeded successfully.');
};

seed()
  .catch((error: unknown) => {
    console.error('Failed to seed application data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
