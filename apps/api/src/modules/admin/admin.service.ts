import { VendorVerificationStatus } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type { RejectVendorApplicationInput } from './admin.schemas.js';

const pendingVendorSelect = {
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
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  rejectionReason: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
    },
  },
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
} as const;

const formatPendingVendor = <
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

export const getPendingVendorApplications = async () => {
  const vendors = await prisma.vendorProfile.findMany({
    where: {
      verificationStatus: VendorVerificationStatus.PENDING,
    },
    select: pendingVendorSelect,
    orderBy: {
      submittedAt: 'asc',
    },
  });

  return vendors.map(formatPendingVendor);
};

export const getVendorApplicationById = async (vendorId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      id: vendorId,
      verificationStatus: {
        not: VendorVerificationStatus.DRAFT,
      },
    },
    select: pendingVendorSelect,
  });

  if (!vendor) {
    throw new AppError(404, 'Vendor application not found', 'VENDOR_APPLICATION_NOT_FOUND');
  }

  return formatPendingVendor(vendor);
};

export const approveVendorApplication = async (vendorId: string) => {
  const existingVendor = await prisma.vendorProfile.findUnique({
    where: {
      id: vendorId,
    },
    select: {
      id: true,
      verificationStatus: true,
    },
  });

  if (!existingVendor) {
    throw new AppError(404, 'Vendor application not found', 'VENDOR_APPLICATION_NOT_FOUND');
  }

  if (existingVendor.verificationStatus !== VendorVerificationStatus.PENDING) {
    throw new AppError(
      409,
      'Only pending vendor applications can be approved',
      'VENDOR_APPLICATION_NOT_PENDING',
    );
  }

  const vendor = await prisma.vendorProfile.update({
    where: {
      id: vendorId,
    },
    data: {
      verificationStatus: VendorVerificationStatus.APPROVED,
      reviewedAt: new Date(),
      rejectionReason: null,
    },
    select: pendingVendorSelect,
  });

  return formatPendingVendor(vendor);
};

export const rejectVendorApplication = async (
  vendorId: string,
  input: RejectVendorApplicationInput,
) => {
  const existingVendor = await prisma.vendorProfile.findUnique({
    where: {
      id: vendorId,
    },
    select: {
      id: true,
      verificationStatus: true,
    },
  });

  if (!existingVendor) {
    throw new AppError(404, 'Vendor application not found', 'VENDOR_APPLICATION_NOT_FOUND');
  }

  if (existingVendor.verificationStatus !== VendorVerificationStatus.PENDING) {
    throw new AppError(
      409,
      'Only pending vendor applications can be rejected',
      'VENDOR_APPLICATION_NOT_PENDING',
    );
  }

  const vendor = await prisma.vendorProfile.update({
    where: {
      id: vendorId,
    },
    data: {
      verificationStatus: VendorVerificationStatus.REJECTED,
      reviewedAt: new Date(),
      rejectionReason: input.reason,
    },
    select: pendingVendorSelect,
  });

  return formatPendingVendor(vendor);
};
