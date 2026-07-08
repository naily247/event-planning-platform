import {
  AccountStatus,
  BookingStatus,
  ComplaintPriority,
  ComplaintStatus,
  EventStatus,
  PaymentStatus,
  Prisma,
  ReviewModerationActionType,
  UserRole,
  VendorVerificationStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  GetAdminDashboardSummaryQuery,
  GetAdminReviewsQuery,
  GetAdminUserReportQuery,
  GetAdminUsersQuery,
  ModerateAdminReviewInput,
  RejectVendorApplicationInput,
  UpdateAdminUserStatusInput,
} from './admin.schemas.js';

const adminUserListSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,

  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
      verificationStatus: true,
    },
  },
} satisfies Prisma.UserSelect;

const adminUserDetailSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,

  customer: true,

  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
      description: true,
      contactPhone: true,
      website: true,
      baseLocation: true,
      serviceAreas: true,
      verificationStatus: true,
      submittedAt: true,
      reviewedAt: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,

      categories: {
        select: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },

        orderBy: {
          category: {
            name: 'asc',
          },
        },
      },
    },
  },

  _count: {
    select: {
      createdEvents: true,
      customerReviews: true,
      moderatedReviews: true,
      reviewModerationActions: true,
      submittedPayments: true,
      reviewedPayments: true,
      notifications: true,
      submittedComplaints: true,
      receivedComplaints: true,
      assignedComplaints: true,
      complaintMessages: true,
      performedComplaintActions: true,
    },
  },
} satisfies Prisma.UserSelect;

const pendingVendorSelect = {
  id: true,
  businessName: true,
  slug: true,
  description: true,
  contactPhone: true,
  website: true,
  baseLocation: true,
  serviceAreas: true,
  verificationStatus: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  rejectionReason: true,

  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      createdAt: true,
    },
  },

  categories: {
    select: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },

    orderBy: {
      category: {
        name: 'asc',
      },
    },
  },
} as const;

const adminReviewListSelect = {
  id: true,
  bookingId: true,
  customerId: true,
  vendorId: true,
  packageId: true,
  overallRating: true,
  serviceRating: true,
  communicationRating: true,
  comment: true,
  isHidden: true,
  moderationReason: true,
  moderatedAt: true,
  createdAt: true,
  updatedAt: true,

  customer: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },

  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
    },
  },

  package: {
    select: {
      id: true,
      title: true,
    },
  },

  moderatedBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

const adminReviewDetailSelect = {
  ...adminReviewListSelect,

  booking: {
    select: {
      id: true,
      status: true,
      serviceStart: true,
      serviceEnd: true,
    },
  },

  moderationActions: {
    select: {
      id: true,
      action: true,
      reason: true,
      createdAt: true,

      moderator: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  },
} as const;

const dashboardRecentUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const dashboardRecentBookingSelect = {
  id: true,
  status: true,
  agreedCost: true,
  serviceStart: true,
  createdAt: true,

  event: {
    select: {
      id: true,
      name: true,
      eventDate: true,
    },
  },

  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
    },
  },
} satisfies Prisma.BookingSelect;

const dashboardRecentPaymentSelect = {
  id: true,
  amount: true,
  status: true,
  method: true,
  referenceNumber: true,
  createdAt: true,

  booking: {
    select: {
      id: true,

      event: {
        select: {
          id: true,
          name: true,
        },
      },

      vendor: {
        select: {
          id: true,
          businessName: true,
          slug: true,
        },
      },
    },
  },

  submittedBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.PaymentSelect;

const dashboardRecentComplaintSelect = {
  id: true,
  type: true,
  subject: true,
  status: true,
  priority: true,
  createdAt: true,

  complainant: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  },

  respondent: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  },

  assignedAdmin: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.ComplaintSelect;

