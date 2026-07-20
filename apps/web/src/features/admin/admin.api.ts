import { api } from '../../lib/api';

export type AdminUserRole = 'CUSTOMER' | 'VENDOR' | 'ADMIN';

export type AdminAccountStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DEACTIVATED';

export type AdminVendorVerificationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type AdminEventStatus = 'DRAFT' | 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type AdminBookingStatus =
  | 'AWAITING_VENDOR_CONFIRMATION'
  | 'CONFIRMED'
  | 'DEPOSIT_PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'DISPUTED';

export type AdminPaymentStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type AdminPaymentMethod = 'BANK_TRANSFER' | 'STRIPE_CHECKOUT';

export type AdminComplaintType =
  | 'BOOKING'
  | 'PAYMENT'
  | 'REVIEW'
  | 'QUOTATION'
  | 'USER_CONDUCT'
  | 'PLATFORM'
  | 'OTHER';

export type AdminComplaintStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'AWAITING_CUSTOMER_RESPONSE'
  | 'AWAITING_VENDOR_RESPONSE'
  | 'UNDER_INVESTIGATION'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'CLOSED';

export type AdminComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const adminUserRoles = ['CUSTOMER', 'VENDOR', 'ADMIN'] as const;

export const adminAccountStatuses = [
  'ACTIVE',
  'PENDING_VERIFICATION',
  'SUSPENDED',
  'DEACTIVATED',
] as const;

export const adminUserSortOptions = [
  'newest',
  'oldest',
  'name_asc',
  'name_desc',
  'email_asc',
  'email_desc',
] as const;

export type AdminUserSort = (typeof adminUserSortOptions)[number];

export type AdminDashboardRecentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminUserRole;
  status: AdminAccountStatus;
  createdAt: string;
};

export type AdminDashboardRecentBooking = {
  id: string;
  status: AdminBookingStatus;
  agreedCost: string;
  serviceStart: string;
  createdAt: string;

  event: {
    id: string;
    name: string;
    eventDate: string;
  };

  vendor: {
    id: string;
    businessName: string;
    slug: string;
  };
};

export type AdminDashboardRecentPayment = {
  id: string;
  amount: string;
  status: AdminPaymentStatus;
  method: AdminPaymentMethod;
  referenceNumber: string;
  createdAt: string;

  booking: {
    id: string;

    event: {
      id: string;
      name: string;
    };

    vendor: {
      id: string;
      businessName: string;
      slug: string;
    };
  };

  submittedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
};

export type AdminDashboardRecentComplaint = {
  id: string;
  type: AdminComplaintType;
  subject: string;
  status: AdminComplaintStatus;
  priority: AdminComplaintPriority;
  createdAt: string;

  complainant: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: AdminUserRole;
  };

  respondent: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: AdminUserRole;
  } | null;

  assignedAdmin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
};

export type AdminDashboardSummary = {
  generatedAt: string;

  users: {
    total: number;

    byRole: {
      customers: number;
      vendors: number;
      admins: number;
    };

    byStatus: {
      active: number;
      pendingVerification: number;
      suspended: number;
      deactivated: number;
    };

    newThisMonth: number;
  };

  vendors: {
    total: number;
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
  };

  events: {
    total: number;
    draft: number;
    planning: number;
    active: number;
    completed: number;
    cancelled: number;
  };

  bookings: {
    total: number;
    awaitingVendorConfirmation: number;
    confirmed: number;
    depositPending: number;
    active: number;
    completed: number;
    cancelled: number;
    rejected: number;
    disputed: number;
  };

  payments: {
    total: number;
    pending: number;
    verified: number;
    rejected: number;
    cancelled: number;
    refunded: number;
    partiallyRefunded: number;
    totalVerifiedAmount: string;
  };

  complaints: {
    total: number;
    open: number;
    underReview: number;
    underInvestigation: number;
    awaitingResponse: number;
    awaitingCustomerResponse: number;
    awaitingVendorResponse: number;
    resolved: number;
    dismissed: number;
    closed: number;
    urgent: number;
    unassigned: number;
  };

  reviews: {
    total: number;
    visible: number;
    hidden: number;
    averageRating: number | null;
  };

  activity: {
    recentUsers: AdminDashboardRecentUser[];
    recentBookings: AdminDashboardRecentBooking[];
    recentPayments: AdminDashboardRecentPayment[];
    recentComplaints: AdminDashboardRecentComplaint[];
  };
};

