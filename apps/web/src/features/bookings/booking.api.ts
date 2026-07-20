import { api } from '../../lib/api';

export const bookingStatuses = [
  'AWAITING_VENDOR_CONFIRMATION',
  'CONFIRMED',
  'DEPOSIT_PENDING',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'DISPUTED',
] as const;

export const bookingSortOptions = [
  'newest',
  'oldest',
  'service_soonest',
  'service_latest',
] as const;

export type BookingStatus = (typeof bookingStatuses)[number];

export type BookingSort = (typeof bookingSortOptions)[number];

export type EventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type QuotationRequestStatus =
  | 'SENT'
  | 'VIEWED'
  | 'CLARIFICATION_REQUESTED'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CLOSED';

export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'CLARIFICATION_REQUESTED'
  | 'REVISED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED';

export type BookingOwner = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
};

export type BookingEvent = {
  id: string;
  name: string;
  eventType: string;
  eventDate: string;
  location: string | null;
  status: EventStatus;
  owner: BookingOwner;
};

export type BookingVendor = {
  id: string;
  businessName: string;
  slug: string;
  baseLocation: string | null;
  contactPhone: string | null;
};

export type BookingCategory = {
  id: string;
  name: string;
  slug: string;
};

export type BookingPackage = {
  id: string;
  title: string;
  description: string | null;
  basePrice: string | null;
  category: BookingCategory | null;
};

export type BookingQuotationRequest = {
  id: string;
  requirements: string;
  status: QuotationRequestStatus;
  package: BookingPackage | null;
};

export type BookingAcceptedQuotation = {
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
  quotationRequest: BookingQuotationRequest;
};

export type CustomerBooking = {
  id: string;
  agreedCost: string;
  serviceStart: string;
  serviceEnd: string | null;
  status: BookingStatus;

  vendorResponseNote: string | null;
  vendorRespondedAt: string | null;

  customerCancellationReason: string | null;
  customerCancelledAt: string | null;

  vendorCancellationReason: string | null;
  vendorCancelledAt: string | null;

  vendorCompletedAt: string | null;

  event: BookingEvent;
  vendor: BookingVendor;
  acceptedQuotation: BookingAcceptedQuotation;

  createdAt: string;
  updatedAt: string;
};

export type VendorBooking = CustomerBooking;

export type CustomerBookingReview = {
  id: string;
  bookingId: string;
  customerId: string;
  vendorId: string;
  packageId: string | null;

  overallRating: number;
  serviceRating: number | null;
  communicationRating: number | null;
  comment: string | null;

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

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type GetCustomerBookingsParams = {
  eventId?: string;
  status?: BookingStatus;
  page?: number;
  limit?: number;
  sort?: BookingSort;
};

export type GetVendorBookingsParams = {
  status?: BookingStatus;
  page?: number;
  limit?: number;
  sort?: BookingSort;
};

export type CreateCustomerBookingInput = {
  quotationId: string;
  serviceStart: string;
  serviceEnd?: string | null;
};

export type CancelCustomerBookingInput = {
  reason: string;
};

export type ConfirmVendorBookingInput = {
  note?: string | null;
};

export type RejectVendorBookingInput = {
  reason: string;
};

export type CancelVendorBookingInput = {
  reason: string;
};

export type CreateCustomerBookingReviewInput = {
  overallRating: number;
  serviceRating?: number | null;
  communicationRating?: number | null;
  comment?: string | null;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type BookingListResponse<TBooking> = ApiSuccessResponse<TBooking[]> & {
  meta: {
    pagination: Pagination;
  };
};

export async function getCustomerBookings(params: GetCustomerBookingsParams = {}) {
  const response = await api.get<BookingListResponse<CustomerBooking>>('/bookings/customer', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sort: params.sort ?? 'newest',

      ...(params.eventId && {
        eventId: params.eventId,
      }),

      ...(params.status && {
        status: params.status,
      }),
    },
  });

  return {
    bookings: response.data.data,
    pagination: response.data.meta.pagination,
  };
}

export async function getCustomerBookingById(bookingId: string) {
  const response = await api.get<ApiSuccessResponse<CustomerBooking>>(
    `/bookings/customer/${bookingId}`,
  );

  return response.data.data;
}

export async function createCustomerBooking(input: CreateCustomerBookingInput) {
  const response = await api.post<ApiSuccessResponse<CustomerBooking>>('/bookings', input);

  return response.data.data;
}

export async function cancelCustomerBooking(bookingId: string, input: CancelCustomerBookingInput) {
  const response = await api.patch<ApiSuccessResponse<CustomerBooking>>(
    `/bookings/customer/${bookingId}/cancel`,
    input,
  );

  return response.data.data;
}

export async function createCustomerBookingReview(
  bookingId: string,
  input: CreateCustomerBookingReviewInput,
) {
  const response = await api.post<ApiSuccessResponse<CustomerBookingReview>>(
    `/bookings/customer/${bookingId}/review`,
    input,
  );

  return response.data.data;
}

export async function getVendorBookings(params: GetVendorBookingsParams = {}) {
  const response = await api.get<BookingListResponse<VendorBooking>>('/bookings/vendor/incoming', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sort: params.sort ?? 'newest',

      ...(params.status && {
        status: params.status,
      }),
    },
  });

  return {
    bookings: response.data.data,
    pagination: response.data.meta.pagination,
  };
}

export async function getVendorBookingById(bookingId: string) {
  const response = await api.get<ApiSuccessResponse<VendorBooking>>(
    `/bookings/vendor/incoming/${bookingId}`,
  );

  return response.data.data;
}

export async function confirmVendorBooking(
  bookingId: string,
  input: ConfirmVendorBookingInput = {},
) {
  const response = await api.patch<ApiSuccessResponse<VendorBooking>>(
    `/bookings/vendor/incoming/${bookingId}/confirm`,
    input,
  );

  return response.data.data;
}

export async function rejectVendorBooking(bookingId: string, input: RejectVendorBookingInput) {
  const response = await api.patch<ApiSuccessResponse<VendorBooking>>(
    `/bookings/vendor/incoming/${bookingId}/reject`,
    input,
  );

  return response.data.data;
}

export async function cancelVendorBooking(bookingId: string, input: CancelVendorBookingInput) {
  const response = await api.patch<ApiSuccessResponse<VendorBooking>>(
    `/bookings/vendor/incoming/${bookingId}/cancel`,
    input,
  );

  return response.data.data;
}

export async function completeVendorBooking(bookingId: string) {
  const response = await api.patch<ApiSuccessResponse<VendorBooking>>(
    `/bookings/vendor/incoming/${bookingId}/complete`,
  );

  return response.data.data;
}
