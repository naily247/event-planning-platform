import bcrypt from 'bcryptjs';
import { AccountStatus, type PrismaClient, UserRole } from '@prisma/client';
import {
  DEFAULT_PASSWORD,
  DEVELOPMENT_CUSTOMERS,
  DEVELOPMENT_VENDORS,
  PASSWORD_SALT_ROUNDS,
} from './constants.js';

export const seedDevelopmentUsers = async (prisma: PrismaClient) => {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, PASSWORD_SALT_ROUNDS);

  for (const customer of DEVELOPMENT_CUSTOMERS) {
    const user = await prisma.user.upsert({
      where: {
        email: customer.email,
      },
      update: {
        passwordHash,
        firstName: customer.firstName,
        lastName: customer.lastName,
        role: UserRole.CUSTOMER,
        status: AccountStatus.ACTIVE,
      },
      create: {
        email: customer.email,
        passwordHash,
        firstName: customer.firstName,
        lastName: customer.lastName,
        role: UserRole.CUSTOMER,
        status: AccountStatus.ACTIVE,
      },
    });

    await prisma.customerProfile.upsert({
      where: {
        userId: user.id,
      },
      update: {
        phone: customer.phone,
      },
      create: {
        userId: user.id,
        phone: customer.phone,
      },
    });
  }

  for (const vendor of DEVELOPMENT_VENDORS) {
    await prisma.user.upsert({
      where: {
        email: vendor.email,
      },
      update: {
        passwordHash,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        role: UserRole.VENDOR,
        status: AccountStatus.ACTIVE,
      },
      create: {
        email: vendor.email,
        passwordHash,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        role: UserRole.VENDOR,
        status: AccountStatus.ACTIVE,
      },
    });
  }

  console.log(`${DEVELOPMENT_CUSTOMERS.length} development customer accounts seeded successfully.`);

  console.log(`${DEVELOPMENT_VENDORS.length} development vendor accounts seeded successfully.`);

  console.log(`Development account password: ${DEFAULT_PASSWORD}`);
};
