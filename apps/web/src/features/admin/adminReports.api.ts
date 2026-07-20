import { api } from '../../lib/api';
import type {
  AdminAccountStatus,
  AdminBookingStatus,
  AdminComplaintPriority,
  AdminComplaintStatus,
  AdminComplaintType,
  AdminEventStatus,
  AdminPaymentMethod,
  AdminPaymentStatus,
  AdminUserRole,
  AdminVendorVerificationStatus,
} from './admin.api';

export const adminReportGroupByOptions = ['day', 'month'] as const;

export type AdminReportGroupBy = (typeof adminReportGroupByOptions)[number];

export type AdminReportGrowthPoint = {
  period: string;
  count: number;
};

export type AdminRevenueGrowthPoint = {
  period: string;
  paymentCount: number;
  revenue: string;
};

export type AdminReportUserSummary = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: AdminAccountStatus;
};

export type AdminReportVendorSummary = {
  id: string;
  businessName: string;
  slug: string;
  verificationStatus: AdminVendorVerificationStatus;
};

export type AdminReportCategory = {
  id: string;
  name: string;
  slug: string;
};

export type AdminReportDateParams = {
  from?: string;
  to?: string;
  groupBy?: AdminReportGroupBy;
  recentLimit?: number;
};

export type GetAdminUserReportParams = AdminReportDateParams & {
  role?: AdminUserRole;
  status?: AdminAccountStatus;
};

export type AdminUserReport = {
  generatedAt: string;

  filters: {
    from: string | null;
    to: string | null;
    role: AdminUserRole | null;
    status: AdminAccountStatus | null;
    groupBy: AdminReportGroupBy;
    recentLimit: number;
  };

  totals: {
    users: number;

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
  };

  growth: AdminReportGrowthPoint[];

  recentUsers: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: AdminUserRole;
    status: AdminAccountStatus;
    createdAt: string;
    updatedAt: string;

    vendorProfile: {
      id: string;
      businessName: string;
      slug: string;
      verificationStatus: AdminVendorVerificationStatus;
    } | null;
  }>;
};

export type GetAdminVendorReportParams = AdminReportDateParams & {
  verificationStatus?: AdminVendorVerificationStatus;
  accountStatus?: AdminAccountStatus;
  categoryId?: string;
};

export type AdminVendorReport = {
  generatedAt: string;

  filters: {
    from: string | null;
    to: string | null;
    verificationStatus: AdminVendorVerificationStatus | null;
    accountStatus: AdminAccountStatus | null;
    categoryId: string | null;
    groupBy: AdminReportGroupBy;
    recentLimit: number;
  };

  totals: {
    vendors: number;

    byVerificationStatus: {
      draft: number;
      pending: number;
      approved: number;
      rejected: number;
    };

    byAccountStatus: {
      active: number;
      pendingVerification: number;
      suspended: number;
      deactivated: number;
    };
  };

  growth: AdminReportGrowthPoint[];

  topCategories: Array<{
    category: AdminReportCategory | null;
    vendorCount: number;
  }>;

  recentVendors: Array<{
    id: string;
    businessName: string;
    slug: string;
    baseLocation: string | null;
    serviceAreas: string[];
    verificationStatus: AdminVendorVerificationStatus;
    submittedAt: string | null;
    reviewedAt: string | null;
    rejectionReason: string | null;
    createdAt: string;
    updatedAt: string;

    user: AdminReportUserSummary & {
      createdAt: string;
    };

    categories: AdminReportCategory[];

    _count: {
      packages: number;
      bookings: number;
      reviews: number;
    };
  }>;
};

export type GetAdminEventReportParams = AdminReportDateParams & {
  status?: AdminEventStatus;
  ownerId?: string;
  eventType?: string;
  location?: string;
};

