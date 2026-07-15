import { api } from '../../lib/api';

export const reviewSortOptions = ['newest', 'oldest', 'rating_highest', 'rating_lowest'] as const;

export type ReviewSort = (typeof reviewSortOptions)[number];

export type CustomerReview = {
  id: string;
  bookingId: string;
  customerId: string;
  vendorId: string;
  packageId: string | null;

  overallRating: number;
  serviceRating: number | null;
  communicationRating: number | null;
  comment: string | null;

  isHidden: boolean;
  moderationReason: string | null;
  moderatedAt: string | null;

  booking: {
    event: {
      id: string;
      name: string;
      eventDate: string;
    };
  };

  customer: {
    id: string;
    firstName: string;
    lastName: string;
  };

  vendor: {
    id: string;
    businessName: string;
    slug: string;
  };

  package: {
    id: string;
    title: string;
  } | null;

  createdAt: string;
  updatedAt: string;
};

export type ReviewPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type GetCustomerReviewsParams = {
  page?: number;
  limit?: number;
  vendorId?: string;
  overallRating?: number;
  sort?: ReviewSort;
  eventId?: string;
};

export type UpdateCustomerReviewInput = {
  overallRating?: number;
  serviceRating?: number | null;
  communicationRating?: number | null;
  comment?: string | null;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type CustomerReviewListResponse = ApiSuccessResponse<CustomerReview[]> & {
  meta: {
    pagination: ReviewPagination;
  };
};

export async function getCustomerReviews(params: GetCustomerReviewsParams = {}) {
  const response = await api.get<CustomerReviewListResponse>('/reviews/me', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sort: params.sort ?? 'newest',

      ...(params.vendorId && {
        vendorId: params.vendorId,
      }),

      ...(params.overallRating !== undefined && {
        overallRating: params.overallRating,
      }),

      ...(params.eventId && {
        eventId: params.eventId,
      }),
    },
  });

  return {
    reviews: response.data.data,
    pagination: response.data.meta.pagination,
  };
}

export async function getCustomerReviewById(reviewId: string) {
  const response = await api.get<ApiSuccessResponse<CustomerReview>>(`/reviews/${reviewId}`);

  return response.data.data;
}

export async function updateCustomerReview(reviewId: string, input: UpdateCustomerReviewInput) {
  const response = await api.patch<ApiSuccessResponse<CustomerReview>>(
    `/reviews/${reviewId}`,
    input,
  );

  return response.data.data;
}

export async function deleteCustomerReview(reviewId: string) {
  await api.delete(`/reviews/${reviewId}`);
}
