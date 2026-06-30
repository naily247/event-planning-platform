import { Prisma, VendorVerificationStatus } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  CreateServicePackageInput,
  GetPublicPackagesQuery,
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

const formatServicePackage = (servicePackage: SelectedServicePackage) => ({
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
    throw new AppError(404, 'Vendor profile not found', 'VENDOR_PROFILE_NOT_FOUND');
  }

  return vendor;
};

const ensureVendorCategory = async (vendorId: string, categoryId: string) => {
  const vendorCategory = await prisma.vendorCategory.findUnique({
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

const ensureCanActivatePackage = (verificationStatus: VendorVerificationStatus) => {
  if (verificationStatus !== VendorVerificationStatus.APPROVED) {
    throw new AppError(
      409,
      'Only approved vendors can activate service packages',
      'VENDOR_NOT_APPROVED_FOR_ACTIVE_PACKAGE',
    );
  }
};

const getOwnedServicePackage = async (userId: string, packageId: string) => {
  const servicePackage = await prisma.servicePackage.findFirst({
    where: {
      id: packageId,
      vendor: {
        userId,
      },
    },
    select: servicePackageSelect,
  });

  if (!servicePackage) {
    throw new AppError(404, 'Service package not found', 'SERVICE_PACKAGE_NOT_FOUND');
  }

  return servicePackage;
};

export const createServicePackage = async (userId: string, input: CreateServicePackageInput) => {
  const vendor = await getVendorProfile(userId);

  await ensureVendorCategory(vendor.id, input.categoryId);

  if (input.isActive) {
    ensureCanActivatePackage(vendor.verificationStatus);
  }

  const servicePackage = await prisma.servicePackage.create({
    data: {
      vendorId: vendor.id,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description ?? null,
      basePrice:
        input.basePrice === null || input.basePrice === undefined
          ? null
          : new Prisma.Decimal(input.basePrice),
      isActive: input.isActive,
    },
    select: servicePackageSelect,
  });

  return formatServicePackage(servicePackage);
};

export const getVendorServicePackages = async (userId: string, query: GetVendorPackagesQuery) => {
  const vendor = await getVendorProfile(userId);

  const servicePackages = await prisma.servicePackage.findMany({
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

export const getVendorServicePackageById = async (userId: string, packageId: string) => {
  const servicePackage = await getOwnedServicePackage(userId, packageId);

  return formatServicePackage(servicePackage);
};

export const updateServicePackage = async (
  userId: string,
  packageId: string,
  input: UpdateServicePackageInput,
) => {
  const vendor = await getVendorProfile(userId);

  const existingPackage = await prisma.servicePackage.findFirst({
    where: {
      id: packageId,
      vendorId: vendor.id,
    },
    select: {
      id: true,
    },
  });

  if (!existingPackage) {
    throw new AppError(404, 'Service package not found', 'SERVICE_PACKAGE_NOT_FOUND');
  }

  if (input.categoryId) {
    await ensureVendorCategory(vendor.id, input.categoryId);
  }

  const servicePackage = await prisma.servicePackage.update({
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
        basePrice: input.basePrice === null ? null : new Prisma.Decimal(input.basePrice),
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

  const existingPackage = await prisma.servicePackage.findFirst({
    where: {
      id: packageId,
      vendorId: vendor.id,
    },
    select: {
      id: true,
    },
  });

  if (!existingPackage) {
    throw new AppError(404, 'Service package not found', 'SERVICE_PACKAGE_NOT_FOUND');
  }

  if (input.isActive) {
    ensureCanActivatePackage(vendor.verificationStatus);
  }

  const servicePackage = await prisma.servicePackage.update({
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

export const deleteServicePackage = async (userId: string, packageId: string) => {
  const vendor = await getVendorProfile(userId);

  const servicePackage = await prisma.servicePackage.findFirst({
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
    throw new AppError(404, 'Service package not found', 'SERVICE_PACKAGE_NOT_FOUND');
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

const publicServicePackageSelect = {
  id: true,
  title: true,
  description: true,
  basePrice: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
      baseLocation: true,
      serviceAreas: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

type PublicServicePackage = Prisma.ServicePackageGetPayload<{
  select: typeof publicServicePackageSelect;
}>;

const formatPublicServicePackage = (servicePackage: PublicServicePackage) => ({
  ...servicePackage,
  basePrice: servicePackage.basePrice?.toFixed(2) ?? null,
});

const getPublicServicePackageOrderBy = (
  sort: GetPublicPackagesQuery['sort'],
): Prisma.ServicePackageOrderByWithRelationInput => {
  switch (sort) {
    case 'oldest':
      return {
        createdAt: 'asc',
      };

    case 'price_asc':
      return {
        basePrice: 'asc',
      };

    case 'price_desc':
      return {
        basePrice: 'desc',
      };

    case 'title_asc':
      return {
        title: 'asc',
      };

    case 'title_desc':
      return {
        title: 'desc',
      };

    case 'newest':
    default:
      return {
        createdAt: 'desc',
      };
  }
};

export const getPublicServicePackages = async (query: GetPublicPackagesQuery) => {
  const { search, category, location, serviceArea, minPrice, maxPrice, page, limit, sort } = query;

  const where: Prisma.ServicePackageWhereInput = {
    isActive: true,

    vendor: {
      verificationStatus: VendorVerificationStatus.APPROVED,

      ...(location && {
        baseLocation: {
          contains: location,
          mode: 'insensitive',
        },
      }),

      ...(serviceArea && {
        serviceAreas: {
          has: serviceArea,
        },
      }),
    },

    ...(search && {
      OR: [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          vendor: {
            businessName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ],
    }),

    ...(category && {
      category: {
        slug: category,
      },
    }),

    ...((minPrice !== undefined || maxPrice !== undefined) && {
      basePrice: {
        ...(minPrice !== undefined && {
          gte: new Prisma.Decimal(minPrice),
        }),
        ...(maxPrice !== undefined && {
          lte: new Prisma.Decimal(maxPrice),
        }),
      },
    }),
  };

  const skip = (page - 1) * limit;

  const [servicePackages, total] = await prisma.$transaction([
    prisma.servicePackage.findMany({
      where,
      select: publicServicePackageSelect,
      orderBy: getPublicServicePackageOrderBy(sort),
      skip,
      take: limit,
    }),
    prisma.servicePackage.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    packages: servicePackages.map(formatPublicServicePackage),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

export const getPublicServicePackageById = async (packageId: string) => {
  const servicePackage = await prisma.servicePackage.findFirst({
    where: {
      id: packageId,
      isActive: true,
      vendor: {
        verificationStatus: VendorVerificationStatus.APPROVED,
      },
    },
    select: publicServicePackageSelect,
  });

  if (!servicePackage) {
    throw new AppError(404, 'Service package not found', 'PUBLIC_SERVICE_PACKAGE_NOT_FOUND');
  }

  return formatPublicServicePackage(servicePackage);
};