export type AdminEventReport = {
  generatedAt: string;

  filters: {
    from: string | null;
    to: string | null;
    status: AdminEventStatus | null;
    ownerId: string | null;
    eventType: string | null;
    location: string | null;
    groupBy: AdminReportGroupBy;
    recentLimit: number;
  };

  totals: {
    events: number;

    byStatus: {
      draft: number;
      planning: number;
      active: number;
      completed: number;
      cancelled: number;
    };
  };

  planning: {
    totalPlannedBudget: string;
    totalGuestCount: number;
    averageGuestCount: number | null;
  };

  growth: AdminReportGrowthPoint[];

  topEventTypes: Array<{
    eventType: string;
    eventCount: number;
  }>;

  topLocations: Array<{
    location: string | null;
    eventCount: number;
  }>;

  topCustomers: Array<{
    customer: AdminReportUserSummary | null;
    eventCount: number;
    plannedBudget: string;
    guestCount: number;
  }>;

  recentEvents: Array<{
    id: string;
    name: string;
    eventType: string;
    eventDate: string;
    location: string | null;
    guestCount: number | null;
    plannedBudget: string | null;
    theme: string | null;
    requirements: string | null;
    status: AdminEventStatus;
    createdAt: string;
    updatedAt: string;

    owner: AdminReportUserSummary;

    _count: {
      bookings: number;
      guests: number;
    };
  }>;
};

export type GetAdminBookingReportParams = AdminReportDateParams & {
  status?: AdminBookingStatus;
  vendorId?: string;
  customerId?: string;
  eventId?: string;
};

export type AdminBookingReport = {
  generatedAt: string;

  filters: {
    from: string | null;
    to: string | null;
    status: AdminBookingStatus | null;
    vendorId: string | null;
    customerId: string | null;
    eventId: string | null;
    groupBy: AdminReportGroupBy;
    recentLimit: number;
  };

  totals: {
    bookings: number;

    byStatus: {
      awaitingVendorConfirmation: number;
      confirmed: number;
      depositPending: number;
      active: number;
      completed: number;
      cancelled: number;
      rejected: number;
      disputed: number;
    };
  };

  financials: {
    totalAgreedCost: string;
    completedAgreedCost: string;
    verifiedPaymentAmount: string;
  };

  growth: AdminReportGrowthPoint[];

  topVendors: Array<{
    vendor: AdminReportVendorSummary | null;
    bookingCount: number;
    agreedCost: string;
  }>;

  recentBookings: Array<{
    id: string;
    status: AdminBookingStatus;
    agreedCost: string;
    serviceStart: string;
    serviceEnd: string | null;
    vendorRespondedAt: string | null;
    vendorCompletedAt: string | null;
    customerCancelledAt: string | null;
    createdAt: string;
    updatedAt: string;

    event: {
      id: string;
      name: string;
      eventType: string;
      eventDate: string;
      location: string | null;
      owner: AdminReportUserSummary;
    };

    vendor: AdminReportVendorSummary & {
      user: AdminReportUserSummary;
    };

    _count: {
      payments: number;
      complaints: number;
    };
  }>;
};

export type GetAdminPaymentReportParams = AdminReportDateParams & {
  status?: AdminPaymentStatus;
  method?: AdminPaymentMethod;
  vendorId?: string;
  customerId?: string;
  bookingId?: string;
};

export type AdminPaymentReport = {
  generatedAt: string;

  filters: {
    from: string | null;
    to: string | null;
    status: AdminPaymentStatus | null;
    method: AdminPaymentMethod | null;
    vendorId: string | null;
    customerId: string | null;
    bookingId: string | null;
    groupBy: AdminReportGroupBy;
    recentLimit: number;
  };

  totals: {
    payments: number;

    byStatus: {
      pending: number;
      verified: number;
      rejected: number;
      cancelled: number;
      refunded: number;
      partiallyRefunded: number;
    };

    byMethod: {
      bankTransfer: number;
    };
  };

  financials: {
    totalAmount: string;
    pendingAmount: string;
    verifiedAmount: string;
    rejectedAmount: string;
    refundedAmount: string;
  };

  growth: AdminReportGrowthPoint[];

  topVendors: Array<{
    vendor: AdminReportVendorSummary | null;
    paymentCount: number;
    verifiedAmount: string;
  }>;

  topCustomers: Array<{
    customer: AdminReportUserSummary | null;
    paymentCount: number;
    totalAmount: string;
  }>;

  recentPayments: AdminReportPayment[];
};

export type GetAdminRevenueReportParams = AdminReportDateParams & {
  method?: AdminPaymentMethod;
  vendorId?: string;
  customerId?: string;
  bookingId?: string;
};

