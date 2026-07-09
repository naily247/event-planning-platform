import {
  AccountStatus,
  BookingStatus,
  ComplaintPriority,
  ComplaintStatus,
  EventStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ReviewModerationActionType,
  UserRole,
  VendorVerificationStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type {
  GetAdminBookingReportQuery,
  GetAdminDashboardSummaryQuery,
  GetAdminEventReportQuery,
  GetAdminPaymentReportQuery,
  GetAdminReviewsQuery,
  GetAdminUserReportQuery,
  GetAdminUsersQuery,
  GetAdminVendorReportQuery,
  ModerateAdminReviewInput,
  RejectVendorApplicationInput,
  UpdateAdminUserStatusInput,
  GetAdminComplaintReportQuery,
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

const adminVendorReportSelect = {
  id: true,
  businessName: true,
  slug: true,
  baseLocation: true,
  serviceAreas: true,
  verificationStatus: true,
  submittedAt: true,
  reviewedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,

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

  _count: {
    select: {
      packages: true,
      bookings: true,
      reviews: true,
    },
  },
} satisfies Prisma.VendorProfileSelect;

const adminEventReportSelect = {
  id: true,
  name: true,
  eventType: true,
  eventDate: true,
  location: true,
  guestCount: true,
  plannedBudget: true,
  theme: true,
  requirements: true,
  status: true,
  createdAt: true,
  updatedAt: true,

  owner: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  },

  _count: {
    select: {
      bookings: true,
      guests: true,
    },
  },
} satisfies Prisma.EventSelect;

const adminBookingReportSelect = {
  id: true,
  status: true,
  agreedCost: true,
  serviceStart: true,
  serviceEnd: true,
  vendorRespondedAt: true,
  vendorCompletedAt: true,
  customerCancelledAt: true,
  createdAt: true,
  updatedAt: true,

  event: {
    select: {
      id: true,
      name: true,
      eventType: true,
      eventDate: true,
      location: true,

      owner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      },
    },
  },

  vendor: {
    select: {
      id: true,
      businessName: true,
      slug: true,
      verificationStatus: true,

      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      },
    },
  },

  _count: {
    select: {
      payments: true,
      complaints: true,
    },
  },
} satisfies Prisma.BookingSelect;

const adminPaymentReportSelect = {
  id: true,
  amount: true,
  status: true,
  method: true,
  referenceNumber: true,
  reviewedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,

  booking: {
    select: {
      id: true,
      status: true,
      agreedCost: true,
      serviceStart: true,
      serviceEnd: true,

      event: {
        select: {
          id: true,
          name: true,
          eventType: true,
          eventDate: true,
          location: true,

          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
        },
      },

      vendor: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          verificationStatus: true,
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
      status: true,
    },
  },

  reviewedBy: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  },
} satisfies Prisma.PaymentSelect;

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

