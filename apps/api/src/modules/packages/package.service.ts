import {
  Prisma,
  VendorVerificationStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  CreateServicePackageInput,
  GetVendorPackagesQuery,
  UpdateServicePackageInput,
  UpdateServicePackageStatusInput,
} from './package.schemas.js';

const servicePackageSelect = {
  id: true,
  title: true,
  description: true,
  basePrice: true,
  isActive: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

type SelectedServicePackage = Prisma.ServicePackageGetPayload<{
  select: typeof servicePackageSelect;
}>;

const formatServicePackage = (
  servicePackage: SelectedServicePackage,
) => ({
  ...servicePackage,
  basePrice: servicePackage.basePrice?.toFixed(2) ?? null,
});

const getVendorProfile = async (userId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId,
    },
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

  return vendor;
};

const ensureVendorCategory = async (
  vendorId: string,
  categoryId: string,
) => {
  const vendorCategory =
    await prisma.vendorCategory.findUnique({
      where: {
        vendorId_categoryId: {
          vendorId,
          categoryId,
        },
      },
      select: {
        categoryId: true,
      },
    });

  if (!vendorCategory) {
    throw new AppError(
      400,
      'The selected category is not assigned to this vendor profile',
      'PACKAGE_CATEGORY_NOT_ASSIGNED',
    );
  }
};

const ensureCanActivatePackage = (
  verificationStatus: VendorVerificationStatus,
) => {
  if (
    verificationStatus !==
    VendorVerificationStatus.APPROVED
  ) {
    throw new AppError(
      409,
      'Only approved vendors can activate service packages',
      'VENDOR_NOT_APPROVED_FOR_ACTIVE_PACKAGE',
    );
  }
};

const getOwnedServicePackage = async (
  userId: string,
  packageId: string,
) => {
  const servicePackage =
    await prisma.servicePackage.findFirst({
      where: {
        id: packageId,
        vendor: {
          userId,
        },
      },
      select: servicePackageSelect,
    });

  if (!servicePackage) {
    throw new AppError(
      404,
      'Service package not found',
      'SERVICE_PACKAGE_NOT_FOUND',
    );
  }

  return servicePackage;
};

export const createServicePackage = async (
  userId: string,
  input: CreateServicePackageInput,
) => {
  const vendor = await getVendorProfile(userId);

  await ensureVendorCategory(vendor.id, input.categoryId);

  if (input.isActive) {
    ensureCanActivatePackage(vendor.verificationStatus);
  }

  const servicePackage =
    await prisma.servicePackage.create({
      data: {
        vendorId: vendor.id,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description ?? null,
        basePrice:
          input.basePrice === null ||
          input.basePrice === undefined
            ? null
            : new Prisma.Decimal(input.basePrice),
        isActive: input.isActive,
      },
      select: servicePackageSelect,
    });

  return formatServicePackage(servicePackage);
};

export const getVendorServicePackages = async (
  userId: string,
  query: GetVendorPackagesQuery,
) => {
  const vendor = await getVendorProfile(userId);

  const servicePackages =
    await prisma.servicePackage.findMany({
      where: {
        vendorId: vendor.id,
        ...(query.isActive !== undefined && {
          isActive: query.isActive,
        }),
      },
      select: servicePackageSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });

  return servicePackages.map(formatServicePackage);
};

export const getVendorServicePackageById = async (
  userId: string,
  packageId: string,
) => {
  const servicePackage = await getOwnedServicePackage(
    userId,
    packageId,
  );

  return formatServicePackage(servicePackage);
};

export const updateServicePackage = async (
  userId: string,
  packageId: string,
  input: UpdateServicePackageInput,
) => {
  const vendor = await getVendorProfile(userId);

  const existingPackage =
    await prisma.servicePackage.findFirst({
      where: {
        id: packageId,
        vendorId: vendor.id,
      },
      select: {
        id: true,
      },
    });

  if (!existingPackage) {
    throw new AppError(
      404,
      'Service package not found',
      'SERVICE_PACKAGE_NOT_FOUND',
    );
  }

  if (input.categoryId) {
    await ensureVendorCategory(
      vendor.id,
      input.categoryId,
    );
  }

  const servicePackage =
    await prisma.servicePackage.update({
      where: {
        id: packageId,
      },
      data: {
        ...(input.categoryId !== undefined && {
          categoryId: input.categoryId,
        }),
        ...(input.title !== undefined && {
          title: input.title,
        }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.basePrice !== undefined && {
          basePrice:
            input.basePrice === null
              ? null
              : new Prisma.Decimal(input.basePrice),
        }),
      },
      select: servicePackageSelect,
    });

  return formatServicePackage(servicePackage);
};

export const updateServicePackageStatus = async (
  userId: string,
  packageId: string,
  input: UpdateServicePackageStatusInput,
) => {
  const vendor = await getVendorProfile(userId);

  const existingPackage =
    await prisma.servicePackage.findFirst({
      where: {
        id: packageId,
        vendorId: vendor.id,
      },
      select: {
        id: true,
      },
    });

  if (!existingPackage) {
    throw new AppError(
      404,
      'Service package not found',
      'SERVICE_PACKAGE_NOT_FOUND',
    );
  }

  if (input.isActive) {
    ensureCanActivatePackage(vendor.verificationStatus);
  }

  const servicePackage =
    await prisma.servicePackage.update({
      where: {
        id: packageId,
      },
      data: {
        isActive: input.isActive,
      },
      select: servicePackageSelect,
    });

  return formatServicePackage(servicePackage);
};

export const deleteServicePackage = async (
  userId: string,
  packageId: string,
) => {
  const vendor = await getVendorProfile(userId);

  const servicePackage =
    await prisma.servicePackage.findFirst({
      where: {
        id: packageId,
        vendorId: vendor.id,
      },
      select: {
        id: true,
        _count: {
          select: {
            quotationRequests: true,
          },
        },
      },
    });

  if (!servicePackage) {
    throw new AppError(
      404,
      'Service package not found',
      'SERVICE_PACKAGE_NOT_FOUND',
    );
  }

  if (servicePackage._count.quotationRequests > 0) {
    throw new AppError(
      409,
      'A service package with quotation requests cannot be deleted',
      'SERVICE_PACKAGE_IN_USE',
    );
  }

  await prisma.servicePackage.delete({
    where: {
      id: packageId,
    },
  });
};