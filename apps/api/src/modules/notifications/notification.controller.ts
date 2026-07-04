import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import type { GetNotificationsQuery, NotificationParams } from './notification.schemas.js';
import {
  getUnreadNotificationCount,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './notification.service.js';

export const getNotificationsHandler: RequestHandler = asyncHandler(async (req, res) => {
  const result = await getUserNotifications(
    req.auth!.userId,
    req.query as unknown as GetNotificationsQuery,
  );

  res.status(200).json({
    success: true,
    data: result.notifications,
    meta: {
      pagination: result.pagination,
    },
  });
});

export const getUnreadNotificationCountHandler: RequestHandler = asyncHandler(async (req, res) => {
  const unreadCount = await getUnreadNotificationCount(req.auth!.userId);

  res.status(200).json({
    success: true,
    data: {
      unreadCount,
    },
  });
});

export const markNotificationAsReadHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { notificationId } = req.params as NotificationParams;

  const notification = await markNotificationAsRead(req.auth!.userId, notificationId);

  res.status(200).json({
    success: true,
    data: notification,
    message: 'Notification marked as read',
  });
});

export const markAllNotificationsAsReadHandler: RequestHandler = asyncHandler(async (req, res) => {
  const result = await markAllNotificationsAsRead(req.auth!.userId);

  res.status(200).json({
    success: true,
    data: result,
    message: 'All notifications marked as read',
  });
});