export type GetAdminDashboardSummaryParams = {
  recentLimit?: number;
};

export type AdminVendorProfileSummary = {
  id: string;
  businessName: string;
  slug: string;
  verificationStatus: AdminVendorVerificationStatus;
};

export type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminUserRole;
  status: AdminAccountStatus;
  createdAt: string;
  updatedAt: string;
  vendorProfile: AdminVendorProfileSummary | null;
};

export type AdminUserDetail = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminUserRole;
  status: AdminAccountStatus;
  createdAt: string;
  updatedAt: string;

  customer: {
    id: string;
    phone: string;
    createdAt: string;
    updatedAt: string;
  } | null;

  vendorProfile: {
    id: string;
    businessName: string;
    slug: string;
    description: string | null;
    contactPhone: string | null;
    website: string | null;
    baseLocation: string | null;
    serviceAreas: string[];
    verificationStatus: AdminVendorVerificationStatus;
    submittedAt: string | null;
    reviewedAt: string | null;
    rejectionReason: string | null;
    createdAt: string;
    updatedAt: string;

    categories: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  } | null;

  _count: {
    createdEvents: number;
    customerReviews: number;
    moderatedReviews: number;
    reviewModerationActions: number;
    submittedPayments: number;
    reviewedPayments: number;
    notifications: number;
    submittedComplaints: number;
    receivedComplaints: number;
    assignedComplaints: number;
    complaintMessages: number;
    performedComplaintActions: number;
  };
};

export type AdminPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type GetAdminUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: AdminUserRole;
  status?: AdminAccountStatus;
  sort?: AdminUserSort;
};

export type UpdateAdminUserStatusInput = {
  status: 'ACTIVE' | 'SUSPENDED';
  reason?: string;
};

export type AdminVendorApplicationCategory = {
  id: string;
  name: string;
  slug: string;
};

export type AdminVendorApplicationUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: AdminAccountStatus;
  createdAt: string;
};

export type AdminVendorApplication = {
  id: string;
  businessName: string;
  slug: string;
  description: string | null;
  contactPhone: string | null;
  website: string | null;
  baseLocation: string | null;
  serviceAreas: string[];
  verificationStatus: AdminVendorVerificationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;

  user: AdminVendorApplicationUser;
  categories: AdminVendorApplicationCategory[];
};

export type RejectAdminVendorApplicationInput = {
  reason: string;
};

export const adminPaymentSortOptions = ['newest', 'oldest', 'amount_highest'] as const;

export type AdminPaymentSort = (typeof adminPaymentSortOptions)[number];

export type AdminPaymentPerson = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type AdminPayment = {
  id: string;
  bookingId: string;
  submittedById: string;
  reviewedById: string | null;

  amount: string;
  status: AdminPaymentStatus;
  method: AdminPaymentMethod;
  referenceNumber: string;

  proofFileUrl: string | null;
  proofFilePublicId: string | null;
  proofFileOriginalName: string | null;
  proofFileMimeType: string | null;
  proofFileSize: number | null;

  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;

  submittedBy: AdminPaymentPerson;
  reviewedBy: AdminPaymentPerson | null;

  booking: {
    id: string;
    status: AdminBookingStatus;
    agreedCost: string;
    serviceStart: string;
    serviceEnd: string | null;

    event: {
      id: string;
      name: string;
      eventType: string;
      eventDate: string;
      location: string | null;

      owner: AdminPaymentPerson;
    };

    vendor: {
      id: string;
      businessName: string;
      slug: string;
      contactPhone: string | null;
      baseLocation: string | null;
    };

    acceptedQuotation: {
      id: string;
      proposedPrice: string;
      depositAmount: string | null;
    };
  };
};

