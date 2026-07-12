import bcrypt from 'bcryptjs';
import { AccountStatus, type PrismaClient, UserRole } from '@prisma/client';
import { PASSWORD_SALT_ROUNDS } from './constants.js';

type SeedAdminAccountInput = {
  email: string;
  password: string;
};

export const seedAdminAccount = async (prisma: PrismaClient, input: SeedAdminAccountInput) => {
  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  await prisma.user.upsert({
    where: {
      email: input.email,
    },
    update: {
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
    },
    create: {
      email: input.email,
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
    },
  });

  console.log('Development admin account seeded successfully.');
  console.log(`Admin email: ${input.email}`);
};
