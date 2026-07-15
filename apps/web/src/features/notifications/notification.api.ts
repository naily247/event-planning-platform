import { api } from '../../lib/api';

export const notificationTypes = [
  'BOOKING_CREATED',
  'BOOKING_CONFIRMED',
  'BOOKING_REJECTED',
  'BOOKING_CANCELLED',
  'BOOKING_COMPLETED',
  'QUOTATION_REQUEST_RECEIVED',
  'QUOTATION_SENT',
  'QUOTATION_ACCEPTED',
  'PAYMENT_SUBMITTED',
  'PAYMENT_VERIFIED',
  'PAYMENT_REJECTED',
  'VENDOR_APPROVED',
  'VENDOR_REJECTED',
  'COMPLAINT_CREATED',
  'COMPLAINT_MESSAGE_RECEIVED',
  'COMPLAINT_STATUS_CHANGED',
  'SYSTEM',
] as const;

export const notificationSortOptions = ['newest', 'oldest'] as const;

export const notificationReadStatusOptions = ['all', 'read', 'unread'] as const;

export type NotificationType = (typeof notificationTypes)[number];

export type NotificationSort = (typeof notificationSortOptions)[number];

export type NotificationReadStatus = (typeof notificationReadStatusOptions)[number];

export type NotificationMetadata =
  | string
  | number
  | boolean
  | null
  | NotificationMetadata[]
  | {
      [key: string]: NotificationMetadata;
    };

export type Notification = {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: NotificationMetadata | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type GetNotificationsParams = {
  page?: number;
  limit?: number;
  sort?: NotificationSort;
  status?: NotificationReadStatus;
  type?: NotificationType;
};

export type UnreadNotificationCount = {
  unreadCount: number;
};

export type MarkAllNotificationsAsReadResult = {
  updatedCount: number;
};

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

type NotificationListResponse = ApiSuccessResponse<Notification[]> & {
  meta: {
    pagination: NotificationPagination;
  };
};

export async function getNotifications(params: GetNotificationsParams = {}) {
  const response = await api.get<NotificationListResponse>('/notifications', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sort: params.sort ?? 'newest',
      status: params.status ?? 'all',

      ...(params.type && {
        type: params.type,
      }),
    },
  });

  return {
    notifications: response.data.data,
    pagination: response.data.meta.pagination,
  };
}

export async function getUnreadNotificationCount() {
  const response = await api.get<ApiSuccessResponse<UnreadNotificationCount>>(
    '/notifications/unread-count',
  );

  return response.data.data;
}

export async function markNotificationAsRead(notificationId: string) {
  const response = await api.patch<ApiSuccessResponse<Notification>>(
    `/notifications/${notificationId}/read`,
  );

  return response.data.data;
}

export async function markAllNotificationsAsRead() {
  const response =
    await api.patch<ApiSuccessResponse<MarkAllNotificationsAsReadResult>>(
      '/notifications/read-all',
    );

  return response.data.data;
}
