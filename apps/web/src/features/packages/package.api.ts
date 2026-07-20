import { api } from '../../lib/api';

export const publicPackageSortOptions = [
  'newest',
  'oldest',
  'price_asc',
  'price_desc',
  'title_asc',
  'title_desc',
] as const;

export type PublicPackageSort = (typeof publicPackageSortOptions)[number];

export type ServicePackageCategory = {
  id: string;
  name: string;
  slug: string;
};

export type VendorServicePackage = {
  id: string;
  title: string;
  description: string | null;
  basePrice: string | null;
  isActive: boolean;
  category: ServicePackageCategory;
  createdAt: string;
  updatedAt: string;
};

export type PublicServicePackageVendor = {
  id: string;
  businessName: string;
  slug: string;
  baseLocation: string | null;
  serviceAreas: string[];
};

export type PublicServicePackage = {
  id: string;
  title: string;
  description: string | null;
  basePrice: string | null;
  category: ServicePackageCategory;
  vendor: PublicServicePackageVendor;
  createdAt: string;
  updatedAt: string;
};

export type PackagePagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type GetVendorPackagesParams = {
  isActive?: boolean;
};

export type GetPublicPackagesParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  location?: string;
  serviceArea?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: PublicPackageSort;
};

export type CreateServicePackageInput = {
  categoryId: string;
  title: string;
  description?: string | null;
  basePrice?: number | null;
  isActive?: boolean;
};

export type UpdateServicePackageInput = {
  categoryId?: string;
  title?: string;
  description?: string | null;
  basePrice?: number | null;
};

export type UpdateServicePackageStatusInput = {
  isActive: boolean;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

type PublicPackagesResponse = ApiSuccessResponse<PublicServicePackage[]> & {
  meta: {
    pagination: PackagePagination;
  };
};

export async function getVendorPackages(params: GetVendorPackagesParams = {}) {
  const response = await api.get<ApiSuccessResponse<VendorServicePackage[]>>('/packages/me', {
    params: {
      ...(params.isActive !== undefined && {
        isActive: String(params.isActive),
      }),
    },
  });

  return response.data.data;
}

export async function getVendorPackageById(packageId: string) {
  const response = await api.get<ApiSuccessResponse<VendorServicePackage>>(
    `/packages/${packageId}/manage`,
  );

  return response.data.data;
}

export async function createServicePackage(input: CreateServicePackageInput) {
  const response = await api.post<ApiSuccessResponse<VendorServicePackage>>('/packages', input);

  return response.data.data;
}

export async function updateServicePackage(packageId: string, input: UpdateServicePackageInput) {
  const response = await api.patch<ApiSuccessResponse<VendorServicePackage>>(
    `/packages/${packageId}`,
    input,
  );

  return response.data.data;
}

export async function updateServicePackageStatus(
  packageId: string,
  input: UpdateServicePackageStatusInput,
) {
  const response = await api.patch<ApiSuccessResponse<VendorServicePackage>>(
    `/packages/${packageId}/status`,
    input,
  );

  return response.data.data;
}

export async function deleteServicePackage(packageId: string) {
  await api.delete(`/packages/${packageId}`);
}

export async function getPublicPackages(params: GetPublicPackagesParams = {}) {
  const response = await api.get<PublicPackagesResponse>('/packages', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 12,
      sort: params.sort ?? 'newest',

      ...(params.search?.trim() && {
        search: params.search.trim(),
      }),

      ...(params.category?.trim() && {
        category: params.category.trim(),
      }),

      ...(params.location?.trim() && {
        location: params.location.trim(),
      }),

      ...(params.serviceArea?.trim() && {
        serviceArea: params.serviceArea.trim(),
      }),

      ...(params.minPrice !== undefined && {
        minPrice: params.minPrice,
      }),

      ...(params.maxPrice !== undefined && {
        maxPrice: params.maxPrice,
      }),
    },
  });

  return {
    packages: response.data.data,
    pagination: response.data.meta.pagination,
  };
}

export async function getPublicPackageById(packageId: string) {
  const response = await api.get<ApiSuccessResponse<PublicServicePackage>>(
    `/packages/${packageId}`,
  );

  return response.data.data;
}
