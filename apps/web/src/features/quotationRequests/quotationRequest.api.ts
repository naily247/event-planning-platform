import { api } from '../../lib/api';

export const quotationRequestStatuses = [
  'SENT',
  'VIEWED',
  'CLARIFICATION_REQUESTED',
  'QUOTED',
  'ACCEPTED',
  'DECLINED',
  'CLOSED',
] as const;

export const quotationStatuses = [
  'DRAFT',
  'SENT',
  'VIEWED',
  'CLARIFICATION_REQUESTED',
  'REVISED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'EXPIRED',
] as const;

export const quotationRequestSortOptions = ['newest', 'oldest'] as const;

export type QuotationRequestStatus = (typeof quotationRequestStatuses)[number];

export type QuotationStatus = (typeof quotationStatuses)[number];

export type QuotationRequestSort = (typeof quotationRequestSortOptions)[number];

export type EventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type QuotationCategory = {
  id: string;
  name: string;
  slug: string;
};

export type QuotationPackage = {
  id: string;
  title: string;
  description: string | null;
  basePrice: string | null;
  category: QuotationCategory | null;
};

export type QuotationVendor = {
  id: string;
  businessName: string;
  slug: string;
  baseLocation: string | null;
};

export type QuotationOwner = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
};

export type QuotationEvent = {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  location: string | null;
  status: EventStatus;
  owner: QuotationOwner;
};

export type CustomerQuotationRequest = {
  id: string;
  requirements: string;
  responseDueAt: string | null;
  status: QuotationRequestStatus;

  event: QuotationEvent;
  vendor: QuotationVendor;
  package: QuotationPackage | null;

  createdAt: string;
  updatedAt: string;
};

export type CustomerQuotation = {
  id: string;
  quotationRequestId: string;
  version: number;
  status: QuotationStatus;

  proposedPrice: string;
  depositAmount: string | null;

  inclusions: string;
  exclusions: string | null;
  terms: string | null;

  expiresAt: string | null;

  createdAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type GetQuotationRequestsParams = {
  status?: QuotationRequestStatus;
  eventId?: string;
  page?: number;
  limit?: number;
  sort?: QuotationRequestSort;
};

export type CreateQuotationRequestInput = {
  eventId: string;
  packageId: string;
  requirements: string;
  responseDueAt?: string | null;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type QuotationRequestListResponse = ApiSuccessResponse<CustomerQuotationRequest[]> & {
  meta: {
    pagination: Pagination;
  };
};

export async function getQuotationRequests(params: GetQuotationRequestsParams = {}) {
  const response = await api.get<QuotationRequestListResponse>('/quotation-requests', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sort: params.sort ?? 'newest',

      ...(params.status && {
        status: params.status,
      }),

      ...(params.eventId && {
        eventId: params.eventId,
      }),
    },
  });

  return {
    quotationRequests: response.data.data,
    pagination: response.data.meta.pagination,
  };
}

export async function getQuotationRequestById(quotationRequestId: string) {
  const response = await api.get<ApiSuccessResponse<CustomerQuotationRequest>>(
    `/quotation-requests/${quotationRequestId}`,
  );

  return response.data.data;
}

export async function getQuotationRequestQuotations(quotationRequestId: string) {
  const response = await api.get<ApiSuccessResponse<CustomerQuotation[]>>(
    `/quotation-requests/${quotationRequestId}/quotations`,
  );

  return response.data.data;
}

export async function createQuotationRequest(input: CreateQuotationRequestInput) {
  const response = await api.post<ApiSuccessResponse<CustomerQuotationRequest>>(
    '/quotation-requests',
    input,
  );

  return response.data.data;
}

export async function acceptQuotation(quotationRequestId: string, quotationId: string) {
  const response = await api.post<ApiSuccessResponse<CustomerQuotation>>(
    `/quotation-requests/${quotationRequestId}/quotations/${quotationId}/accept`,
  );

  return response.data.data;
}
