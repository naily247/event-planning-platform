import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createCustomerEventHandler,
  deleteCustomerEventHandler,
  getCustomerEventByIdHandler,
  getCustomerEventsHandler,
  updateCustomerEventHandler,
  updateCustomerEventStatusHandler,
} from './event.controller.js';
import {
  createEventSchema,
  deleteCustomerEventSchema,
  getCustomerEventSchema,
  getCustomerEventsSchema,
  updateCustomerEventSchema,
  updateCustomerEventStatusSchema,
} from './event.schemas.js';

export const eventRouter = Router();

const customerOnly = [requireAuth, authorize(UserRole.CUSTOMER)] as const;

eventRouter.get('/', ...customerOnly, validate(getCustomerEventsSchema), getCustomerEventsHandler);

eventRouter.post('/', ...customerOnly, validate(createEventSchema), createCustomerEventHandler);

eventRouter.patch(
  '/:eventId/status',
  ...customerOnly,
  validate(updateCustomerEventStatusSchema),
  updateCustomerEventStatusHandler,
);

eventRouter.get(
  '/:eventId',
  ...customerOnly,
  validate(getCustomerEventSchema),
  getCustomerEventByIdHandler,
);

eventRouter.patch(
  '/:eventId',
  ...customerOnly,
  validate(updateCustomerEventSchema),
  updateCustomerEventHandler,
);

eventRouter.delete(
  '/:eventId',
  ...customerOnly,
  validate(deleteCustomerEventSchema),
  deleteCustomerEventHandler,
);