const getAdminUserOrderBy = (
  sort: GetAdminUsersQuery['sort'],
): Prisma.UserOrderByWithRelationInput | Prisma.UserOrderByWithRelationInput[] => {
  switch (sort) {
    case 'oldest':
      return {
        createdAt: 'asc',
      };

    case 'name_asc':
      return [
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'name_desc':
      return [
        {
          firstName: 'desc',
        },
        {
          lastName: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'email_asc':
      return [
        {
          email: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'email_desc':
      return [
        {
          email: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'newest':
    default:
      return {
        createdAt: 'desc',
      };
  }
};

const getAdminReviewOrderBy = (
  sort: GetAdminReviewsQuery['sort'],
): Prisma.ReviewOrderByWithRelationInput | Prisma.ReviewOrderByWithRelationInput[] => {
  switch (sort) {
    case 'oldest':
      return {
        createdAt: 'asc',
      };

    case 'rating_highest':
      return [
        {
          overallRating: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'rating_lowest':
      return [
        {
          overallRating: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'recently_moderated':
      return [
        {
          moderatedAt: {
            sort: 'desc',
            nulls: 'last',
          },
        },
        {
          createdAt: 'desc',
        },
      ];

    case 'newest':
    default:
      return {
        createdAt: 'desc',
      };
  }
};

const formatPendingVendor = <
  T extends {
    categories: Array<{
      category: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
  },
>(
  vendor: T,
) => ({
  ...vendor,
  categories: vendor.categories.map(({ category }) => category),
});

const formatDashboardBooking = <
  T extends {
    agreedCost: Prisma.Decimal;
  },
>(
  booking: T,
) => ({
  ...booking,
  agreedCost: booking.agreedCost.toString(),
});

const formatDashboardPayment = <
  T extends {
    amount: Prisma.Decimal;
  },
>(
  payment: T,
) => ({
  ...payment,
  amount: payment.amount.toString(),
});

const addOneDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return nextDate;
};

const isDateOnlyMidnight = (date: Date) => {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
};

const buildAdminUserReportWhere = (query: GetAdminUserReportQuery): Prisma.UserWhereInput => {
  const toDate = query.to && isDateOnlyMidnight(query.to) ? addOneDay(query.to) : query.to;

  return {
    ...(query.role && {
      role: query.role,
    }),

    ...(query.status && {
      status: query.status,
    }),

    ...((query.from || toDate) && {
      createdAt: {
        ...(query.from && {
          gte: query.from,
        }),

        ...(toDate && {
          lt: toDate,
        }),
      },
    }),
  };
};

const formatAdminUserReportBucket = (date: Date, groupBy: GetAdminUserReportQuery['groupBy']) => {
  const isoDate = date.toISOString();

  if (groupBy === 'month') {
    return isoDate.slice(0, 7);
  }

  return isoDate.slice(0, 10);
};

const groupAdminUserGrowth = (
  users: Array<{
    createdAt: Date;
  }>,
  groupBy: GetAdminUserReportQuery['groupBy'],
) => {
  const buckets = new Map<string, number>();

  users.forEach((user) => {
    const bucket = formatAdminUserReportBucket(user.createdAt, groupBy);

    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  });

  return Array.from(buckets.entries())
    .map(([period, count]) => ({
      period,
      count,
    }))
    .sort((first, second) => first.period.localeCompare(second.period));
};

export const getAdminUsers = async (query: GetAdminUsersQuery) => {
  const { page, limit, search, role, status, sort } = query;

  const where: Prisma.UserWhereInput = {
    ...(role && {
      role,
    }),

    ...(status && {
      status,
    }),

    ...(search && {
      OR: [
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          firstName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ],
    }),
  };

  const skip = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: adminUserListSelect,
      orderBy: getAdminUserOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.user.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    users: users.map(({ vendor, ...user }) => ({
      ...user,
      vendorProfile: vendor,
    })),

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

export const getAdminUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: adminUserDetailSelect,
  });

  if (!user) {
    throw new AppError(404, 'User not found', 'ADMIN_USER_NOT_FOUND');
  }

  const { vendor, ...userDetails } = user;

  return {
    ...userDetails,

    vendorProfile: vendor
      ? {
          ...vendor,
          categories: vendor.categories.map(({ category }) => category),
        }
      : null,
  };
};

export const updateAdminUserStatus = async (
  adminUserId: string,
  userId: string,
  input: UpdateAdminUserStatusInput,
) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!existingUser) {
    throw new AppError(404, 'User not found', 'ADMIN_USER_NOT_FOUND');
  }

  if (existingUser.id === adminUserId) {
    throw new AppError(
      409,
      'You cannot change the status of your own administrator account',
      'ADMIN_SELF_STATUS_CHANGE_NOT_ALLOWED',
    );
  }

  if (existingUser.role === UserRole.ADMIN) {
    throw new AppError(
      403,
      'Administrator account status cannot be changed through this endpoint',
      'ADMIN_ACCOUNT_STATUS_CHANGE_FORBIDDEN',
    );
  }

  if (existingUser.status === input.status) {
    throw new AppError(
      409,
      `User account is already ${input.status.toLowerCase()}`,
      'USER_STATUS_ALREADY_SET',
    );
  }

  const allowedTransition =
    (existingUser.status === AccountStatus.ACTIVE && input.status === AccountStatus.SUSPENDED) ||
    (existingUser.status === AccountStatus.SUSPENDED && input.status === AccountStatus.ACTIVE);

  if (!allowedTransition) {
    throw new AppError(
      409,
      `User status cannot be changed from ${existingUser.status} to ${input.status}`,
      'INVALID_USER_STATUS_TRANSITION',
    );
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      status: input.status,
    },

    select: adminUserListSelect,
  });

  const { vendor, ...user } = updatedUser;

  return {
    ...user,
    vendorProfile: vendor,
  };
};

export const getAdminDashboardSummary = async (query: GetAdminDashboardSummaryQuery) => {
  const { recentLimit } = query;
  const generatedAt = new Date();
  const startOfCurrentMonth = new Date(generatedAt.getFullYear(), generatedAt.getMonth(), 1);

  const [
    totalUsers,
    customerUsers,
    vendorUsers,
    adminUsers,
    activeUsers,
    pendingVerificationUsers,
    suspendedUsers,
    deactivatedUsers,
    newUsersThisMonth,

    totalVendors,
    draftVendors,
    pendingVendors,
    approvedVendors,
    rejectedVendors,

    totalEvents,
    draftEvents,
    planningEvents,
    activeEvents,
    completedEvents,
    cancelledEvents,

    totalBookings,
    awaitingVendorConfirmationBookings,
    confirmedBookings,
    depositPendingBookings,
    activeBookings,
    completedBookings,
    cancelledBookings,
    rejectedBookings,
    disputedBookings,

    totalPayments,
    pendingPayments,
    verifiedPayments,
    rejectedPayments,
    cancelledPayments,
    refundedPayments,
    partiallyRefundedPayments,
    verifiedPaymentAmountAggregate,

    totalComplaints,
    openComplaints,
    underReviewComplaints,
    awaitingCustomerResponseComplaints,
    awaitingVendorResponseComplaints,
    underInvestigationComplaints,
    resolvedComplaints,
    dismissedComplaints,
    closedComplaints,
    urgentComplaints,
    unassignedComplaints,

    totalReviews,
    visibleReviews,
    hiddenReviews,
    reviewRatingAggregate,

    recentUsers,
    recentBookings,
    recentPayments,
    recentComplaints,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
    prisma.user.count({ where: { role: UserRole.VENDOR } }),
    prisma.user.count({ where: { role: UserRole.ADMIN } }),
    prisma.user.count({ where: { status: AccountStatus.ACTIVE } }),
    prisma.user.count({
      where: { status: AccountStatus.PENDING_VERIFICATION },
    }),
    prisma.user.count({ where: { status: AccountStatus.SUSPENDED } }),
    prisma.user.count({ where: { status: AccountStatus.DEACTIVATED } }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: startOfCurrentMonth,
        },
      },
    }),

    prisma.vendorProfile.count(),
    prisma.vendorProfile.count({
      where: { verificationStatus: VendorVerificationStatus.DRAFT },
    }),
    prisma.vendorProfile.count({
      where: { verificationStatus: VendorVerificationStatus.PENDING },
    }),
    prisma.vendorProfile.count({
      where: { verificationStatus: VendorVerificationStatus.APPROVED },
    }),
    prisma.vendorProfile.count({
      where: { verificationStatus: VendorVerificationStatus.REJECTED },
    }),

    prisma.event.count(),
    prisma.event.count({ where: { status: EventStatus.DRAFT } }),
    prisma.event.count({ where: { status: EventStatus.PLANNING } }),
    prisma.event.count({ where: { status: EventStatus.ACTIVE } }),
    prisma.event.count({ where: { status: EventStatus.COMPLETED } }),
    prisma.event.count({ where: { status: EventStatus.CANCELLED } }),

    prisma.booking.count(),
    prisma.booking.count({
      where: { status: BookingStatus.AWAITING_VENDOR_CONFIRMATION },
    }),
    prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
    prisma.booking.count({ where: { status: BookingStatus.DEPOSIT_PENDING } }),
    prisma.booking.count({ where: { status: BookingStatus.ACTIVE } }),
    prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
    prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
    prisma.booking.count({ where: { status: BookingStatus.REJECTED } }),
    prisma.booking.count({ where: { status: BookingStatus.DISPUTED } }),

    prisma.payment.count(),
    prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
    prisma.payment.count({ where: { status: PaymentStatus.VERIFIED } }),
    prisma.payment.count({ where: { status: PaymentStatus.REJECTED } }),
    prisma.payment.count({ where: { status: PaymentStatus.CANCELLED } }),
    prisma.payment.count({ where: { status: PaymentStatus.REFUNDED } }),
    prisma.payment.count({
      where: { status: PaymentStatus.PARTIALLY_REFUNDED },
    }),
    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.VERIFIED,
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.complaint.count(),
    prisma.complaint.count({ where: { status: ComplaintStatus.OPEN } }),
    prisma.complaint.count({
      where: { status: ComplaintStatus.UNDER_REVIEW },
    }),
    prisma.complaint.count({
      where: { status: ComplaintStatus.AWAITING_CUSTOMER_RESPONSE },
    }),
    prisma.complaint.count({
      where: { status: ComplaintStatus.AWAITING_VENDOR_RESPONSE },
    }),
    prisma.complaint.count({
      where: { status: ComplaintStatus.UNDER_INVESTIGATION },
    }),
    prisma.complaint.count({ where: { status: ComplaintStatus.RESOLVED } }),
    prisma.complaint.count({ where: { status: ComplaintStatus.DISMISSED } }),
    prisma.complaint.count({ where: { status: ComplaintStatus.CLOSED } }),
    prisma.complaint.count({
      where: { priority: ComplaintPriority.URGENT },
    }),
    prisma.complaint.count({
      where: {
        assignedAdminId: null,
        status: {
          notIn: [ComplaintStatus.RESOLVED, ComplaintStatus.DISMISSED, ComplaintStatus.CLOSED],
        },
      },
    }),

    prisma.review.count(),
    prisma.review.count({ where: { isHidden: false } }),
    prisma.review.count({ where: { isHidden: true } }),
    prisma.review.aggregate({
      _avg: {
        overallRating: true,
      },
    }),

    prisma.user.findMany({
      select: dashboardRecentUserSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: recentLimit,
    }),

    prisma.booking.findMany({
      select: dashboardRecentBookingSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: recentLimit,
    }),

    prisma.payment.findMany({
      select: dashboardRecentPaymentSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: recentLimit,
    }),

    prisma.complaint.findMany({
      select: dashboardRecentComplaintSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: recentLimit,
    }),
  ]);

  return {
    generatedAt,

    users: {
      total: totalUsers,

      byRole: {
        customers: customerUsers,
        vendors: vendorUsers,
        admins: adminUsers,
      },

      byStatus: {
        active: activeUsers,
        pendingVerification: pendingVerificationUsers,
        suspended: suspendedUsers,
        deactivated: deactivatedUsers,
      },

      newThisMonth: newUsersThisMonth,
    },

    vendors: {
      total: totalVendors,
      draft: draftVendors,
      pending: pendingVendors,
      approved: approvedVendors,
      rejected: rejectedVendors,
    },

    events: {
      total: totalEvents,
      draft: draftEvents,
      planning: planningEvents,
      active: activeEvents,
      completed: completedEvents,
      cancelled: cancelledEvents,
    },

    bookings: {
      total: totalBookings,
      awaitingVendorConfirmation: awaitingVendorConfirmationBookings,
      confirmed: confirmedBookings,
      depositPending: depositPendingBookings,
      active: activeBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
      rejected: rejectedBookings,
      disputed: disputedBookings,
    },

    payments: {
      total: totalPayments,
      pending: pendingPayments,
      verified: verifiedPayments,
      rejected: rejectedPayments,
      cancelled: cancelledPayments,
      refunded: refundedPayments,
      partiallyRefunded: partiallyRefundedPayments,
      totalVerifiedAmount: verifiedPaymentAmountAggregate._sum.amount?.toString() ?? '0',
    },

    complaints: {
      total: totalComplaints,
      open: openComplaints,
      underReview: underReviewComplaints,
      underInvestigation: underInvestigationComplaints,
      awaitingResponse: awaitingCustomerResponseComplaints + awaitingVendorResponseComplaints,
      awaitingCustomerResponse: awaitingCustomerResponseComplaints,
      awaitingVendorResponse: awaitingVendorResponseComplaints,
      resolved: resolvedComplaints,
      dismissed: dismissedComplaints,
      closed: closedComplaints,
      urgent: urgentComplaints,
      unassigned: unassignedComplaints,
    },

    reviews: {
      total: totalReviews,
      visible: visibleReviews,
      hidden: hiddenReviews,
      averageRating: reviewRatingAggregate._avg.overallRating,
    },

    activity: {
      recentUsers,
      recentBookings: recentBookings.map(formatDashboardBooking),
      recentPayments: recentPayments.map(formatDashboardPayment),
      recentComplaints,
    },
  };
};

export const getAdminUserReport = async (query: GetAdminUserReportQuery) => {
  const where = buildAdminUserReportWhere(query);
  const generatedAt = new Date();

  const [
    totalMatchingUsers,
    customerUsers,
    vendorUsers,
    adminUsers,
    activeUsers,
    pendingVerificationUsers,
    suspendedUsers,
    deactivatedUsers,
    growthUsers,
    recentUsers,
  ] = await prisma.$transaction([
    prisma.user.count({
      where,
    }),

    prisma.user.count({
      where: {
        ...where,
        role: UserRole.CUSTOMER,
      },
    }),

    prisma.user.count({
      where: {
        ...where,
        role: UserRole.VENDOR,
      },
    }),

    prisma.user.count({
      where: {
        ...where,
        role: UserRole.ADMIN,
      },
    }),

    prisma.user.count({
      where: {
        ...where,
        status: AccountStatus.ACTIVE,
      },
    }),

    prisma.user.count({
      where: {
        ...where,
        status: AccountStatus.PENDING_VERIFICATION,
      },
    }),

    prisma.user.count({
      where: {
        ...where,
        status: AccountStatus.SUSPENDED,
      },
    }),

    prisma.user.count({
      where: {
        ...where,
        status: AccountStatus.DEACTIVATED,
      },
    }),

    prisma.user.findMany({
      where,
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),

    prisma.user.findMany({
      where,
      select: adminUserListSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.recentLimit,
    }),
  ]);

  return {
    generatedAt,

    filters: {
      from: query.from ?? null,
      to: query.to ?? null,
      role: query.role ?? null,
      status: query.status ?? null,
      groupBy: query.groupBy,
      recentLimit: query.recentLimit,
    },

    totals: {
      users: totalMatchingUsers,

      byRole: {
        customers: customerUsers,
        vendors: vendorUsers,
        admins: adminUsers,
      },

      byStatus: {
        active: activeUsers,
        pendingVerification: pendingVerificationUsers,
        suspended: suspendedUsers,
        deactivated: deactivatedUsers,
      },
    },

    growth: groupAdminUserGrowth(growthUsers, query.groupBy),

    recentUsers: recentUsers.map(({ vendor, ...user }) => ({
      ...user,
      vendorProfile: vendor,
    })),
  };
};

export const getPendingVendorApplications = async () => {
  const vendors = await prisma.vendorProfile.findMany({
    where: {
      verificationStatus: VendorVerificationStatus.PENDING,
    },

    select: pendingVendorSelect,

    orderBy: {
      submittedAt: 'asc',
    },
  });

  return vendors.map(formatPendingVendor);
};

export const getVendorApplicationById = async (vendorId: string) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      id: vendorId,

      verificationStatus: {
        not: VendorVerificationStatus.DRAFT,
      },
    },

    select: pendingVendorSelect,
  });

  if (!vendor) {
    throw new AppError(404, 'Vendor application not found', 'VENDOR_APPLICATION_NOT_FOUND');
  }

  return formatPendingVendor(vendor);
};

