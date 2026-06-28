import { VendorVerificationStatus } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  UpdateVendorCategoriesInput,
  UpdateVendorProfileInput,
} from './vendor.schemas.js';

const vendorProfileSelect = {
  id: true,
  businessName: true,
  slug: true,
  description: true,
  contactPhone: true,
  website: true,
  baseLocation: true,
  serviceAreas: true,
  verificationStatus: true,
  submittedAt: true,
  reviewedAt: true,
  rejectionReason: true,
  categories: {
    select: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      category: {
        name: 'asc',
      },
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

type VendorProfileDetails = {
  businessName: string;
  description: string | null;
  contactPhone: string | null;
  baseLocation: string | null;
  serviceAreas: string[];
  categories: Array<{
    category: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
};

const calculateProfileCompletion = (vendor: VendorProfileDetails) => {
  const fields = {
    businessName: vendor.businessName.trim().length >= 2,
    description: Boolean(
      vendor.description && vendor.description.trim().length >= 20,
    ),
    contactPhone: Boolean(vendor.contactPhone),
    baseLocation: Boolean(vendor.baseLocation),
    serviceAreas: vendor.serviceAreas.length > 0,
    categories: vendor.categories.length > 0,
  };

  const completedFields = Object.values(fields).filter(Boolean).length;
  const totalFields = Object.keys(fields).length;

  return {
    percentage: Math.round((completedFields / totalFields) * 100),
    completedFields,
    totalFields,
    fields,
  };
};

const formatVendorProfile = <
  T extends {
    categories: Array<{
      category: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
  },
>(
  vendor: T,
) => ({
  ...vendor,
  categories: vendor.categories.map(({ category }) => category),
});

const ensureVendorProfileCanBeEdited = (
  verificationStatus: VendorVerificationStatus,
) => {
  if (
    verificationStatus === VendorVerificationStatus.PENDING ||
    verificationStatus === VendorVerificationStatus.APPROVED
  ) {
    throw new AppError(
      409,
      'This vendor profile cannot be edited in its current verification state',
      'VENDOR_PROFILE_LOCKED',
    );
  }
};

export const getVendorOnboardingProfile = async (userId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: vendorProfileSelect,
  });

  if (!vendor) {
    throw new AppError(
      404,
      'Vendor profile not found',
      'VENDOR_PROFILE_NOT_FOUND',
    );
  }

  return {
    profile: formatVendorProfile(vendor),
    completion: calculateProfileCompletion(vendor),
  };
};

export const updateVendorOnboardingProfile = async (
  userId: string,
  input: UpdateVendorProfileInput,
) => {
  const existingVendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      verificationStatus: true,
    },
  });

  if (!existingVendor) {
    throw new AppError(
      404,
      'Vendor profile not found',
      'VENDOR_PROFILE_NOT_FOUND',
    );
  }

  ensureVendorProfileCanBeEdited(existingVendor.verificationStatus);

  const returningFromRejection =
    existingVendor.verificationStatus ===
    VendorVerificationStatus.REJECTED;

  const vendor = await prisma.vendorProfile.update({
    where: { userId },
    data: {
      ...input,

      // Editing a rejected profile returns it to draft before resubmission.
      ...(returningFromRejection && {
        verificationStatus: VendorVerificationStatus.DRAFT,
        submittedAt: null,
        reviewedAt: null,
        rejectionReason: null,
      }),
    },
    select: vendorProfileSelect,
  });

  return {
    profile: formatVendorProfile(vendor),
    completion: calculateProfileCompletion(vendor),
  };
};

export const updateVendorCategories = async (
  userId: string,
  input: UpdateVendorCategoriesInput,
) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      verificationStatus: true,
    },
  });

  if (!vendor) {
    throw new AppError(
      404,
      'Vendor profile not found',
      'VENDOR_PROFILE_NOT_FOUND',
    );
  }

  ensureVendorProfileCanBeEdited(vendor.verificationStatus);

  const categories = await prisma.serviceCategory.findMany({
    where: {
      id: {
        in: input.categoryIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (categories.length !== input.categoryIds.length) {
    throw new AppError(
      400,
      'One or more selected service categories do not exist',
      'INVALID_SERVICE_CATEGORIES',
    );
  }

  const returningFromRejection =
    vendor.verificationStatus === VendorVerificationStatus.REJECTED;

  await prisma.$transaction([
    prisma.vendorCategory.deleteMany({
      where: {
        vendorId: vendor.id,
      },
    }),
    prisma.vendorCategory.createMany({
      data: input.categoryIds.map((categoryId) => ({
        vendorId: vendor.id,
        categoryId,
      })),
    }),
    prisma.vendorProfile.update({
      where: {
        id: vendor.id,
      },
      data: {
        ...(returningFromRejection && {
          verificationStatus: VendorVerificationStatus.DRAFT,
          submittedAt: null,
          reviewedAt: null,
          rejectionReason: null,
        }),
      },
    }),
  ]);

  const updatedVendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: vendorProfileSelect,
  });

  if (!updatedVendor) {
    throw new AppError(
      404,
      'Vendor profile not found',
      'VENDOR_PROFILE_NOT_FOUND',
    );
  }

  return {
    profile: formatVendorProfile(updatedVendor),
    completion: calculateProfileCompletion(updatedVendor),
  };
};

export const submitVendorOnboardingProfile = async (
  userId: string,
) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId },
    select: vendorProfileSelect,
  });

  if (!vendor) {
    throw new AppError(
      404,
      'Vendor profile not found',
      'VENDOR_PROFILE_NOT_FOUND',
    );
  }

  if (
    vendor.verificationStatus !== VendorVerificationStatus.DRAFT
  ) {
    throw new AppError(
      409,
      'Only a draft vendor profile can be submitted for review',
      'VENDOR_PROFILE_NOT_SUBMITTABLE',
    );
  }

  const completion = calculateProfileCompletion(vendor);

  if (completion.percentage !== 100) {
    const incompleteFields = Object.entries(completion.fields)
      .filter(([, completed]) => !completed)
      .map(([field]) => field);

    throw new AppError(
      400,
      'Complete all required onboarding fields before submitting',
      'VENDOR_PROFILE_INCOMPLETE',
      {
        completion,
        incompleteFields,
      },
    );
  }

  const submittedVendor = await prisma.vendorProfile.update({
    where: { userId },
    data: {
      verificationStatus: VendorVerificationStatus.PENDING,
      submittedAt: new Date(),
      reviewedAt: null,
      rejectionReason: null,
    },
    select: vendorProfileSelect,
  });

  return {
    profile: formatVendorProfile(submittedVendor),
    completion: calculateProfileCompletion(submittedVendor),
  };
};