export type AdminRevenueReport = {
  generatedAt: string;

  filters: {
    from: string | null;
    to: string | null;
    method: AdminPaymentMethod | null;
    vendorId: string | null;
    customerId: string | null;
    bookingId: string | null;
    groupBy: AdminReportGroupBy;
    recentLimit: number;
  };

  totals: {
    payments: number;

    byStatus: {
      verified: number;
      pending: number;
      rejected: number;
      cancelled: number;
      refunded: number;
      partiallyRefunded: number;
    };
  };

  revenue: {
    totalVerifiedRevenue: string;
    pendingAmount: string;
    rejectedAmount: string;
    refundedAmount: string;
    averageVerifiedPayment: string | null;
  };

  growth: AdminRevenueGrowthPoint[];

  byMethod: Array<{
    method: AdminPaymentMethod;
    paymentCount: number;
    revenue: string;
  }>;

  topVendors: Array<{
    vendor:
      | (AdminReportVendorSummary & {
          user: AdminReportUserSummary;
        })
      | null;

    paymentCount: number;
    revenue: string;
  }>;

  topCustomers: Array<{
    customer: AdminReportUserSummary | null;
    paymentCount: number;
    revenue: string;
  }>;

  recentPayments: AdminReportPayment[];
};

export type AdminReportPayment = {
  id: string;
  amount: string;
  status: AdminPaymentStatus;
  method: AdminPaymentMethod;
  referenceNumber: string;
  reviewedAt: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;

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
      owner: AdminReportUserSummary;
    };

    vendor: AdminReportVendorSummary & {
      user?: AdminReportUserSummary;
    };
  };

  submittedBy: AdminReportUserSummary;
  reviewedBy: AdminReportUserSummary | null;
};

export type AdminComplaintAssignmentFilter = 'all' | 'assigned' | 'unassigned';

export type GetAdminComplaintReportParams = AdminReportDateParams & {
  status?: AdminComplaintStatus;
  type?: AdminComplaintType;
  priority?: AdminComplaintPriority;
  complainantId?: string;
  respondentId?: string;
  assignedAdminId?: string;
  assignment?: AdminComplaintAssignmentFilter;
};

export type AdminComplaintReport = {
  generatedAt: string;

  filters: {
    from: string | null;
    to: string | null;
    status: AdminComplaintStatus | null;
    type: AdminComplaintType | null;
    priority: AdminComplaintPriority | null;
    complainantId: string | null;
    respondentId: string | null;
    assignedAdminId: string | null;
    assignment: AdminComplaintAssignmentFilter;
    groupBy: AdminReportGroupBy;
    recentLimit: number;
  };

  totals: {
    complaints: number;

    byStatus: {
      open: number;
      underReview: number;
      awaitingCustomerResponse: number;
      awaitingVendorResponse: number;
      underInvestigation: number;
      resolved: number;
      dismissed: number;
      closed: number;
    };

    byAssignment: {
      assigned: number;
      unassigned: number;
    };
  };

  growth: AdminReportGrowthPoint[];

  byType: Array<{
    type: AdminComplaintType;
    complaintCount: number;
  }>;

  byPriority: Array<{
    priority: AdminComplaintPriority;
    complaintCount: number;
  }>;

  topComplainants: Array<{
    complainant: AdminReportComplaintPerson | null;
    complaintCount: number;
  }>;

  topRespondents: Array<{
    respondent: AdminReportComplaintPerson | null;
    complaintCount: number;
  }>;

  recentComplaints: Array<{
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

    complainant: AdminReportComplaintPerson;
    respondent: AdminReportComplaintPerson | null;
    assignedAdmin: AdminReportUserSummary | null;

    booking: {
      id: string;
      status: AdminBookingStatus;
      serviceStart: string;
      serviceEnd: string | null;

      event: {
        id: string;
        name: string;
        eventType: string;
        eventDate: string;
        location: string | null;
      };

      vendor: AdminReportVendorSummary;
    } | null;

    payment: {
      id: string;
      amount: string;
      status: AdminPaymentStatus;
      method: AdminPaymentMethod;
      referenceNumber: string;
    } | null;

    review: {
      id: string;
      overallRating: number;
      isHidden: boolean;
      createdAt: string;
    } | null;

    quotationRequest: {
      id: string;
      status:
        | 'SENT'
        | 'VIEWED'
        | 'CLARIFICATION_REQUESTED'
        | 'QUOTED'
        | 'ACCEPTED'
        | 'DECLINED'
        | 'CLOSED';

      createdAt: string;

      event: {
        id: string;
        name: string;
        eventType: string;
        eventDate: string;
        location: string | null;
      };

      vendor: AdminReportVendorSummary;
    } | null;

    _count: {
      messages: number;
      actions: number;
    };
  }>;
};