export const approveVendorApplication = async (vendorId: string) => {
  const existingVendor = await prisma.vendorProfile.findUnique({
    where: {
      id: vendorId,
    },

    select: {
      id: true,
      verificationStatus: true,
    },
  });

  if (!existingVendor) {
    throw new AppError(404, 'Vendor application not found', 'VENDOR_APPLICATION_NOT_FOUND');
  }

  if (existingVendor.verificationStatus !== VendorVerificationStatus.PENDING) {
    throw new AppError(
      409,
      'Only pending vendor applications can be approved',
      'VENDOR_APPLICATION_NOT_PENDING',
    );
  }

  const vendor = await prisma.vendorProfile.update({
    where: {
      id: vendorId,
    },

    data: {
      verificationStatus: VendorVerificationStatus.APPROVED,
      reviewedAt: new Date(),
      rejectionReason: null,
    },

    select: pendingVendorSelect,
  });

  return formatPendingVendor(vendor);
};

export const rejectVendorApplication = async (
  vendorId: string,
  input: RejectVendorApplicationInput,
) => {
  const existingVendor = await prisma.vendorProfile.findUnique({
    where: {
      id: vendorId,
    },

    select: {
      id: true,
      verificationStatus: true,
    },
  });

  if (!existingVendor) {
    throw new AppError(404, 'Vendor application not found', 'VENDOR_APPLICATION_NOT_FOUND');
  }

  if (existingVendor.verificationStatus !== VendorVerificationStatus.PENDING) {
    throw new AppError(
      409,
      'Only pending vendor applications can be rejected',
      'VENDOR_APPLICATION_NOT_PENDING',
    );
  }

  const vendor = await prisma.vendorProfile.update({
    where: {
      id: vendorId,
    },

    data: {
      verificationStatus: VendorVerificationStatus.REJECTED,
      reviewedAt: new Date(),
      rejectionReason: input.reason,
    },

    select: pendingVendorSelect,
  });

  return formatPendingVendor(vendor);
};

