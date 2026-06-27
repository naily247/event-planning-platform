import { VendorVerificationStatus } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type { UpdateVendorProfileInput } from './vendor.schemas.js';

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
  createdAt: true,
  updatedAt: true,
} as const;

type VendorProfileDetails = {
  businessName: string;
  description: string | null;
  contactPhone: string | null;
  baseLocation: string | null;
  serviceAreas: string[];
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
    profile: vendor,
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

  if (
    existingVendor.verificationStatus ===
      VendorVerificationStatus.PENDING ||
    existingVendor.verificationStatus ===
      VendorVerificationStatus.APPROVED
  ) {
    throw new AppError(
      409,
      'This vendor profile cannot be edited in its current verification state',
      'VENDOR_PROFILE_LOCKED',
    );
  }

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
    profile: vendor,
    completion: calculateProfileCompletion(vendor),
  };
};