export type AdminReportComplaintPerson = AdminReportUserSummary & {
  role: AdminUserRole;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

function buildReportParams<T extends AdminReportDateParams>(params: T) {
  return {
    groupBy: params.groupBy ?? 'day',
    recentLimit: params.recentLimit ?? 10,

    ...(params.from && {
      from: params.from,
    }),

    ...(params.to && {
      to: params.to,
    }),
  };
}

export async function getAdminUserReport(params: GetAdminUserReportParams = {}) {
  const response = await api.get<ApiSuccessResponse<AdminUserReport>>('/admin/reports/users', {
    params: {
      ...buildReportParams(params),

      ...(params.role && {
        role: params.role,
      }),

      ...(params.status && {
        status: params.status,
      }),
    },
  });

  return response.data.data;
}

export async function getAdminVendorReport(params: GetAdminVendorReportParams = {}) {
  const response = await api.get<ApiSuccessResponse<AdminVendorReport>>('/admin/reports/vendors', {
    params: {
      ...buildReportParams(params),

      ...(params.verificationStatus && {
        verificationStatus: params.verificationStatus,
      }),

      ...(params.accountStatus && {
        accountStatus: params.accountStatus,
      }),

      ...(params.categoryId && {
        categoryId: params.categoryId,
      }),
    },
  });

  return response.data.data;
}

export async function getAdminEventReport(params: GetAdminEventReportParams = {}) {
  const response = await api.get<ApiSuccessResponse<AdminEventReport>>('/admin/reports/events', {
    params: {
      ...buildReportParams(params),

      ...(params.status && {
        status: params.status,
      }),

      ...(params.ownerId && {
        ownerId: params.ownerId,
      }),

      ...(params.eventType?.trim() && {
        eventType: params.eventType.trim(),
      }),

      ...(params.location?.trim() && {
        location: params.location.trim(),
      }),
    },
  });

  return response.data.data;
}

export async function getAdminBookingReport(params: GetAdminBookingReportParams = {}) {
  const response = await api.get<ApiSuccessResponse<AdminBookingReport>>(
    '/admin/reports/bookings',
    {
      params: {
        ...buildReportParams(params),

        ...(params.status && {
          status: params.status,
        }),

        ...(params.vendorId && {
          vendorId: params.vendorId,
        }),

        ...(params.customerId && {
          customerId: params.customerId,
        }),

        ...(params.eventId && {
          eventId: params.eventId,
        }),
      },
    },
  );

  return response.data.data;
}

export async function getAdminPaymentReport(params: GetAdminPaymentReportParams = {}) {
  const response = await api.get<ApiSuccessResponse<AdminPaymentReport>>(
    '/admin/reports/payments',
    {
      params: {
        ...buildReportParams(params),

        ...(params.status && {
          status: params.status,
        }),

        ...(params.method && {
          method: params.method,
        }),

        ...(params.vendorId && {
          vendorId: params.vendorId,
        }),

        ...(params.customerId && {
          customerId: params.customerId,
        }),

        ...(params.bookingId && {
          bookingId: params.bookingId,
        }),
      },
    },
  );

  return response.data.data;
}

export async function getAdminRevenueReport(params: GetAdminRevenueReportParams = {}) {
  const response = await api.get<ApiSuccessResponse<AdminRevenueReport>>('/admin/reports/revenue', {
    params: {
      ...buildReportParams(params),

      ...(params.method && {
        method: params.method,
      }),

      ...(params.vendorId && {
        vendorId: params.vendorId,
      }),

      ...(params.customerId && {
        customerId: params.customerId,
      }),

      ...(params.bookingId && {
        bookingId: params.bookingId,
      }),
    },
  });

  return response.data.data;
}

export async function getAdminComplaintReport(params: GetAdminComplaintReportParams = {}) {
  const response = await api.get<ApiSuccessResponse<AdminComplaintReport>>(
    '/admin/reports/complaints',
    {
      params: {
        ...buildReportParams(params),
        assignment: params.assignment ?? 'all',

        ...(params.status && {
          status: params.status,
        }),

        ...(params.type && {
          type: params.type,
        }),

        ...(params.priority && {
          priority: params.priority,
        }),

        ...(params.complainantId && {
          complainantId: params.complainantId,
        }),

        ...(params.respondentId && {
          respondentId: params.respondentId,
        }),

        ...(params.assignedAdminId && {
          assignedAdminId: params.assignedAdminId,
        }),
      },
    },
  );

  return response.data.data;
}
