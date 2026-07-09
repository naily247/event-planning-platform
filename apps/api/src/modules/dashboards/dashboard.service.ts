import {
  BookingStatus,
  EventStatus,
  EventTaskStatus,
  GuestStatus,
  PaymentStatus,
  Prisma,
  QuotationRequestStatus,
  QuotationStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import type { GetCustomerDashboardQuery, GetVendorDashboardQuery } from './dashboard.schemas.js';

const dashboardEventSelect = {
  id: true,
  name: true,
  eventType: true,
  eventDate: true,
  location: true,
  guestCount: true,
  plannedBudget: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EventSelect;

const dashboardBookingSelect = {
  id: true,
  agreedCost: true,
  serviceStart: true,
  serviceEnd: true,
  status: true,
  createdAt: true,
  updatedAt: true,

  event: {
    select: {
      id: true,
      name: true,
      eventType: true,
      eventDate: true,
      location: true,
      status: true,
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
} satisfies Prisma.BookingSelect;

const dashboardVendorBookingSelect = {
  id: true,
  agreedCost: true,
  serviceStart: true,
  serviceEnd: true,
  status: true,
  vendorResponseNote: true,
  vendorRespondedAt: true,
  vendorCompletedAt: true,
  createdAt: true,
  updatedAt: true,

  event: {
    select: {
      id: true,
      name: true,
      eventType: true,
      eventDate: true,
      location: true,
      status: true,

      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },

  acceptedQuotation: {
    select: {
      id: true,
      version: true,
      status: true,
      proposedPrice: true,
      depositAmount: true,
      createdAt: true,
    },
  },
} satisfies Prisma.BookingSelect;

const dashboardTaskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,

  event: {
    select: {
      id: true,
      name: true,
      eventDate: true,
      status: true,
    },
  },
} satisfies Prisma.EventTaskSelect;

const dashboardNotificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  readAt: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.NotificationSelect;

const dashboardVendorPackageSelect = {
  id: true,
  title: true,
  description: true,
  basePrice: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,

  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.ServicePackageSelect;

const dashboardVendorQuotationRequestSelect = {
  id: true,
  requirements: true,
  responseDueAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,

  event: {
    select: {
      id: true,
      name: true,
      eventType: true,
      eventDate: true,
      location: true,
      status: true,

      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },

  package: {
    select: {
      id: true,
      title: true,
      basePrice: true,
    },
  },

  quotations: {
    select: {
      id: true,
      version: true,
      status: true,
      proposedPrice: true,
      depositAmount: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: {
      version: 'desc',
    },
    take: 1,
  },
} satisfies Prisma.QuotationRequestSelect;

const countByValue = <T extends string>(
  values: readonly T[],
  rows: Array<{
    value: T;
    count: number;
  }>,
) => {
  const counts = Object.fromEntries(values.map((value) => [value, 0])) as Record<T, number>;

  rows.forEach((row) => {
    counts[row.value] = row.count;
  });

  return counts;
};

const getGroupCount = (count: unknown) => {
  if (typeof count === 'number') {
    return count;
  }

  if (count && typeof count === 'object' && '_all' in count && typeof count._all === 'number') {
    return count._all;
  }

  return 0;
};

const formatDashboardEvent = <
  T extends {
    plannedBudget: Prisma.Decimal | null;
  },
>(
  event: T,
) => ({
  ...event,
  plannedBudget: event.plannedBudget?.toString() ?? null,
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

const formatDashboardVendorBooking = <
  T extends {
    agreedCost: Prisma.Decimal;
    acceptedQuotation: {
      proposedPrice: Prisma.Decimal;
      depositAmount: Prisma.Decimal | null;
    };
  },
>(
  booking: T,
) => ({
  ...booking,
  agreedCost: booking.agreedCost.toString(),
  acceptedQuotation: {
    ...booking.acceptedQuotation,
    proposedPrice: booking.acceptedQuotation.proposedPrice.toString(),
    depositAmount: booking.acceptedQuotation.depositAmount?.toString() ?? null,
  },
});

const formatDashboardVendorPackage = <
  T extends {
    basePrice: Prisma.Decimal | null;
  },
>(
  servicePackage: T,
) => ({
  ...servicePackage,
  basePrice: servicePackage.basePrice?.toString() ?? null,
});

const formatDashboardVendorQuotationRequest = <
  T extends {
    package: {
      basePrice: Prisma.Decimal | null;
    } | null;
    quotations: Array<{
      proposedPrice: Prisma.Decimal;
      depositAmount: Prisma.Decimal | null;
    }>;
  },
>(
  quotationRequest: T,
) => ({
  ...quotationRequest,
  package: quotationRequest.package
    ? {
        ...quotationRequest.package,
        basePrice: quotationRequest.package.basePrice?.toString() ?? null,
      }
    : null,
  quotations: quotationRequest.quotations.map((quotation) => ({
    ...quotation,
    proposedPrice: quotation.proposedPrice.toString(),
    depositAmount: quotation.depositAmount?.toString() ?? null,
  })),
});

export const getCustomerDashboard = async (
  customerId: string,
  query: GetCustomerDashboardQuery,
) => {
  const now = new Date();

  const [
    totalEvents,
    eventStatusGroups,
    upcomingEvent,
    recentEvents,
    bookingStatusGroups,
    upcomingBookings,
    pendingPayments,
    unreadNotificationCount,
    recentNotifications,
    upcomingTasks,
    taskStatusGroups,
    guestStatusGroups,
    totalGuests,
  ] = await prisma.$transaction([
    prisma.event.count({
      where: {
        ownerId: customerId,
      },
    }),

    prisma.event.groupBy({
      by: ['status'],
      where: {
        ownerId: customerId,
      },
      _count: true,
      orderBy: {
        status: 'asc',
      },
    }),

    prisma.event.findFirst({
      where: {
        ownerId: customerId,
        eventDate: {
          gte: now,
        },
        status: {
          in: [EventStatus.PLANNING, EventStatus.ACTIVE],
        },
      },
      select: dashboardEventSelect,
      orderBy: {
        eventDate: 'asc',
      },
    }),

    prisma.event.findMany({
      where: {
        ownerId: customerId,
      },
      select: dashboardEventSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.recentLimit,
    }),

    prisma.booking.groupBy({
      by: ['status'],
      where: {
        event: {
          ownerId: customerId,
        },
      },
      _count: true,
      orderBy: {
        status: 'asc',
      },
    }),

    prisma.booking.findMany({
      where: {
        event: {
          ownerId: customerId,
        },
        serviceStart: {
          gte: now,
        },
        status: {
          in: [
            BookingStatus.AWAITING_VENDOR_CONFIRMATION,
            BookingStatus.CONFIRMED,
            BookingStatus.DEPOSIT_PENDING,
            BookingStatus.ACTIVE,
          ],
        },
      },
      select: dashboardBookingSelect,
      orderBy: {
        serviceStart: 'asc',
      },
      take: query.recentLimit,
    }),

    prisma.payment.count({
      where: {
        submittedById: customerId,
        status: PaymentStatus.PENDING,
      },
    }),

    prisma.notification.count({
      where: {
        recipientId: customerId,
        isRead: false,
      },
    }),

    prisma.notification.findMany({
      where: {
        recipientId: customerId,
      },
      select: dashboardNotificationSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.recentLimit,
    }),

    prisma.eventTask.findMany({
      where: {
        event: {
          ownerId: customerId,
        },
        status: {
          in: [EventTaskStatus.TODO, EventTaskStatus.IN_PROGRESS],
        },
      },
      select: dashboardTaskSelect,
      orderBy: [
        {
          dueDate: {
            sort: 'asc',
            nulls: 'last',
          },
        },
        {
          createdAt: 'desc',
        },
      ],
      take: query.recentLimit,
    }),

    prisma.eventTask.groupBy({
      by: ['status'],
      where: {
        event: {
          ownerId: customerId,
        },
      },
      _count: true,
      orderBy: {
        status: 'asc',
      },
    }),

    prisma.guest.groupBy({
      by: ['status'],
      where: {
        event: {
          ownerId: customerId,
        },
      },
      _count: true,
      orderBy: {
        status: 'asc',
      },
    }),

    prisma.guest.count({
      where: {
        event: {
          ownerId: customerId,
        },
      },
    }),
  ]);

  const eventCounts = countByValue(
    Object.values(EventStatus),
    eventStatusGroups.map((group) => ({
      value: group.status,
      count: getGroupCount(group._count),
    })),
  );

  const bookingCounts = countByValue(
    Object.values(BookingStatus),
    bookingStatusGroups.map((group) => ({
      value: group.status,
      count: getGroupCount(group._count),
    })),
  );

  const taskCounts = countByValue(
    Object.values(EventTaskStatus),
    taskStatusGroups.map((group) => ({
      value: group.status,
      count: getGroupCount(group._count),
    })),
  );

  const guestCounts = countByValue(
    Object.values(GuestStatus),
    guestStatusGroups.map((group) => ({
      value: group.status,
      count: getGroupCount(group._count),
    })),
  );

  return {
    generatedAt: now,

    filters: {
      recentLimit: query.recentLimit,
    },

    events: {
      total: totalEvents,
      byStatus: eventCounts,
      upcomingEvent: upcomingEvent ? formatDashboardEvent(upcomingEvent) : null,
      recent: recentEvents.map(formatDashboardEvent),
    },

    bookings: {
      total: Object.values(bookingCounts).reduce((sum, count) => sum + count, 0),
      byStatus: bookingCounts,
      upcoming: upcomingBookings.map(formatDashboardBooking),
    },

    payments: {
      pendingCount: pendingPayments,
    },

    notifications: {
      unreadCount: unreadNotificationCount,
      recent: recentNotifications,
    },

    tasks: {
      byStatus: taskCounts,
      upcoming: upcomingTasks,
    },

    guests: {
      total: totalGuests,
      byStatus: guestCounts,
    },
  };
};

export const getVendorDashboard = async (vendorUserId: string, query: GetVendorDashboardQuery) => {
  const now = new Date();

  const vendor = await prisma.vendorProfile.findUnique({
    where: {
      userId: vendorUserId,
    },
    select: {
      id: true,
      businessName: true,
      slug: true,
      verificationStatus: true,
      baseLocation: true,
      serviceAreas: true,
      submittedAt: true,
      reviewedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!vendor) {
    return null;
  }

  const [
    quotationRequestStatusGroups,
    recentQuotationRequests,
    quotationStatusGroups,
    bookingStatusGroups,
    upcomingBookings,
    recentBookings,
    totalPackages,
    activePackages,
    recentPackages,
    reviewSummary,
    recentReviews,
    pendingPayments,
    unreadNotificationCount,
    recentNotifications,
  ] = await prisma.$transaction([
    prisma.quotationRequest.groupBy({
      by: ['status'],
      where: {
        vendorId: vendor.id,
      },
      _count: true,
      orderBy: {
        status: 'asc',
      },
    }),

    prisma.quotationRequest.findMany({
      where: {
        vendorId: vendor.id,
      },
      select: dashboardVendorQuotationRequestSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.recentLimit,
    }),

    prisma.quotation.groupBy({
      by: ['status'],
      where: {
        quotationRequest: {
          vendorId: vendor.id,
        },
      },
      _count: true,
      orderBy: {
        status: 'asc',
      },
    }),

    prisma.booking.groupBy({
      by: ['status'],
      where: {
        vendorId: vendor.id,
      },
      _count: true,
      orderBy: {
        status: 'asc',
      },
    }),

    prisma.booking.findMany({
      where: {
        vendorId: vendor.id,
        serviceStart: {
          gte: now,
        },
        status: {
          in: [
            BookingStatus.AWAITING_VENDOR_CONFIRMATION,
            BookingStatus.CONFIRMED,
            BookingStatus.DEPOSIT_PENDING,
            BookingStatus.ACTIVE,
          ],
        },
      },
      select: dashboardVendorBookingSelect,
      orderBy: {
        serviceStart: 'asc',
      },
      take: query.recentLimit,
    }),

    prisma.booking.findMany({
      where: {
        vendorId: vendor.id,
      },
      select: dashboardVendorBookingSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.recentLimit,
    }),

    prisma.servicePackage.count({
      where: {
        vendorId: vendor.id,
      },
    }),

    prisma.servicePackage.count({
      where: {
        vendorId: vendor.id,
        isActive: true,
      },
    }),

    prisma.servicePackage.findMany({
      where: {
        vendorId: vendor.id,
      },
      select: dashboardVendorPackageSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.recentLimit,
    }),

    prisma.review.aggregate({
      where: {
        vendorId: vendor.id,
        isHidden: false,
      },
      _count: {
        id: true,
      },
      _avg: {
        overallRating: true,
        serviceRating: true,
        communicationRating: true,
      },
    }),

    prisma.review.findMany({
      where: {
        vendorId: vendor.id,
        isHidden: false,
      },
      select: {
        id: true,
        overallRating: true,
        serviceRating: true,
        communicationRating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,

        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },

        booking: {
          select: {
            id: true,

            event: {
              select: {
                id: true,
                name: true,
                eventType: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: query.recentLimit,
    }),

    prisma.payment.count({
      where: {
        status: PaymentStatus.PENDING,
        booking: {
          vendorId: vendor.id,
        },
      },
    }),

    prisma.notification.count({
      where: {
        recipientId: vendorUserId,
        isRead: false,
      },
    }),

    prisma.notification.findMany({
      where: {
        recipientId: vendorUserId,
      },
      select: dashboardNotificationSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.recentLimit,
    }),
  ]);

  const quotationRequestCounts = countByValue(
    Object.values(QuotationRequestStatus),
    quotationRequestStatusGroups.map((group) => ({
      value: group.status,
      count: getGroupCount(group._count),
    })),
  );

  const quotationCounts = countByValue(
    Object.values(QuotationStatus),
    quotationStatusGroups.map((group) => ({
      value: group.status,
      count: getGroupCount(group._count),
    })),
  );

  const bookingCounts = countByValue(
    Object.values(BookingStatus),
    bookingStatusGroups.map((group) => ({
      value: group.status,
      count: getGroupCount(group._count),
    })),
  );

  return {
    generatedAt: now,

    filters: {
      recentLimit: query.recentLimit,
    },

    vendor,

    quotationRequests: {
      total: Object.values(quotationRequestCounts).reduce((sum, count) => sum + count, 0),
      byStatus: quotationRequestCounts,
      recent: recentQuotationRequests.map(formatDashboardVendorQuotationRequest),
    },

    quotations: {
      total: Object.values(quotationCounts).reduce((sum, count) => sum + count, 0),
      byStatus: quotationCounts,
    },

    bookings: {
      total: Object.values(bookingCounts).reduce((sum, count) => sum + count, 0),
      byStatus: bookingCounts,
      upcoming: upcomingBookings.map(formatDashboardVendorBooking),
      recent: recentBookings.map(formatDashboardVendorBooking),
    },

    packages: {
      total: totalPackages,
      active: activePackages,
      inactive: totalPackages - activePackages,
      recent: recentPackages.map(formatDashboardVendorPackage),
    },

    reviews: {
      total: reviewSummary._count.id,
      averages: {
        overallRating: reviewSummary._avg.overallRating,
        serviceRating: reviewSummary._avg.serviceRating,
        communicationRating: reviewSummary._avg.communicationRating,
      },
      recent: recentReviews,
    },

    payments: {
      pendingCount: pendingPayments,
    },

    notifications: {
      unreadCount: unreadNotificationCount,
      recent: recentNotifications,
    },
  };
};
