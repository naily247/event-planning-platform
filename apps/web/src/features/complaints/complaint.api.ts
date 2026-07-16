import { api } from '../../lib/api';

export const complaintTypes = [
  'BOOKING',
  'PAYMENT',
  'REVIEW',
  'QUOTATION',
  'USER_CONDUCT',
  'PLATFORM',
  'OTHER',
] as const;

export const complaintStatuses = [
  'OPEN',
  'UNDER_REVIEW',
  'AWAITING_CUSTOMER_RESPONSE',
  'AWAITING_VENDOR_RESPONSE',
  'UNDER_INVESTIGATION',
  'RESOLVED',
  'DISMISSED',
  'CLOSED',
] as const;

export const complaintPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const complaintSortOptions = [
  'newest',
  'oldest',
  'priority_highest',
  'priority_lowest',
] as const;

export const complaintActionTypes = [
  'CREATED',
  'STATUS_CHANGED',
  'PRIORITY_CHANGED',
  'ASSIGNED',
  'UNASSIGNED',
  'RESOLVED',
  'DISMISSED',
  'CLOSED',
  'REOPENED',
] as const;

export type ComplaintType = (typeof complaintTypes)[number];

export type ComplaintStatus = (typeof complaintStatuses)[number];

export type ComplaintPriority = (typeof complaintPriorities)[number];

export type ComplaintSort = (typeof complaintSortOptions)[number];

export type ComplaintActionType = (typeof complaintActionTypes)[number];

export type ComplaintUserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN';

export type ComplaintParty = {
  id: string;
  firstName: string;
  lastName: string;
  role: ComplaintUserRole;

  vendor: {
    id: string;
    businessName: string;
    slug: string;
  } | null;
};

export type ComplaintAssignedAdmin = {
  id: string;
  firstName: string;
  lastName: string;
};

export type ComplaintBooking = {
  id: string;
  status:
    | 'AWAITING_VENDOR_CONFIRMATION'
    | 'CONFIRMED'
    | 'DEPOSIT_PENDING'
    | 'ACTIVE'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'REJECTED'
    | 'DISPUTED';

  agreedCost: string;
  serviceStart: string;
  serviceEnd: string | null;

  event: {
    id: string;
    name: string;
    eventType: string;
    eventDate: string;
    location: string;
    ownerId: string;
  };

  vendor: {
    id: string;
    userId: string;
    businessName: string;
    slug: string;
  };
};

export type ComplaintPayment = {
  id: string;
  bookingId: string;
  amount: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

  method: 'BANK_TRANSFER' | 'STRIPE_CHECKOUT';
  referenceNumber: string;
  createdAt: string;
};

export type ComplaintReview = {
  id: string;
  bookingId: string;
  customerId: string;
  vendorId: string;
  overallRating: number;
  comment: string | null;
  isHidden: boolean;
  createdAt: string;

  vendor: {
    id: string;
    userId: string;
    businessName: string;
    slug: string;
  };
};

export type ComplaintQuotationRequest = {
  id: string;

  status:
    | 'SENT'
    | 'VIEWED'
    | 'CLARIFICATION_REQUESTED'
    | 'QUOTED'
    | 'ACCEPTED'
    | 'DECLINED'
    | 'CLOSED';

  requirements: string;
  responseDueAt: string | null;

  event: {
    id: string;
    name: string;
    eventType: string;
    eventDate: string;
    ownerId: string;
  };

  vendor: {
    id: string;
    userId: string;
    businessName: string;
    slug: string;
  };
};

export type CustomerComplaint = {
  id: string;
  complainantId: string;
  respondentId: string | null;
  assignedAdminId: string | null;

  type: ComplaintType;
  subject: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;

  bookingId: string | null;
  paymentId: string | null;
  reviewId: string | null;
  quotationRequestId: string | null;

  resolutionSummary: string | null;
  resolvedAt: string | null;
  closedAt: string | null;

  complainant: ComplaintParty;
  respondent: ComplaintParty | null;
  assignedAdmin: ComplaintAssignedAdmin | null;

  booking: ComplaintBooking | null;
  payment: ComplaintPayment | null;
  review: ComplaintReview | null;
  quotationRequest: ComplaintQuotationRequest | null;

  createdAt: string;
  updatedAt: string;
};

