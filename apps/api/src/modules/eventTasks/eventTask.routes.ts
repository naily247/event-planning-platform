import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createEventTaskHandler,
  deleteEventTaskHandler,
  getEventTaskByIdHandler,
  getEventTasksHandler,
  getEventTaskSummaryHandler,
  updateEventTaskHandler,
  updateEventTaskStatusHandler,
} from './eventTask.controller.js';
import {
  createEventTaskRequestSchema,
  deleteEventTaskRequestSchema,
  getEventTaskByIdRequestSchema,
  getEventTasksRequestSchema,
  getEventTaskSummaryRequestSchema,
  updateEventTaskRequestSchema,
  updateEventTaskStatusRequestSchema,
} from './eventTask.schemas.js';

export const eventTaskRouter = Router();

const customerOnly = [requireAuth, authorize(UserRole.CUSTOMER)] as const;

eventTaskRouter.get(
  '/events/:eventId/summary',
  ...customerOnly,
  validate(getEventTaskSummaryRequestSchema),
  getEventTaskSummaryHandler,
);

eventTaskRouter.post(
  '/events/:eventId/tasks',
  ...customerOnly,
  validate(createEventTaskRequestSchema),
  createEventTaskHandler,
);

eventTaskRouter.get(
  '/events/:eventId/tasks',
  ...customerOnly,
  validate(getEventTasksRequestSchema),
  getEventTasksHandler,
);

eventTaskRouter.get(
  '/events/:eventId/tasks/:taskId',
  ...customerOnly,
  validate(getEventTaskByIdRequestSchema),
  getEventTaskByIdHandler,
);

eventTaskRouter.patch(
  '/events/:eventId/tasks/:taskId',
  ...customerOnly,
  validate(updateEventTaskRequestSchema),
  updateEventTaskHandler,
);

eventTaskRouter.patch(
  '/events/:eventId/tasks/:taskId/status',
  ...customerOnly,
  validate(updateEventTaskStatusRequestSchema),
  updateEventTaskStatusHandler,
);

eventTaskRouter.delete(
  '/events/:eventId/tasks/:taskId',
  ...customerOnly,
  validate(deleteEventTaskRequestSchema),
  deleteEventTaskHandler,
);