export type GetPendingAdminPaymentsParams = {
  page?: number;
  limit?: number;
  sort?: AdminPaymentSort;
};

export type RejectAdminPaymentInput = {
  reason: string;
};

export const adminReviewVisibilityOptions = ['all', 'visible', 'hidden'] as const;

export const adminReviewSortOptions = [
  'newest',
  'oldest',
  'rating_highest',
  'rating_lowest',
  'recently_moderated',
] as const;

export type AdminReviewVisibility = (typeof adminReviewVisibilityOptions)[number];

export type AdminReviewSort = (typeof adminReviewSortOptions)[number];

export type AdminReviewPerson = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type AdminReview = {
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

  createdAt: string;
  updatedAt: string;

  customer: AdminReviewPerson;

  vendor: {
    id: string;
    businessName: string;
    slug: string;
  };

  package: {
    id: string;
    title: string;
  } | null;

  moderatedBy: AdminReviewPerson | null;
};

export type AdminReviewModerationAction = {
  id: string;
  action: 'HIDDEN' | 'RESTORED';
  reason: string;
  createdAt: string;
  moderator: AdminReviewPerson;
};

export type AdminReviewDetail = AdminReview & {
  booking: {
    id: string;
    status: AdminBookingStatus;
    serviceStart: string;
    serviceEnd: string | null;
  };

  moderationActions: AdminReviewModerationAction[];
};

export type GetAdminReviewsParams = {
  page?: number;
  limit?: number;
  search?: string;
  vendorId?: string;
  customerId?: string;
  overallRating?: number;
  visibility?: AdminReviewVisibility;
  sort?: AdminReviewSort;
};

export type ModerateAdminReviewInput = {
  action: 'HIDE' | 'RESTORE';
  reason: string;
};

export const adminComplaintStatusOptions = [
  'OPEN',
  'UNDER_REVIEW',
  'AWAITING_CUSTOMER_RESPONSE',
  'AWAITING_VENDOR_RESPONSE',
  'UNDER_INVESTIGATION',
  'RESOLVED',
  'DISMISSED',
  'CLOSED',
] as const;

export const adminComplaintPriorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const adminComplaintSortOptions = [
  'newest',
  'oldest',
  'priority_highest',
  'priority_lowest',
] as const;

export type AdminComplaintSort = (typeof adminComplaintSortOptions)[number];

export type AdminComplaintPerson = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminUserRole;
};

export type AdminComplaint = {
  id: string;

  type: AdminComplaintType;
  subject: string;
  description: string;

  status: AdminComplaintStatus;
  priority: AdminComplaintPriority;

  resolutionSummary: string | null;
  resolvedAt: string | null;
  closedAt: string | null;

  createdAt: string;
  updatedAt: string;

  complainant: AdminComplaintPerson;

  respondent: AdminComplaintPerson | null;

  assignedAdmin: AdminComplaintPerson | null;
};

export type AdminComplaintMessage = {
  id: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;

  author: AdminComplaintPerson;
};

export type AdminComplaintAction = {
  id: string;
  action:
    | 'CREATED'
    | 'STATUS_CHANGED'
    | 'PRIORITY_CHANGED'
    | 'ASSIGNED'
    | 'UNASSIGNED'
    | 'RESOLVED'
    | 'DISMISSED'
    | 'CLOSED'
    | 'REOPENED';

  reason: string | null;

  metadata: unknown;

  createdAt: string;

  performedBy: AdminComplaintPerson | null;
};

export type AdminComplaintDetail = AdminComplaint & {
  messages: AdminComplaintMessage[];
  actions: AdminComplaintAction[];
};

export type GetAdminComplaintsParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: AdminComplaintType;
  status?: AdminComplaintStatus;
  priority?: AdminComplaintPriority;
  assignedAdminId?: string;
  sort?: AdminComplaintSort;
};

