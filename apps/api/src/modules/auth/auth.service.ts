import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { AccountStatus, UserRole } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import type {
  LoginInput,
  RegisterCustomerInput,
  RegisterVendorInput,
} from './auth.schemas.js';

const PASSWORD_SALT_ROUNDS = 12;

const createAccessToken = (userId: string, role: UserRole) => {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return jwt.sign(
    {
      sub: userId,
      role,
      type: 'access',
    },
    env.JWT_ACCESS_SECRET,
    options,
  );
};

const createUniqueVendorSlug = async (businessName: string) => {
  const baseSlug = businessName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const safeBaseSlug = baseSlug || 'vendor';

  let slug = safeBaseSlug;
  let number = 1;

  while (
    await prisma.vendorProfile.findUnique({
      where: { slug },
      select: { id: true },
    })
  ) {
    slug = `${safeBaseSlug}-${number}`;
    number += 1;
  }

  return slug;
};

const createAuthResponse = (user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: AccountStatus;
}) => ({
  accessToken: createAccessToken(user.id, user.role),
  user: {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
  },
});

export const registerCustomer = async (
  input: RegisterCustomerInput,
) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError(
      409,
      'An account with this email already exists',
      'EMAIL_ALREADY_EXISTS',
    );
  }

  const passwordHash = await bcrypt.hash(
    input.password,
    PASSWORD_SALT_ROUNDS,
  );

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: UserRole.CUSTOMER,
      status: AccountStatus.ACTIVE,
      customer: {
        create: {
          phone: input.phone,
        },
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  });

  return createAuthResponse(user);
};

export const registerVendor = async (
  input: RegisterVendorInput,
) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError(
      409,
      'An account with this email already exists',
      'EMAIL_ALREADY_EXISTS',
    );
  }

  const passwordHash = await bcrypt.hash(
    input.password,
    PASSWORD_SALT_ROUNDS,
  );

  const slug = await createUniqueVendorSlug(input.businessName);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: UserRole.VENDOR,
      status: AccountStatus.ACTIVE,
      vendor: {
        create: {
          businessName: input.businessName,
          slug,
        },
      },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  });

  return createAuthResponse(user);
};

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new AppError(
      401,
      'Invalid email or password',
      'INVALID_CREDENTIALS',
    );
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError(
      401,
      'Invalid email or password',
      'INVALID_CREDENTIALS',
    );
  }

  if (user.status === AccountStatus.SUSPENDED) {
    throw new AppError(
      403,
      'This account has been suspended',
      'ACCOUNT_SUSPENDED',
    );
  }

  if (user.status === AccountStatus.DEACTIVATED) {
    throw new AppError(
      403,
      'This account has been deactivated',
      'ACCOUNT_DEACTIVATED',
    );
  }

  return createAuthResponse(user);
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      customer: {
        select: {
          id: true,
          phone: true,
        },
      },
      vendor: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          verificationStatus: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(
      404,
      'User account not found',
      'USER_NOT_FOUND',
    );
  }

  return user;
};