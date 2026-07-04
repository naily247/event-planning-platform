import { NotificationType } from '@prisma/client';
import { z } from 'zod';

const notificationIdSchema = z.string().cuid('Notification ID must be valid');

export const notificationSortOptions = ['newest', 'oldest'] as const;

export const notificationReadStatusOptions = ['all', 'read', 'unread'] as const;

export const getNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(50).default(20),

    sort: z.enum(notificationSortOptions).default('newest'),

    status: z.enum(notificationReadStatusOptions).default('all'),

    type: z.nativeEnum(NotificationType).optional(),
  }),
});

export const markNotificationAsReadSchema = z.object({
  params: z.object({
    notificationId: notificationIdSchema,
  }),
});

export const markAllNotificationsAsReadSchema = z.object({});

export const getUnreadNotificationCountSchema = z.object({});

export type GetNotificationsQuery = z.infer<typeof getNotificationsSchema>['query'];

export type NotificationParams = z.infer<typeof markNotificationAsReadSchema>['params'];
