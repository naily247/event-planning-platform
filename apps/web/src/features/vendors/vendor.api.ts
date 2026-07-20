import { api } from '../../lib/api';

export const vendorVerificationStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] as const;

export type VendorVerificationStatus = (typeof vendorVerificationStatuses)[number];

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

export type VendorOnboardingProfile = {
  id: string;
  businessName: string;
  slug: string;
  description: string | null;
  contactPhone: string | null;
  website: string | null;
  baseLocation: string | null;
  serviceAreas: string[];
  verificationStatus: VendorVerificationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  categories: VendorCategory[];
  createdAt: string;
  updatedAt: string;
};

export type VendorProfileCompletionFields = {
  businessName: boolean;
  description: boolean;
  contactPhone: boolean;
  baseLocation: boolean;
  serviceAreas: boolean;
  categories: boolean;
};

export type VendorProfileCompletion = {
  percentage: number;
  completedFields: number;
  totalFields: number;
  fields: VendorProfileCompletionFields;
};

export type VendorOnboarding = {
  profile: VendorOnboardingProfile;
  completion: VendorProfileCompletion;
};

export type VendorPortfolioItem = {
  id: string;
  title: string | null;
  description: string | null;
  imageUrl: string;
  imagePublicId: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  displayOrder: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VendorAvailabilityBlock = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VendorAvailabilityBooking = {
  id: string;
  startsAt: string;
  endsAt: string;
  originalServiceEnd: string | null;
  status: 'CONFIRMED' | 'DEPOSIT_PENDING' | 'ACTIVE' | 'DISPUTED';
};

export type VendorAvailability = {
  range: {
    from: string;
    to: string;
  };
  blocks: VendorAvailabilityBlock[];
  bookings: VendorAvailabilityBooking[];
};

export type VendorPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export const vendorReviewSortOptions = [
  'newest',
  'oldest',
  'rating_highest',
  'rating_lowest',
] as const;

export type VendorReviewSort = (typeof vendorReviewSortOptions)[number];

export type VendorReview = {
  id: string;

  overallRating: number;
  serviceRating: number | null;
  communicationRating: number | null;

  comment: string | null;

  customer: {
    firstName: string;
    lastNameInitial: string | null;
  };

  package: {
    id: string;
    title: string;
  } | null;

  createdAt: string;
  updatedAt: string;
};

export type VendorReviewSummary = {
  totalReviews: number;

  averageOverallRating: number | null;

  averageServiceRating: number | null;

  averageCommunicationRating: number | null;

  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type GetVendorReviewsParams = {
  page?: number;
  limit?: number;
  sort?: VendorReviewSort;
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

export type GetVendorAvailabilityParams = {
  from: string;
  to: string;
};

export type UpdateVendorProfileInput = {
  businessName?: string;
  description?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  baseLocation?: string | null;
  serviceAreas?: string[];
};

export type UpdateVendorCategoriesInput = {
  categoryIds: string[];
};

export type CreateVendorAvailabilityBlockInput = {
  startsAt: string;
  endsAt: string;
  reason?: string | null;
};

export type UpdateVendorPortfolioItemInput = {
  title?: string | null;
  description?: string | null;
  displayOrder?: number;
  isFeatured?: boolean;
};

export type ReorderVendorPortfolioItemsInput = {
  items: Array<{
    portfolioItemId: string;
    displayOrder: number;
  }>;
};

export type UploadVendorPortfolioImageInput = {
  file: File;
  title?: string;
  description?: string;
  displayOrder?: number;
  isFeatured?: boolean;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

type PublicVendorsResponse = ApiSuccessResponse<PublicVendor[]> & {
  meta: {
    pagination: VendorPagination;
  };
};

type VendorReviewsResponse = ApiSuccessResponse<VendorReview[]> & {
  meta: {
    summary: VendorReviewSummary;
    pagination: VendorPagination;
  };
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
  const response = await api.get<ApiSuccessResponse<PublicVendor>>(`/vendors/${vendorSlug}`);

  return response.data.data;
}

export async function getVendorOnboardingProfile() {
  const response = await api.get<ApiSuccessResponse<VendorOnboarding>>('/vendors/me/onboarding');

  return response.data.data;
}

export async function updateVendorOnboardingProfile(input: UpdateVendorProfileInput) {
  const response = await api.patch<ApiSuccessResponse<VendorOnboarding>>(
    '/vendors/me/onboarding',
    input,
  );

  return response.data.data;
}

export async function updateVendorCategories(input: UpdateVendorCategoriesInput) {
  const response = await api.put<ApiSuccessResponse<VendorOnboarding>>(
    '/vendors/me/onboarding/categories',
    input,
  );

  return response.data.data;
}

export async function submitVendorOnboardingProfile() {
  const response = await api.post<ApiSuccessResponse<VendorOnboarding>>(
    '/vendors/me/onboarding/submit',
  );

  return response.data.data;
}

export async function getVendorAvailability(params: GetVendorAvailabilityParams) {
  const response = await api.get<ApiSuccessResponse<VendorAvailability>>(
    '/vendors/me/availability',
    {
      params,
    },
  );

  return response.data.data;
}

export async function createVendorAvailabilityBlock(input: CreateVendorAvailabilityBlockInput) {
  const response = await api.post<ApiSuccessResponse<VendorAvailabilityBlock>>(
    '/vendors/me/availability/blocks',
    input,
  );

  return response.data.data;
}

export async function deleteVendorAvailabilityBlock(blockId: string) {
  await api.delete(`/vendors/me/availability/blocks/${blockId}`);
}

export async function getVendorPortfolio() {
  const response =
    await api.get<ApiSuccessResponse<VendorPortfolioItem[]>>('/vendors/me/portfolio');

  return response.data.data;
}

export async function uploadVendorPortfolioImage(input: UploadVendorPortfolioImageInput) {
  const formData = new FormData();

  formData.append('file', input.file);

  if (input.title?.trim()) {
    formData.append('title', input.title.trim());
  }

  if (input.description?.trim()) {
    formData.append('description', input.description.trim());
  }

  formData.append('displayOrder', String(input.displayOrder ?? 0));
  formData.append('isFeatured', String(input.isFeatured ?? false));

  const response = await api.post<ApiSuccessResponse<VendorPortfolioItem>>(
    '/vendors/me/portfolio/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data.data;
}

export async function updateVendorPortfolioItem(
  portfolioItemId: string,
  input: UpdateVendorPortfolioItemInput,
) {
  const response = await api.patch<ApiSuccessResponse<VendorPortfolioItem>>(
    `/vendors/me/portfolio/${portfolioItemId}`,
    input,
  );

  return response.data.data;
}

export async function reorderVendorPortfolioItems(input: ReorderVendorPortfolioItemsInput) {
  const response = await api.patch<ApiSuccessResponse<VendorPortfolioItem[]>>(
    '/vendors/me/portfolio/reorder',
    input,
  );

  return response.data.data;
}

export async function deleteVendorPortfolioItem(portfolioItemId: string) {
  await api.delete(`/vendors/me/portfolio/${portfolioItemId}`);
}

export async function getPublicVendorReviews(
  vendorSlug: string,
  params: GetVendorReviewsParams = {},
) {
  const response = await api.get<VendorReviewsResponse>(`/vendors/${vendorSlug}/reviews`, {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      sort: params.sort ?? 'newest',
    },
  });

  return {
    reviews: response.data.data,
    summary: response.data.meta.summary,
    pagination: response.data.meta.pagination,
  };
}