export const getAdminReviews = async (query: GetAdminReviewsQuery) => {
  const { page, limit, vendorId, customerId, overallRating, visibility, sort } = query;

  const where: Prisma.ReviewWhereInput = {
    ...(vendorId && {
      vendorId,
    }),

    ...(customerId && {
      customerId,
    }),

    ...(overallRating !== undefined && {
      overallRating,
    }),

    ...(visibility === 'visible' && {
      isHidden: false,
    }),

    ...(visibility === 'hidden' && {
      isHidden: true,
    }),
  };

  const skip = (page - 1) * limit;

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      select: adminReviewListSelect,
      orderBy: getAdminReviewOrderBy(sort),
      skip,
      take: limit,
    }),

    prisma.review.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    reviews,

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

export const getAdminReviewById = async (reviewId: string) => {
  const review = await prisma.review.findUnique({
    where: {
      id: reviewId,
    },

    select: adminReviewDetailSelect,
  });

  if (!review) {
    throw new AppError(404, 'Review not found', 'ADMIN_REVIEW_NOT_FOUND');
  }

  return review;
};

export const moderateAdminReview = async (
  adminUserId: string,
  reviewId: string,
  input: ModerateAdminReviewInput,
) => {
  const existingReview = await prisma.review.findUnique({
    where: {
      id: reviewId,
    },

    select: {
      id: true,
      isHidden: true,
    },
  });

  if (!existingReview) {
    throw new AppError(404, 'Review not found', 'ADMIN_REVIEW_NOT_FOUND');
  }

  if (input.action === 'HIDE' && existingReview.isHidden) {
    throw new AppError(409, 'Review is already hidden', 'REVIEW_ALREADY_HIDDEN');
  }

  if (input.action === 'RESTORE' && !existingReview.isHidden) {
    throw new AppError(409, 'Review is already visible', 'REVIEW_ALREADY_VISIBLE');
  }

  const moderatedAt = new Date();

  const moderationAction =
    input.action === 'HIDE'
      ? ReviewModerationActionType.HIDDEN
      : ReviewModerationActionType.RESTORED;

  return prisma.$transaction(async (transaction) => {
    await transaction.review.update({
      where: {
        id: reviewId,
      },

      data: {
        isHidden: input.action === 'HIDE',
        moderationReason: input.reason,
        moderatedAt,
        moderatedById: adminUserId,
      },
    });

    await transaction.reviewModerationAction.create({
      data: {
        reviewId,
        moderatorId: adminUserId,
        action: moderationAction,
        reason: input.reason,
        createdAt: moderatedAt,
      },
    });

    return transaction.review.findUniqueOrThrow({
      where: {
        id: reviewId,
      },

      select: adminReviewDetailSelect,
    });
  });
};