export type UpdateAdminComplaintStatusInput = {
  status:
    | 'UNDER_REVIEW'
    | 'UNDER_INVESTIGATION'
    | 'AWAITING_CUSTOMER_RESPONSE'
    | 'AWAITING_VENDOR_RESPONSE'
    | 'RESOLVED'
    | 'DISMISSED';

  reason: string;
  resolutionSummary?: string;
};

export type UpdateAdminComplaintPriorityInput = {
  priority: AdminComplaintPriority;
  reason: string;
};

export type UpdateAdminComplaintAssignmentInput = {
  assignedAdminId: string | null;
  reason: string;
};

export type ReopenAdminComplaintInput = {
  reason: string;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

type AdminUserListResponse = ApiSuccessResponse<AdminUser[]> & {
  meta: {
    pagination: AdminPagination;
  };
};

type AdminVendorApplicationListResponse = ApiSuccessResponse<AdminVendorApplication[]> & {
  meta: {
    count: number;
  };
};

type AdminPaymentListResponse = ApiSuccessResponse<AdminPayment[]> & {
  meta: {
    pagination: AdminPagination;
  };
};

type AdminReviewListResponse = ApiSuccessResponse<AdminReview[]> & {
  meta: {
    pagination: AdminPagination;
  };
};

type AdminComplaintListResponse = ApiSuccessResponse<AdminComplaint[]> & {
  meta: {
    pagination: AdminPagination;
  };
};

export async function getAdminDashboardSummary(params: GetAdminDashboardSummaryParams = {}) {
  const response = await api.get<ApiSuccessResponse<AdminDashboardSummary>>(
    '/admin/dashboard/summary',
    {
      params: {
        recentLimit: params.recentLimit ?? 5,
      },
    },
  );

  return response.data.data;
}

export async function getAdminUsers(params: GetAdminUsersParams = {}) {
  const response = await api.get<AdminUserListResponse>('/admin/users', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sort: params.sort ?? 'newest',

      ...(params.search?.trim() && {
        search: params.search.trim(),
      }),

      ...(params.role && {
        role: params.role,
      }),

      ...(params.status && {
        status: params.status,
      }),
    },
  });

  return {
    users: response.data.data,
    pagination: response.data.meta.pagination,
  };
}

export async function getAdminUserById(userId: string) {
  const response = await api.get<ApiSuccessResponse<AdminUserDetail>>(`/admin/users/${userId}`);

  return response.data.data;
}

export async function updateAdminUserStatus(userId: string, input: UpdateAdminUserStatusInput) {
  const response = await api.patch<ApiSuccessResponse<AdminUser>>(
    `/admin/users/${userId}/status`,
    input,
  );

  return response.data.data;
}

export async function getPendingAdminVendorApplications() {
  const response = await api.get<AdminVendorApplicationListResponse>('/admin/vendors/pending');

  return {
    applications: response.data.data,
    count: response.data.meta.count,
  };
}

export async function getAdminVendorApplicationById(vendorId: string) {
  const response = await api.get<ApiSuccessResponse<AdminVendorApplication>>(
    `/admin/vendors/${vendorId}`,
  );

  return response.data.data;
}

export async function approveAdminVendorApplication(vendorId: string) {
  const response = await api.patch<ApiSuccessResponse<AdminVendorApplication>>(
    `/admin/vendors/${vendorId}/approve`,
  );

  return response.data.data;
}

export async function rejectAdminVendorApplication(
  vendorId: string,
  input: RejectAdminVendorApplicationInput,
) {
  const response = await api.patch<ApiSuccessResponse<AdminVendorApplication>>(
    `/admin/vendors/${vendorId}/reject`,
    input,
  );

  return response.data.data;
}

export async function getPendingAdminPayments(params: GetPendingAdminPaymentsParams = {}) {
  const response = await api.get<AdminPaymentListResponse>('/admin/payments/pending', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sort: params.sort ?? 'newest',
    },
  });

  return {
    payments: response.data.data,
    pagination: response.data.meta.pagination,
  };
}