export type ComplaintMessage = {
  id: string;
  complaintId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: ComplaintParty;
};

export type ComplaintAction = {
  id: string;
  complaintId: string;
  performedById: string | null;
  action: ComplaintActionType;
  reason: string | null;
  metadata: unknown;
  createdAt: string;
  performedBy: ComplaintParty | null;
};

export type CustomerComplaintDetail = CustomerComplaint & {
  messages: ComplaintMessage[];
  actions: ComplaintAction[];
};

export type ComplaintPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type GetMyComplaintsParams = {
  page?: number;
  limit?: number;
  eventId?: string;
  status?: ComplaintStatus;
  type?: ComplaintType;
  sort?: ComplaintSort;
};

type CommonCreateComplaintInput = {
  subject: string;
  description: string;
};

export type CreateBookingComplaintInput = CommonCreateComplaintInput & {
  type: 'BOOKING';
  bookingId: string;
};

export type CreatePaymentComplaintInput = CommonCreateComplaintInput & {
  type: 'PAYMENT';
  paymentId: string;
};

export type CreateReviewComplaintInput = CommonCreateComplaintInput & {
  type: 'REVIEW';
  reviewId: string;
};

export type CreateQuotationComplaintInput = CommonCreateComplaintInput & {
  type: 'QUOTATION';
  quotationRequestId: string;
};

export type CreateUserConductComplaintInput = CommonCreateComplaintInput & {
  type: 'USER_CONDUCT';
  respondentId: string;
};

export type CreatePlatformComplaintInput = CommonCreateComplaintInput & {
  type: 'PLATFORM';
};

export type CreateOtherComplaintInput = CommonCreateComplaintInput & {
  type: 'OTHER';
  respondentId?: string;
};

export type CreateComplaintInput =
  | CreateBookingComplaintInput
  | CreatePaymentComplaintInput
  | CreateReviewComplaintInput
  | CreateQuotationComplaintInput
  | CreateUserConductComplaintInput
  | CreatePlatformComplaintInput
  | CreateOtherComplaintInput;

export type AddComplaintMessageInput = {
  body: string;
};

export type CloseComplaintInput = {
  reason?: string;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type ComplaintListResponse = ApiSuccessResponse<CustomerComplaint[]> & {
  meta: {
    pagination: ComplaintPagination;
  };
};

export async function createComplaint(input: CreateComplaintInput) {
  const response = await api.post<ApiSuccessResponse<CustomerComplaint>>('/complaints', input);

  return response.data.data;
}

export async function getMyComplaints(params: GetMyComplaintsParams = {}) {
  const response = await api.get<ComplaintListResponse>('/complaints/me', {
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

      ...(params.type && {
        type: params.type,
      }),
    },
  });

  return {
    complaints: response.data.data,
    pagination: response.data.meta.pagination,
  };
}

export async function getComplaintById(complaintId: string) {
  const response = await api.get<ApiSuccessResponse<CustomerComplaintDetail>>(
    `/complaints/${complaintId}`,
  );

  return response.data.data;
}

export async function addComplaintMessage(complaintId: string, input: AddComplaintMessageInput) {
  const response = await api.post<ApiSuccessResponse<ComplaintMessage>>(
    `/complaints/${complaintId}/messages`,
    input,
  );

  return response.data.data;
}

export async function closeComplaint(complaintId: string, input: CloseComplaintInput) {
  const response = await api.patch<ApiSuccessResponse<CustomerComplaint>>(
    `/complaints/${complaintId}/close`,
    input,
  );

  return response.data.data;
}