const adminComplaintReportSelect = {
  id: true,
  type: true,
  subject: true,
  description: true,
  status: true,
  priority: true,
  resolutionSummary: true,
  resolvedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,

  complainant: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  },

  respondent: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  },

  assignedAdmin: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  },

  booking: {
    select: {
      id: true,
      status: true,
      serviceStart: true,
      serviceEnd: true,

      event: {
        select: {
          id: true,
          name: true,
          eventType: true,
          eventDate: true,
          location: true,
        },
      },

      vendor: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          verificationStatus: true,
        },
      },
    },
  },

  payment: {
    select: {
      id: true,
      amount: true,
      status: true,
      method: true,
      referenceNumber: true,
    },
  },

  review: {
    select: {
      id: true,
      overallRating: true,
      isHidden: true,
      createdAt: true,
    },
  },

  quotationRequest: {
    select: {
      id: true,
      status: true,
      createdAt: true,

      event: {
        select: {
          id: true,
          name: true,
          eventType: true,
          eventDate: true,
          location: true,
        },
      },

      vendor: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          verificationStatus: true,
        },
      },
    },
  },

  _count: {
    select: {
      messages: true,
      actions: true,
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

const buildAdminEventReportWhere = (query: GetAdminEventReportQuery): Prisma.EventWhereInput => {
  const toDate = query.to && isDateOnlyMidnight(query.to) ? addOneDay(query.to) : query.to;

  return {
    ...(query.status && {
      status: query.status,
    }),

    ...(query.ownerId && {
      ownerId: query.ownerId,
    }),

    ...(query.eventType && {
      eventType: {
        contains: query.eventType,
        mode: 'insensitive',
      },
    }),

    ...(query.location && {
      location: {
        contains: query.location,
        mode: 'insensitive',
      },
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

const formatAdminEventReportBucket = (date: Date, groupBy: GetAdminEventReportQuery['groupBy']) => {
  const isoDate = date.toISOString();

  if (groupBy === 'month') {
    return isoDate.slice(0, 7);
  }

  return isoDate.slice(0, 10);
};

const groupAdminEventGrowth = (
  events: Array<{
    createdAt: Date;
  }>,
  groupBy: GetAdminEventReportQuery['groupBy'],
) => {
  const buckets = new Map<string, number>();

  events.forEach((event) => {
    const bucket = formatAdminEventReportBucket(event.createdAt, groupBy);

    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  });

  return Array.from(buckets.entries())
    .map(([period, count]) => ({
      period,
      count,
    }))
    .sort((first, second) => first.period.localeCompare(second.period));
};

const formatAdminEventReportEvent = <
  T extends {
    plannedBudget: Prisma.Decimal | null;
  },
>(
  event: T,
) => ({
  ...event,
  plannedBudget: event.plannedBudget?.toString() ?? null,
});

const buildAdminVendorReportWhere = (
  query: GetAdminVendorReportQuery,
): Prisma.VendorProfileWhereInput => {
  const toDate = query.to && isDateOnlyMidnight(query.to) ? addOneDay(query.to) : query.to;

  return {
    ...(query.verificationStatus && {
      verificationStatus: query.verificationStatus,
    }),

    ...(query.accountStatus && {
      user: {
        status: query.accountStatus,
      },
    }),

    ...(query.categoryId && {
      categories: {
        some: {
          categoryId: query.categoryId,
        },
      },
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

const formatAdminVendorReportBucket = (
  date: Date,
  groupBy: GetAdminVendorReportQuery['groupBy'],
) => {
  const isoDate = date.toISOString();

  if (groupBy === 'month') {
    return isoDate.slice(0, 7);
  }

  return isoDate.slice(0, 10);
};

const groupAdminVendorGrowth = (
  vendors: Array<{
    createdAt: Date;
  }>,
  groupBy: GetAdminVendorReportQuery['groupBy'],
) => {
  const buckets = new Map<string, number>();

  vendors.forEach((vendor) => {
    const bucket = formatAdminVendorReportBucket(vendor.createdAt, groupBy);

    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  });

  return Array.from(buckets.entries())
    .map(([period, count]) => ({
      period,
      count,
    }))
    .sort((first, second) => first.period.localeCompare(second.period));
};

const formatAdminVendorReportVendor = <
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

const buildAdminBookingReportWhere = (
  query: GetAdminBookingReportQuery,
): Prisma.BookingWhereInput => {
  const toDate = query.to && isDateOnlyMidnight(query.to) ? addOneDay(query.to) : query.to;

  return {
    ...(query.status && {
      status: query.status,
    }),

    ...(query.vendorId && {
      vendorId: query.vendorId,
    }),

    ...(query.customerId && {
      event: {
        ownerId: query.customerId,
      },
    }),

    ...(query.eventId && {
      eventId: query.eventId,
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

const formatAdminBookingReportBucket = (
  date: Date,
  groupBy: GetAdminBookingReportQuery['groupBy'],
) => {
  const isoDate = date.toISOString();

  if (groupBy === 'month') {
    return isoDate.slice(0, 7);
  }

  return isoDate.slice(0, 10);
};

const groupAdminBookingGrowth = (
  bookings: Array<{
    createdAt: Date;
  }>,
  groupBy: GetAdminBookingReportQuery['groupBy'],
) => {
  const buckets = new Map<string, number>();

  bookings.forEach((booking) => {
    const bucket = formatAdminBookingReportBucket(booking.createdAt, groupBy);

    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  });

  return Array.from(buckets.entries())
    .map(([period, count]) => ({
      period,
      count,
    }))
    .sort((first, second) => first.period.localeCompare(second.period));
};

const formatAdminBookingReportBooking = <
  T extends {
    agreedCost: Prisma.Decimal;
  },
>(
  booking: T,
) => ({
  ...booking,
  agreedCost: booking.agreedCost.toString(),
});

const buildAdminPaymentReportWhere = (
  query: GetAdminPaymentReportQuery,
): Prisma.PaymentWhereInput => {
  const toDate = query.to && isDateOnlyMidnight(query.to) ? addOneDay(query.to) : query.to;

  return {
    ...(query.status && {
      status: query.status,
    }),

    ...(query.method && {
      method: query.method,
    }),

    ...(query.vendorId && {
      booking: {
        vendorId: query.vendorId,
      },
    }),

    ...(query.customerId && {
      submittedById: query.customerId,
    }),

    ...(query.bookingId && {
      bookingId: query.bookingId,
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

const formatAdminPaymentReportBucket = (
  date: Date,
  groupBy: GetAdminPaymentReportQuery['groupBy'],
) => {
  const isoDate = date.toISOString();

  if (groupBy === 'month') {
    return isoDate.slice(0, 7);
  }

  return isoDate.slice(0, 10);
};

const groupAdminPaymentGrowth = (
  payments: Array<{
    createdAt: Date;
  }>,
  groupBy: GetAdminPaymentReportQuery['groupBy'],
) => {
  const buckets = new Map<string, number>();

  payments.forEach((payment) => {
    const bucket = formatAdminPaymentReportBucket(payment.createdAt, groupBy);

    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  });

  return Array.from(buckets.entries())
    .map(([period, count]) => ({
      period,
      count,
    }))
    .sort((first, second) => first.period.localeCompare(second.period));
};

const formatAdminPaymentReportPayment = <
  T extends {
    amount: Prisma.Decimal;
    booking: {
      agreedCost: Prisma.Decimal;
    };
  },
>(
  payment: T,
) => ({
  ...payment,
  amount: payment.amount.toString(),

  booking: {
    ...payment.booking,
    agreedCost: payment.booking.agreedCost.toString(),
  },
});

const buildAdminComplaintReportWhere = (
  query: GetAdminComplaintReportQuery,
): Prisma.ComplaintWhereInput => {
  const toDate = query.to && isDateOnlyMidnight(query.to) ? addOneDay(query.to) : query.to;

  return {
    ...(query.status && {
      status: query.status,
    }),

    ...(query.type && {
      type: query.type,
    }),

    ...(query.priority && {
      priority: query.priority,
    }),

    ...(query.complainantId && {
      complainantId: query.complainantId,
    }),

    ...(query.respondentId && {
      respondentId: query.respondentId,
    }),

    ...(query.assignedAdminId
      ? {
          assignedAdminId: query.assignedAdminId,
        }
      : query.assignment === 'assigned'
        ? {
            assignedAdminId: {
              not: null,
            },
          }
        : query.assignment === 'unassigned'
          ? {
              assignedAdminId: null,
            }
          : {}),

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

const formatAdminComplaintReportBucket = (
  date: Date,
  groupBy: GetAdminComplaintReportQuery['groupBy'],
) => {
  const isoDate = date.toISOString();

  if (groupBy === 'month') {
    return isoDate.slice(0, 7);
  }

  return isoDate.slice(0, 10);
};

const groupAdminComplaintGrowth = (
  complaints: Array<{
    createdAt: Date;
  }>,
  groupBy: GetAdminComplaintReportQuery['groupBy'],
) => {
  const buckets = new Map<string, number>();

  complaints.forEach((complaint) => {
    const bucket = formatAdminComplaintReportBucket(complaint.createdAt, groupBy);

    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  });

  return Array.from(buckets.entries())
    .map(([period, count]) => ({
      period,
      count,
    }))
    .sort((first, second) => first.period.localeCompare(second.period));
};

const formatAdminComplaintReportComplaint = <
  T extends {
    payment: {
      amount: Prisma.Decimal;
    } | null;
  },
>(
  complaint: T,
) => ({
  ...complaint,

  payment: complaint.payment
    ? {
        ...complaint.payment,
        amount: complaint.payment.amount.toString(),
      }
    : null,
});

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

export const getAdminEventReport = async (query: GetAdminEventReportQuery) => {
  const where = buildAdminEventReportWhere(query);
  const generatedAt = new Date();

  const [
    totalMatchingEvents,
    draftEvents,
    planningEvents,
    activeEvents,
    completedEvents,
    cancelledEvents,
    totalPlannedBudgetAggregate,
    averageGuestCountAggregate,
    totalGuestCountAggregate,
    growthEvents,
    recentEvents,
    topEventTypes,
    topLocations,
    topCustomers,
  ] = await prisma.$transaction([
    prisma.event.count({
      where,
    }),

    prisma.event.count({
      where: {
        ...where,
        status: EventStatus.DRAFT,
      },
    }),

    prisma.event.count({
      where: {
        ...where,
        status: EventStatus.PLANNING,
      },
    }),

    prisma.event.count({
      where: {
        ...where,
        status: EventStatus.ACTIVE,
      },
    }),

    prisma.event.count({
      where: {
        ...where,
        status: EventStatus.COMPLETED,
      },
    }),

    prisma.event.count({
      where: {
        ...where,
        status: EventStatus.CANCELLED,
      },
    }),

    prisma.event.aggregate({
      where,
      _sum: {
        plannedBudget: true,
      },
    }),

    prisma.event.aggregate({
      where,
      _avg: {
        guestCount: true,
      },
    }),

    prisma.event.aggregate({
      where,
      _sum: {
        guestCount: true,
      },
    }),

    prisma.event.findMany({
      where,
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),

    prisma.event.findMany({
      where,
      select: adminEventReportSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.recentLimit,
    }),

    prisma.event.groupBy({
      by: ['eventType'],
      where,
      _count: {
        eventType: true,
      },
      orderBy: {
        _count: {
          eventType: 'desc',
        },
      },
      take: 5,
    }),

    prisma.event.groupBy({
      by: ['location'],
      where,
      _count: {
        location: true,
      },
      orderBy: {
        _count: {
          location: 'desc',
        },
      },
      take: 5,
    }),

    prisma.event.groupBy({
      by: ['ownerId'],
      where,
      _count: {
        ownerId: true,
      },
      _sum: {
        plannedBudget: true,
        guestCount: true,
      },
      orderBy: {
        _count: {
          ownerId: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  const topCustomerIds = topCustomers.map((customer) => customer.ownerId);

  const customers = topCustomerIds.length
    ? await prisma.user.findMany({
        where: {
          id: {
            in: topCustomerIds,
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      })
    : [];

  const customersById = new Map(customers.map((customer) => [customer.id, customer]));

  return {
    generatedAt,

    filters: {
      from: query.from ?? null,
      to: query.to ?? null,
      status: query.status ?? null,
      ownerId: query.ownerId ?? null,
      eventType: query.eventType ?? null,
      location: query.location ?? null,
      groupBy: query.groupBy,
      recentLimit: query.recentLimit,
    },

    totals: {
      events: totalMatchingEvents,

      byStatus: {
        draft: draftEvents,
        planning: planningEvents,
        active: activeEvents,
        completed: completedEvents,
        cancelled: cancelledEvents,
      },
    },

    planning: {
      totalPlannedBudget: totalPlannedBudgetAggregate._sum.plannedBudget?.toString() ?? '0',
      totalGuestCount: totalGuestCountAggregate._sum.guestCount ?? 0,
      averageGuestCount: averageGuestCountAggregate._avg.guestCount ?? null,
    },

    growth: groupAdminEventGrowth(growthEvents, query.groupBy),

    topEventTypes: topEventTypes.map((eventType) => ({
      eventType: eventType.eventType,
      eventCount:
        typeof eventType._count === 'object' && eventType._count !== null
          ? (eventType._count.eventType ?? 0)
          : 0,
    })),

    topLocations: topLocations.map((location) => ({
      location: location.location,
      eventCount:
        typeof location._count === 'object' && location._count !== null
          ? (location._count.location ?? 0)
          : 0,
    })),

    topCustomers: topCustomers.map((customer) => ({
      customer: customersById.get(customer.ownerId) ?? null,
      eventCount:
        typeof customer._count === 'object' && customer._count !== null
          ? (customer._count.ownerId ?? 0)
          : 0,
      plannedBudget: customer._sum?.plannedBudget?.toString() ?? '0',
      guestCount: customer._sum?.guestCount ?? 0,
    })),

    recentEvents: recentEvents.map(formatAdminEventReportEvent),
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

export const getAdminVendorReport = async (query: GetAdminVendorReportQuery) => {
  const where = buildAdminVendorReportWhere(query);
  const generatedAt = new Date();

  const [
    totalMatchingVendors,
    draftVendors,
    pendingVendors,
    approvedVendors,
    rejectedVendors,
    activeAccountVendors,
    pendingVerificationAccountVendors,
    suspendedAccountVendors,
    deactivatedAccountVendors,
    growthVendors,
    recentVendors,
    topCategories,
  ] = await prisma.$transaction([
    prisma.vendorProfile.count({
      where,
    }),

    prisma.vendorProfile.count({
      where: {
        ...where,
        verificationStatus: VendorVerificationStatus.DRAFT,
      },
    }),

    prisma.vendorProfile.count({
      where: {
        ...where,
        verificationStatus: VendorVerificationStatus.PENDING,
      },
    }),

    prisma.vendorProfile.count({
      where: {
        ...where,
        verificationStatus: VendorVerificationStatus.APPROVED,
      },
    }),

    prisma.vendorProfile.count({
      where: {
        ...where,
        verificationStatus: VendorVerificationStatus.REJECTED,
      },
    }),

    prisma.vendorProfile.count({
      where: {
        ...where,
        user: {
          status: AccountStatus.ACTIVE,
        },
      },
    }),

    prisma.vendorProfile.count({
      where: {
        ...where,
        user: {
          status: AccountStatus.PENDING_VERIFICATION,
        },
      },
    }),

    prisma.vendorProfile.count({
      where: {
        ...where,
        user: {
          status: AccountStatus.SUSPENDED,
        },
      },
    }),

    prisma.vendorProfile.count({
      where: {
        ...where,
        user: {
          status: AccountStatus.DEACTIVATED,
        },
      },
    }),

    prisma.vendorProfile.findMany({
      where,
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),

    prisma.vendorProfile.findMany({
      where,
      select: adminVendorReportSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.recentLimit,
    }),

    prisma.vendorCategory.groupBy({
      by: ['categoryId'],
      where: {
        vendor: where,
      },
      _count: {
        categoryId: true,
      },
      orderBy: {
        _count: {
          categoryId: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  const categoryIds = topCategories.map((category) => category.categoryId);

  const categories = categoryIds.length
    ? await prisma.serviceCategory.findMany({
        where: {
          id: {
            in: categoryIds,
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      })
    : [];

  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  return {
    generatedAt,

    filters: {
      from: query.from ?? null,
      to: query.to ?? null,
      verificationStatus: query.verificationStatus ?? null,
      accountStatus: query.accountStatus ?? null,
      categoryId: query.categoryId ?? null,
      groupBy: query.groupBy,
      recentLimit: query.recentLimit,
    },

    totals: {
      vendors: totalMatchingVendors,

      byVerificationStatus: {
        draft: draftVendors,
        pending: pendingVendors,
        approved: approvedVendors,
        rejected: rejectedVendors,
      },

      byAccountStatus: {
        active: activeAccountVendors,
        pendingVerification: pendingVerificationAccountVendors,
        suspended: suspendedAccountVendors,
        deactivated: deactivatedAccountVendors,
      },
    },

    growth: groupAdminVendorGrowth(growthVendors, query.groupBy),

    topCategories: topCategories.map((category) => ({
      category: categoriesById.get(category.categoryId) ?? null,
      vendorCount:
        typeof category._count === 'object' && category._count !== null
          ? (category._count.categoryId ?? 0)
          : 0,
    })),

    recentVendors: recentVendors.map(formatAdminVendorReportVendor),
  };
};

export const getAdminBookingReport = async (query: GetAdminBookingReportQuery) => {
  const where = buildAdminBookingReportWhere(query);
  const generatedAt = new Date();

  const [
    totalMatchingBookings,
    awaitingVendorConfirmationBookings,
    confirmedBookings,
    depositPendingBookings,
    activeBookings,
    completedBookings,
    cancelledBookings,
    rejectedBookings,
    disputedBookings,
    totalAgreedCostAggregate,
    completedAgreedCostAggregate,
    verifiedPaymentAmountAggregate,
    growthBookings,
    recentBookings,
    topVendors,
  ] = await prisma.$transaction([
    prisma.booking.count({
      where,
    }),

    prisma.booking.count({
      where: {
        ...where,
        status: BookingStatus.AWAITING_VENDOR_CONFIRMATION,
      },
    }),

    prisma.booking.count({
      where: {
        ...where,
        status: BookingStatus.CONFIRMED,
      },
    }),

    prisma.booking.count({
      where: {
        ...where,
        status: BookingStatus.DEPOSIT_PENDING,
      },
    }),

    prisma.booking.count({
      where: {
        ...where,
        status: BookingStatus.ACTIVE,
      },
    }),

    prisma.booking.count({
      where: {
        ...where,
        status: BookingStatus.COMPLETED,
      },
    }),

    prisma.booking.count({
      where: {
        ...where,
        status: BookingStatus.CANCELLED,
      },
    }),

    prisma.booking.count({
      where: {
        ...where,
        status: BookingStatus.REJECTED,
      },
    }),

    prisma.booking.count({
      where: {
        ...where,
        status: BookingStatus.DISPUTED,
      },
    }),

    prisma.booking.aggregate({
      where,
      _sum: {
        agreedCost: true,
      },
    }),

    prisma.booking.aggregate({
      where: {
        ...where,
        status: BookingStatus.COMPLETED,
      },
      _sum: {
        agreedCost: true,
      },
    }),

    prisma.payment.aggregate({
      where: {
        status: PaymentStatus.VERIFIED,

        booking: where,
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.booking.findMany({
      where,
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),

    prisma.booking.findMany({
      where,
      select: adminBookingReportSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.recentLimit,
    }),

    prisma.booking.groupBy({
      by: ['vendorId'],
      where,
      _count: {
        vendorId: true,
      },
      _sum: {
        agreedCost: true,
      },
      orderBy: {
        _count: {
          vendorId: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  const vendorIds = topVendors.map((vendor) => vendor.vendorId);

  const vendors = vendorIds.length
    ? await prisma.vendorProfile.findMany({
        where: {
          id: {
            in: vendorIds,
          },
        },
        select: {
          id: true,
          businessName: true,
          slug: true,
          verificationStatus: true,
        },
      })
    : [];

  const vendorsById = new Map(vendors.map((vendor) => [vendor.id, vendor]));

  return {
    generatedAt,

    filters: {
      from: query.from ?? null,
      to: query.to ?? null,
      status: query.status ?? null,
      vendorId: query.vendorId ?? null,
      customerId: query.customerId ?? null,
      eventId: query.eventId ?? null,
      groupBy: query.groupBy,
      recentLimit: query.recentLimit,
    },

    totals: {
      bookings: totalMatchingBookings,

      byStatus: {
        awaitingVendorConfirmation: awaitingVendorConfirmationBookings,
        confirmed: confirmedBookings,
        depositPending: depositPendingBookings,
        active: activeBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        rejected: rejectedBookings,
        disputed: disputedBookings,
      },
    },

    financials: {
      totalAgreedCost: totalAgreedCostAggregate._sum.agreedCost?.toString() ?? '0',
      completedAgreedCost: completedAgreedCostAggregate._sum.agreedCost?.toString() ?? '0',
      verifiedPaymentAmount: verifiedPaymentAmountAggregate._sum.amount?.toString() ?? '0',
    },

    growth: groupAdminBookingGrowth(growthBookings, query.groupBy),

    topVendors: topVendors.map((vendor) => ({
      vendor: vendorsById.get(vendor.vendorId) ?? null,
      bookingCount:
        typeof vendor._count === 'object' && vendor._count !== null
          ? (vendor._count.vendorId ?? 0)
          : 0,
      agreedCost: vendor._sum?.agreedCost?.toString() ?? '0',
    })),

    recentBookings: recentBookings.map(formatAdminBookingReportBooking),
  };
};

export const getAdminPaymentReport = async (query: GetAdminPaymentReportQuery) => {
  const where = buildAdminPaymentReportWhere(query);
  const generatedAt = new Date();

  const [
    totalMatchingPayments,
    pendingPayments,
    verifiedPayments,
    rejectedPayments,
    cancelledPayments,
    refundedPayments,
    partiallyRefundedPayments,
    bankTransferPayments,
    totalAmountAggregate,
    pendingAmountAggregate,
    verifiedAmountAggregate,
    rejectedAmountAggregate,
    refundedAmountAggregate,
    growthPayments,
    recentPayments,
    topVendors,
    topCustomers,
  ] = await prisma.$transaction([
    prisma.payment.count({
      where,
    }),

    prisma.payment.count({
      where: {
        ...where,
        status: PaymentStatus.PENDING,
      },
    }),

    prisma.payment.count({
      where: {
        ...where,
        status: PaymentStatus.VERIFIED,
      },
    }),

    prisma.payment.count({
      where: {
        ...where,
        status: PaymentStatus.REJECTED,
      },
    }),

    prisma.payment.count({
      where: {
        ...where,
        status: PaymentStatus.CANCELLED,
      },
    }),

    prisma.payment.count({
      where: {
        ...where,
        status: PaymentStatus.REFUNDED,
      },
    }),

    prisma.payment.count({
      where: {
        ...where,
        status: PaymentStatus.PARTIALLY_REFUNDED,
      },
    }),

    prisma.payment.count({
      where: {
        ...where,
        method: PaymentMethod.BANK_TRANSFER,
      },
    }),

    prisma.payment.aggregate({
      where,
      _sum: {
        amount: true,
      },
    }),

    prisma.payment.aggregate({
      where: {
        ...where,
        status: PaymentStatus.PENDING,
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.payment.aggregate({
      where: {
        ...where,
        status: PaymentStatus.VERIFIED,
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.payment.aggregate({
      where: {
        ...where,
        status: PaymentStatus.REJECTED,
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.payment.aggregate({
      where: {
        ...where,
        status: {
          in: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED],
        },
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.payment.findMany({
      where,
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),

    prisma.payment.findMany({
      where,
      select: adminPaymentReportSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.recentLimit,
    }),

    prisma.payment.groupBy({
      by: ['bookingId'],
      where: {
        ...where,
        status: PaymentStatus.VERIFIED,
      },
      _count: {
        bookingId: true,
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: 10,
    }),

    prisma.payment.groupBy({
      by: ['submittedById'],
      where,
      _count: {
        submittedById: true,
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  const topVendorBookingIds = topVendors.map((vendor) => vendor.bookingId);

  const topVendorBookings = topVendorBookingIds.length
    ? await prisma.booking.findMany({
        where: {
          id: {
            in: topVendorBookingIds,
          },
        },
        select: {
          id: true,

          vendor: {
            select: {
              id: true,
              businessName: true,
              slug: true,
              verificationStatus: true,
            },
          },
        },
      })
    : [];

  const topVendorBookingsById = new Map(
    topVendorBookings.map((booking) => [booking.id, booking.vendor]),
  );

  const topCustomerIds = topCustomers.map((customer) => customer.submittedById);

  const customers = topCustomerIds.length
    ? await prisma.user.findMany({
        where: {
          id: {
            in: topCustomerIds,
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      })
    : [];

  const customersById = new Map(customers.map((customer) => [customer.id, customer]));

  return {
    generatedAt,

    filters: {
      from: query.from ?? null,
      to: query.to ?? null,
      status: query.status ?? null,
      method: query.method ?? null,
      vendorId: query.vendorId ?? null,
      customerId: query.customerId ?? null,
      bookingId: query.bookingId ?? null,
      groupBy: query.groupBy,
      recentLimit: query.recentLimit,
    },

    totals: {
      payments: totalMatchingPayments,

      byStatus: {
        pending: pendingPayments,
        verified: verifiedPayments,
        rejected: rejectedPayments,
        cancelled: cancelledPayments,
        refunded: refundedPayments,
        partiallyRefunded: partiallyRefundedPayments,
      },

      byMethod: {
        bankTransfer: bankTransferPayments,
      },
    },

    financials: {
      totalAmount: totalAmountAggregate._sum.amount?.toString() ?? '0',
      pendingAmount: pendingAmountAggregate._sum.amount?.toString() ?? '0',
      verifiedAmount: verifiedAmountAggregate._sum.amount?.toString() ?? '0',
      rejectedAmount: rejectedAmountAggregate._sum.amount?.toString() ?? '0',
      refundedAmount: refundedAmountAggregate._sum.amount?.toString() ?? '0',
    },

    growth: groupAdminPaymentGrowth(growthPayments, query.groupBy),

    topVendors: topVendors.map((vendor) => ({
      vendor: topVendorBookingsById.get(vendor.bookingId) ?? null,
      paymentCount:
        typeof vendor._count === 'object' && vendor._count !== null
          ? (vendor._count.bookingId ?? 0)
          : 0,
      verifiedAmount: vendor._sum?.amount?.toString() ?? '0',
    })),

    topCustomers: topCustomers.map((customer) => ({
      customer: customersById.get(customer.submittedById) ?? null,
      paymentCount:
        typeof customer._count === 'object' && customer._count !== null
          ? (customer._count.submittedById ?? 0)
          : 0,
      totalAmount: customer._sum?.amount?.toString() ?? '0',
    })),

    recentPayments: recentPayments.map(formatAdminPaymentReportPayment),
  };
};

export const getAdminComplaintReport = async (query: GetAdminComplaintReportQuery) => {
  const where = buildAdminComplaintReportWhere(query);
  const generatedAt = new Date();

  const [
    totalMatchingComplaints,
    openComplaints,
    underReviewComplaints,
    awaitingCustomerResponseComplaints,
    awaitingVendorResponseComplaints,
    underInvestigationComplaints,
    resolvedComplaints,
    dismissedComplaints,
    closedComplaints,
    assignedComplaints,
    unassignedComplaints,
    growthComplaints,
    recentComplaints,
    complaintsByType,
    complaintsByPriority,
    topComplainants,
    topRespondents,
  ] = await prisma.$transaction([
    prisma.complaint.count({
      where,
    }),

    prisma.complaint.count({
      where: {
        ...where,
        status: ComplaintStatus.OPEN,
      },
    }),

    prisma.complaint.count({
      where: {
        ...where,
        status: ComplaintStatus.UNDER_REVIEW,
      },
    }),

    prisma.complaint.count({
      where: {
        ...where,
        status: ComplaintStatus.AWAITING_CUSTOMER_RESPONSE,
      },
    }),

    prisma.complaint.count({
      where: {
        ...where,
        status: ComplaintStatus.AWAITING_VENDOR_RESPONSE,
      },
    }),

    prisma.complaint.count({
      where: {
        ...where,
        status: ComplaintStatus.UNDER_INVESTIGATION,
      },
    }),

    prisma.complaint.count({
      where: {
        ...where,
        status: ComplaintStatus.RESOLVED,
      },
    }),

    prisma.complaint.count({
      where: {
        ...where,
        status: ComplaintStatus.DISMISSED,
      },
    }),

    prisma.complaint.count({
      where: {
        ...where,
        status: ComplaintStatus.CLOSED,
      },
    }),

    prisma.complaint.count({
      where: {
        ...where,
        assignedAdminId: {
          not: null,
        },
      },
    }),

    prisma.complaint.count({
      where: {
        ...where,
        assignedAdminId: null,
      },
    }),

    prisma.complaint.findMany({
      where,
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),

    prisma.complaint.findMany({
      where,
      select: adminComplaintReportSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.recentLimit,
    }),

    prisma.complaint.groupBy({
      by: ['type'],
      where,
      _count: {
        type: true,
      },
      orderBy: {
        _count: {
          type: 'desc',
        },
      },
      take: 10,
    }),

    prisma.complaint.groupBy({
      by: ['priority'],
      where,
      _count: {
        priority: true,
      },
      orderBy: {
        _count: {
          priority: 'desc',
        },
      },
      take: 10,
    }),

    prisma.complaint.groupBy({
      by: ['complainantId'],
      where,
      _count: {
        complainantId: true,
      },
      orderBy: {
        _count: {
          complainantId: 'desc',
        },
      },
      take: 5,
    }),

    prisma.complaint.groupBy({
      by: ['respondentId'],
      where,
      _count: {
        respondentId: true,
      },
      orderBy: {
        _count: {
          respondentId: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  const complainantIds = topComplainants.map((complainant) => complainant.complainantId);
  const respondentIds = topRespondents
    .map((respondent) => respondent.respondentId)
    .filter((respondentId): respondentId is string => respondentId !== null);

  const [complainants, respondents] = await prisma.$transaction([
    complainantIds.length
      ? prisma.user.findMany({
          where: {
            id: {
              in: complainantIds,
            },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
          },
        })
      : prisma.user.findMany({
          where: {
            id: {
              in: [],
            },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
          },
        }),

    respondentIds.length
      ? prisma.user.findMany({
          where: {
            id: {
              in: respondentIds,
            },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
          },
        })
      : prisma.user.findMany({
          where: {
            id: {
              in: [],
            },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
          },
        }),
  ]);

  const complainantsById = new Map(
    complainants.map((complainant) => [complainant.id, complainant]),
  );
  const respondentsById = new Map(respondents.map((respondent) => [respondent.id, respondent]));

  return {
    generatedAt,

    filters: {
      from: query.from ?? null,
      to: query.to ?? null,
      status: query.status ?? null,
      type: query.type ?? null,
      priority: query.priority ?? null,
      complainantId: query.complainantId ?? null,
      respondentId: query.respondentId ?? null,
      assignedAdminId: query.assignedAdminId ?? null,
      assignment: query.assignment,
      groupBy: query.groupBy,
      recentLimit: query.recentLimit,
    },

    totals: {
      complaints: totalMatchingComplaints,

      byStatus: {
        open: openComplaints,
        underReview: underReviewComplaints,
        awaitingCustomerResponse: awaitingCustomerResponseComplaints,
        awaitingVendorResponse: awaitingVendorResponseComplaints,
        underInvestigation: underInvestigationComplaints,
        resolved: resolvedComplaints,
        dismissed: dismissedComplaints,
        closed: closedComplaints,
      },

      byAssignment: {
        assigned: assignedComplaints,
        unassigned: unassignedComplaints,
      },
    },

    growth: groupAdminComplaintGrowth(growthComplaints, query.groupBy),

    byType: complaintsByType.map((complaintType) => ({
      type: complaintType.type,
      complaintCount:
        typeof complaintType._count === 'object' && complaintType._count !== null
          ? (complaintType._count.type ?? 0)
          : 0,
    })),

    byPriority: complaintsByPriority.map((complaintPriority) => ({
      priority: complaintPriority.priority,
      complaintCount:
        typeof complaintPriority._count === 'object' && complaintPriority._count !== null
          ? (complaintPriority._count.priority ?? 0)
          : 0,
    })),

    topComplainants: topComplainants.map((complainant) => ({
      complainant: complainantsById.get(complainant.complainantId) ?? null,
      complaintCount:
        typeof complainant._count === 'object' && complainant._count !== null
          ? (complainant._count.complainantId ?? 0)
          : 0,
    })),

    topRespondents: topRespondents.map((respondent) => ({
      respondent: respondent.respondentId
        ? (respondentsById.get(respondent.respondentId) ?? null)
        : null,
      complaintCount:
        typeof respondent._count === 'object' && respondent._count !== null
          ? (respondent._count.respondentId ?? 0)
          : 0,
    })),

    recentComplaints: recentComplaints.map(formatAdminComplaintReportComplaint),
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
