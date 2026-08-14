import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { AccountStatus, UserRole } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { deleteCloudinaryAsset } from '../../services/cloudinary.service.js';
import { uploadAsset } from '../uploads/upload.service.js';
import type {
  ChangeCurrentUserPasswordInput,
  LoginInput,
  RegisterCustomerInput,
  RegisterVendorInput,
  UpdateCurrentUserInput,
} from './auth.schemas.js';

const PASSWORD_SALT_ROUNDS = 12;
const PROFILE_IMAGE_FOLDER = 'event-platform/profile-images';

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
  profileImageUrl?: string | null;
  role: UserRole;
  status: AccountStatus;
}) => ({
  accessToken: createAccessToken(user.id, user.role),
  user: {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl ?? null,
    role: user.role,
    status: user.status,
  },
});

export const registerCustomer = async (input: RegisterCustomerInput) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError(409, 'An account with this email already exists', 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

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
      profileImageUrl: true,
      role: true,
      status: true,
    },
  });

  return createAuthResponse(user);
};

export const registerVendor = async (input: RegisterVendorInput) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError(409, 'An account with this email already exists', 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

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
      profileImageUrl: true,
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
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (user.status === AccountStatus.SUSPENDED) {
    throw new AppError(403, 'This account has been suspended', 'ACCOUNT_SUSPENDED');
  }

  if (user.status === AccountStatus.DEACTIVATED) {
    throw new AppError(403, 'This account has been deactivated', 'ACCOUNT_DEACTIVATED');
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
      profileImageUrl: true,
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
    throw new AppError(404, 'User account not found', 'USER_NOT_FOUND');
  }

  return user;
};

export const updateCurrentUser = async (userId: string, input: UpdateCurrentUserInput) => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      customer: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!existingUser) {
    throw new AppError(404, 'User account not found', 'USER_NOT_FOUND');
  }

  if (input.phone !== undefined && existingUser.role !== UserRole.CUSTOMER) {
    throw new AppError(
      400,
      'Phone updates through this profile are only available for customer accounts',
      'CUSTOMER_PHONE_UPDATE_ONLY',
    );
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: userId },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      },
    });

    if (input.phone !== undefined) {
      if (!existingUser.customer) {
        throw new AppError(404, 'Customer profile not found', 'CUSTOMER_PROFILE_NOT_FOUND');
      }

      await transaction.customerProfile.update({
        where: {
          id: existingUser.customer.id,
        },
        data: {
          phone: input.phone,
        },
      });
    }
  });

  return getCurrentUser(userId);
};

export const updateCurrentUserProfileImage = async (
  userId: string,
  file: Express.Multer.File | undefined,
) => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      profileImagePublicId: true,
    },
  });

  if (!existingUser) {
    throw new AppError(404, 'User account not found', 'USER_NOT_FOUND');
  }

  const uploadedImage = await uploadAsset({
    file,
    folder: PROFILE_IMAGE_FOLDER,
  });

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        profileImageUrl: uploadedImage.fileUrl,
        profileImagePublicId: uploadedImage.filePublicId,
      },
    });
  } catch (error) {
    await deleteCloudinaryAsset(uploadedImage.filePublicId);
    throw error;
  }

  if (
    existingUser.profileImagePublicId &&
    existingUser.profileImagePublicId !== uploadedImage.filePublicId
  ) {
    try {
      await deleteCloudinaryAsset(existingUser.profileImagePublicId);
    } catch (error) {
      console.error('Previous profile image could not be deleted from Cloudinary:', error);
    }
  }

  return getCurrentUser(userId);
};

export const removeCurrentUserProfileImage = async (userId: string) => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      profileImagePublicId: true,
    },
  });

  if (!existingUser) {
    throw new AppError(404, 'User account not found', 'USER_NOT_FOUND');
  }

  if (!existingUser.profileImagePublicId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        profileImageUrl: null,
        profileImagePublicId: null,
      },
    });

    return getCurrentUser(userId);
  }

  await deleteCloudinaryAsset(existingUser.profileImagePublicId);

  await prisma.user.update({
    where: { id: userId },
    data: {
      profileImageUrl: null,
      profileImagePublicId: null,
    },
  });

  return getCurrentUser(userId);
};

export const changeCurrentUserPassword = async (
  userId: string,
  input: ChangeCurrentUserPasswordInput,
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User account not found', 'USER_NOT_FOUND');
  }

  const currentPasswordMatches = await bcrypt.compare(input.currentPassword, user.passwordHash);

  if (!currentPasswordMatches) {
    throw new AppError(400, 'Current password is incorrect', 'CURRENT_PASSWORD_INCORRECT');
  }

  const newPasswordMatchesCurrentPassword = await bcrypt.compare(
    input.newPassword,
    user.passwordHash,
  );

  if (newPasswordMatchesCurrentPassword) {
    throw new AppError(
      400,
      'New password must be different from your current password',
      'NEW_PASSWORD_MUST_DIFFER',
    );
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword, PASSWORD_SALT_ROUNDS);

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      passwordHash: newPasswordHash,
    },
  });

  return {
    message: 'Password changed successfully',
  };
};