export async function getAdminPaymentById(paymentId: string) {
  const response = await api.get<ApiSuccessResponse<AdminPayment>>(`/admin/payments/${paymentId}`);

  return response.data.data;
}

export async function verifyAdminPayment(paymentId: string) {
  const response = await api.patch<ApiSuccessResponse<AdminPayment>>(
    `/admin/payments/${paymentId}/verify`,
  );

  return response.data.data;
}

export async function rejectAdminPayment(paymentId: string, input: RejectAdminPaymentInput) {
  const response = await api.patch<ApiSuccessResponse<AdminPayment>>(
    `/admin/payments/${paymentId}/reject`,
    input,
  );

  return response.data.data;
}

export async function getAdminReviews(params: GetAdminReviewsParams = {}) {
  const response = await api.get<AdminReviewListResponse>('/admin/reviews', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      visibility: params.visibility ?? 'all',
      sort: params.sort ?? 'newest',

      ...(params.search?.trim() && {
        search: params.search.trim(),
      }),

      ...(params.vendorId && {
        vendorId: params.vendorId,
      }),

      ...(params.customerId && {
        customerId: params.customerId,
      }),

      ...(params.overallRating !== undefined && {
        overallRating: params.overallRating,
      }),
    },
  });

  return {
    reviews: response.data.data,
    pagination: response.data.meta.pagination,
  };
}

export async function getAdminReviewById(reviewId: string) {
  const response = await api.get<ApiSuccessResponse<AdminReviewDetail>>(
    `/admin/reviews/${reviewId}`,
  );

  return response.data.data;
}

export async function moderateAdminReview(reviewId: string, input: ModerateAdminReviewInput) {
  const response = await api.patch<ApiSuccessResponse<AdminReviewDetail>>(
    `/admin/reviews/${reviewId}/moderation`,
    input,
  );

  return response.data.data;
}

export async function getAdminComplaints(params: GetAdminComplaintsParams = {}) {
  const response = await api.get<AdminComplaintListResponse>('/admin/complaints', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sort: params.sort ?? 'newest',

      ...(params.search?.trim() && {
        search: params.search.trim(),
      }),

      ...(params.type && {
        type: params.type,
      }),

      ...(params.status && {
        status: params.status,
      }),

      ...(params.priority && {
        priority: params.priority,
      }),

      ...(params.assignedAdminId && {
        assignedAdminId: params.assignedAdminId,
      }),
    },
  });

  return {
    complaints: response.data.data,
    pagination: response.data.meta.pagination,
  };
}

export async function getAdminComplaintById(complaintId: string) {
  const response = await api.get<ApiSuccessResponse<AdminComplaintDetail>>(
    `/admin/complaints/${complaintId}`,
  );

  return response.data.data;
}

export async function updateAdminComplaintStatus(
  complaintId: string,
  input: UpdateAdminComplaintStatusInput,
) {
  const response = await api.patch<ApiSuccessResponse<AdminComplaintDetail>>(
    `/admin/complaints/${complaintId}/status`,
    input,
  );

  return response.data.data;
}

export async function updateAdminComplaintPriority(
  complaintId: string,
  input: UpdateAdminComplaintPriorityInput,
) {
  const response = await api.patch<ApiSuccessResponse<AdminComplaintDetail>>(
    `/admin/complaints/${complaintId}/priority`,
    input,
  );

  return response.data.data;
}

export async function updateAdminComplaintAssignment(
  complaintId: string,
  input: UpdateAdminComplaintAssignmentInput,
) {
  const response = await api.patch<ApiSuccessResponse<AdminComplaintDetail>>(
    `/admin/complaints/${complaintId}/assignment`,
    input,
  );

  return response.data.data;
}

export async function reopenAdminComplaint(complaintId: string, input: ReopenAdminComplaintInput) {
  const response = await api.patch<ApiSuccessResponse<AdminComplaintDetail>>(
    `/admin/complaints/${complaintId}/reopen`,
    input,
  );

  return response.data.data;
}
