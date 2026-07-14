import { api } from '../../lib/api';

export type VendorCategory = {
  id: string;
  name: string;
  slug: string;
};

export type PublicVendor = {
  id: string;
  businessName: string;
  slug: string;
  description: string | null;
  contactPhone: string | null;
  website: string | null;
  baseLocation: string | null;
  serviceAreas: string[];
  categories: VendorCategory[];
  createdAt: string;
  updatedAt: string;
  averageRating: number | null;
  reviewCount: number;
};

export type VendorPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type VendorSort =
  | 'name_asc'
  | 'name_desc'
  | 'newest'
  | 'oldest'
  | 'rating_highest'
  | 'rating_lowest';

export type GetVendorsParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  location?: string;
  serviceArea?: string;
  sort?: VendorSort;
};

type PublicVendorsResponse = {
  success: boolean;
  data: PublicVendor[];
  meta: {
    pagination: VendorPagination;
  };
};

type PublicVendorResponse = {
  success: boolean;
  data: PublicVendor;
};

export async function getPublicVendors(params: GetVendorsParams = {}) {
  const response = await api.get<PublicVendorsResponse>('/vendors', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 12,
      sort: params.sort ?? 'name_asc',

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
    },
  });

  return {
    vendors: response.data.data,
    pagination: response.data.meta.pagination,
  };
}

export async function getPublicVendorBySlug(vendorSlug: string) {
  const response = await api.get<PublicVendorResponse>(`/vendors/${vendorSlug}`);

  return response.data.data;
}
