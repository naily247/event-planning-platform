import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  getNotificationsHandler,
  getUnreadNotificationCountHandler,
  markAllNotificationsAsReadHandler,
  markNotificationAsReadHandler,
} from './notification.controller.js';
import {
  getNotificationsSchema,
  getUnreadNotificationCountSchema,
  markAllNotificationsAsReadSchema,
  markNotificationAsReadSchema,
} from './notification.schemas.js';

export const notificationRouter = Router();

notificationRouter.get('/', requireAuth, validate(getNotificationsSchema), getNotificationsHandler);

notificationRouter.get(
  '/unread-count',
  requireAuth,
  validate(getUnreadNotificationCountSchema),
  getUnreadNotificationCountHandler,
);

notificationRouter.patch(
  '/read-all',
  requireAuth,
  validate(markAllNotificationsAsReadSchema),
  markAllNotificationsAsReadHandler,
);

notificationRouter.patch(
  '/:notificationId/read',
  requireAuth,
  validate(markNotificationAsReadSchema),
  markNotificationAsReadHandler,
);
