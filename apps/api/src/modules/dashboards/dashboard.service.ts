import {
  BookingStatus,
  EventStatus,
  EventTaskStatus,
  GuestStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import type { GetCustomerDashboardQuery } from './dashboard.schemas.js';

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
