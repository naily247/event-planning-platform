import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import {
  createGuestHandler,
  deleteGuestHandler,
  getEventGuestsHandler,
  getGuestByIdHandler,
  getGuestSummaryHandler,
  updateGuestHandler,
  updateGuestRsvpHandler,
} from './guest.controller.js';
import {
  createGuestRequestSchema,
  deleteGuestRequestSchema,
  getEventGuestsRequestSchema,
  getGuestByIdRequestSchema,
  getGuestSummaryRequestSchema,
  updateGuestRequestSchema,
  updateGuestRsvpRequestSchema,
} from './guest.schemas.js';

export const guestRouter = Router();

const customerOnly = [requireAuth, authorize(UserRole.CUSTOMER)] as const;

guestRouter.get(
  '/events/:eventId/summary',
  ...customerOnly,
  validate(getGuestSummaryRequestSchema),
  getGuestSummaryHandler,
);

guestRouter.post(
  '/events/:eventId',
  ...customerOnly,
  validate(createGuestRequestSchema),
  createGuestHandler,
);

guestRouter.get(
  '/events/:eventId',
  ...customerOnly,
  validate(getEventGuestsRequestSchema),
  getEventGuestsHandler,
);

guestRouter.get(
  '/events/:eventId/:guestId',
  ...customerOnly,
  validate(getGuestByIdRequestSchema),
  getGuestByIdHandler,
);

guestRouter.patch(
  '/events/:eventId/:guestId',
  ...customerOnly,
  validate(updateGuestRequestSchema),
  updateGuestHandler,
);

guestRouter.patch(
  '/events/:eventId/:guestId/rsvp',
  ...customerOnly,
  validate(updateGuestRsvpRequestSchema),
  updateGuestRsvpHandler,
);

guestRouter.delete(
  '/events/:eventId/:guestId',
  ...customerOnly,
  validate(deleteGuestRequestSchema),
  deleteGuestHandler,
);
