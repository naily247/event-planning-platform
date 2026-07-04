import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/AppError.js';
import type { GetNotificationsQuery } from './notification.schemas.js';

const notificationSelect = {
  id: true,
  recipientId: true,
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
} as const;

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

export type CreateNotificationInput = {
  recipientId: string;
  type: Prisma.NotificationCreateInput['type'];
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export const createNotification = async (
  input: CreateNotificationInput,
  database: DatabaseClient = prisma,
) => {
  return database.notification.create({
    data: {
      recipient: {
        connect: {
          id: input.recipientId,
        },
      },
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      ...(input.metadata !== undefined && {
        metadata: input.metadata,
      }),
    },
    select: notificationSelect,
  });
};

export const getUserNotifications = async (recipientId: string, query: GetNotificationsQuery) => {
  const { page, limit, sort, status, type } = query;

  const where: Prisma.NotificationWhereInput = {
    recipientId,

    ...(status === 'read' && {
      isRead: true,
    }),

    ...(status === 'unread' && {
      isRead: false,
    }),

    ...(type && {
      type,
    }),
  };

  const skip = (page - 1) * limit;

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      select: notificationSelect,
      orderBy: {
        createdAt: sort === 'oldest' ? 'asc' : 'desc',
      },
      skip,
      take: limit,
    }),

    prisma.notification.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    notifications,
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

export const getUnreadNotificationCount = async (recipientId: string) => {
  return prisma.notification.count({
    where: {
      recipientId,
      isRead: false,
    },
  });
};

export const markNotificationAsRead = async (recipientId: string, notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      recipientId,
    },
    select: {
      id: true,
      isRead: true,
    },
  });

  if (!notification) {
    throw new AppError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  if (notification.isRead) {
    return prisma.notification.findUniqueOrThrow({
      where: {
        id: notificationId,
      },
      select: notificationSelect,
    });
  }

  return prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
    select: notificationSelect,
  });
};

export const markAllNotificationsAsRead = async (recipientId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      recipientId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    updatedCount: result.count,
  };
};
